import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid } from 'react-native';
import type { IBeaconReading } from '../../hooks/useBluetoothPositioning';
import BleManager from 'react-native-ble-manager';
import { Buffer } from 'buffer';

const TAG = '[BeaconScanner]';
const log = (...a: any[]) => console.log(TAG, ...a);
const err = (...a: any[]) => console.error(TAG, ...a);

//Helpers
function toHex(bytes?: number[] | null, maxLen = 24): string {
  if (!bytes || !bytes.length) return '—';
  const slice = bytes.slice(0, maxLen);
  const hex = slice.map((b) => b.toString(16).padStart(2, '0')).join(' ');
  return bytes.length > maxLen ? `${hex}…` : hex;
}

// Convert various shapes from BleManager to raw byte array
function mdToBytes(md: any): number[] | null {
  try {
    if (!md) return null;
    if (Array.isArray(md.bytes)) return md.bytes as number[]; // Android shape
    const b64 = typeof md?.data === 'string' ? md.data : typeof md === 'string' ? md : null;
    if (b64) return Array.from(Buffer.from(b64, 'base64').values());
  } catch (e) {
    err('mdToBytes error:', e);
  }
  return null;
}

// Parse iBeacon from manufacturer bytes: 0x02 0x15 [UUID16][major2][minor2][tx1]
function parseIBeaconBytes(bytes: number[]) {
  if (!bytes || bytes.length < 25) return null;

  // Find the header
  let idx = -1;
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0x02 && bytes[i + 1] === 0x15) {
      idx = i;
      break;
    }
  }
  if (idx < 0) return null;

  const start = idx + 2;
  if (bytes.length < start + 21) return null;

  const uu = bytes.slice(start, start + 16);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  const uuid =
    `${uu.slice(0, 4).map(h).join('')}-${uu.slice(4, 6).map(h).join('')}-${uu.slice(6, 8).map(h).join('')}-${uu.slice(8, 10).map(h).join('')}-${uu.slice(10, 16).map(h).join('')}`.toLowerCase();

  const major = (bytes[start + 16] << 8) | bytes[start + 17];
  const minor = (bytes[start + 18] << 8) | bytes[start + 19];
  let mp = bytes[start + 20];
  if (mp > 127) mp -= 256;

  return { uuid, major, minor, measuredPower: mp };
}

// Parse Minew service-data as a fallback
function parseMinewServiceFrame(bytes: number[], serviceKey: string) {
  if (!bytes || bytes.length < 6) return null;
  const n = bytes.length;
  const major = (bytes[n - 6] << 8) | bytes[n - 5];
  const minor = (bytes[n - 4] << 8) | bytes[n - 3];
  let mp = bytes[n - 2];
  if (mp > 127) mp -= 256;
  const uuid = `minew-${serviceKey.toLowerCase()}`;
  return { uuid, major, minor, measuredPower: mp };
}

//Types
type StartOpts = {
  uuid?: string; // optional UUID filter (for Minew native path)
  allowed?: Array<{ uuid?: string; major: number; minor: number; txPowerAt1m?: number }>;
};

export class NativeBeaconScanner {
  private running = false;

  // Minew native path
  private isMinew = Platform.OS === 'android' && !!(NativeModules as any).MinewScanner;
  private minewEmitter?: NativeEventEmitter;
  private minewSub?: { remove: () => void };

  // BLE fallback path
  private bleEmitter = new NativeEventEmitter(NativeModules.BleManager);
  private subDiscover?: any;
  private subStop?: any;
  private subState?: any;
  private rescanTimer?: NodeJS.Timer;
  private probeTimer?: NodeJS.Timer;

  // Batching
  private flushTimer?: NodeJS.Timer;
  private buffer: IBeaconReading[] = [];

  // Whitelist for quick filtering
  private allowedKeys = new Set<string>();
  private allowedMM = new Set<string>(); // major|minor fast path

  isRunning() {
    return this.running;
  }

  // Permissions
  private async ensurePerms() {
    if (Platform.OS !== 'android') return true;
    const perms: any[] = [];
    // Android 12+
    // @ts-ignore
    if (Platform.Version >= 31) {
      perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    }
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);

    log('Requesting scanner-scoped permissions:', perms);
    const res = await PermissionsAndroid.requestMultiple(perms);
    const granted = Object.values(res).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
    log('Permission result:', granted ? 'ALL GRANTED' : 'SOME DENIED', res);
    return granted;
  }

  private key(u?: string, M?: number, m?: number) {
    return `${(u || '').toLowerCase()}|${M ?? ''}|${m ?? ''}`;
  }

  private push(rssi: number, uuid: string, major: number, minor: number, measuredPower?: number) {
    const reading: IBeaconReading = {
      uuid: (uuid || '').toLowerCase(),
      major: Number(major),
      minor: Number(minor),
      rssi: typeof rssi === 'number' ? Number(rssi) : -127,
      ts: Date.now(),
    };
    if (typeof measuredPower === 'number') (reading as any).measuredPower = measuredPower;
    this.buffer.push(reading);
  }

  //Minew stuff
  private attachMinew(onBatch: (r: IBeaconReading[]) => void, opts?: StartOpts) {
    const Minew = (NativeModules as any).MinewScanner;
    this.minewEmitter = new NativeEventEmitter(Minew);

    log('Minew attach: UUID filter =', opts?.uuid || 'none');
    this.minewSub = this.minewEmitter.addListener('onBeacon', (e: any) => {
      if (!e) return;
      // Minew native event shape: { uuid, major, minor, rssi, txPower?, timestamp, mac?, name? }
      const keyMM = `${e.major}|${e.minor}`;
      // fast accept if major/minor in whitelist
      if (this.allowedMM.size && !this.allowedMM.has(keyMM)) return;
      this.push(e.rssi, e.uuid, e.major, e.minor, e.txPower);
    });

    Minew.startScan(opts?.uuid ? { uuid: opts.uuid } : {})
      .then(() => log('Minew scan started - looking for all beacon formats'))
      .catch((e: any) => {
        err('Minew start error:', e);
        // If Minew fails at runtime, make sure it still falls back to BLE scan
        this.detachMinew();
        this.attachBle(onBatch);
      });
  }

  private detachMinew() {
    const Minew = (NativeModules as any).MinewScanner;
    try {
      Minew.stopScan?.();
    } catch {}
    this.minewSub?.remove?.();
    this.minewSub = undefined;
    this.minewEmitter = undefined;
    log('Minew scan stopped');
  }

  //BLE fallback
  private async attachBle(onBatch: (r: IBeaconReading[]) => void) {
    try {
      await BleManager.start({ showAlert: false });
    } catch {}
    try {
      // @ts-ignore
      if (BleManager.enableBluetooth) await BleManager.enableBluetooth();
    } catch {}

    this.subState = this.bleEmitter.addListener('BleManagerDidUpdateState', (s: any) => {
      log('BLE state updated:', s?.state);
      if (s?.state === 'on' && this.running) this.doBleScan().catch(() => {});
    });

    this.subDiscover = this.bleEmitter.addListener('BleManagerDiscoverPeripheral', (p: any) => {
      try {
        const rssi = p?.rssi ?? -127;
        const adv = p?.advertising || {};
        const name = p?.name || 'unnamed';
        log('DISCOVER:', { id: p?.id, name, rssi, hasAdv: !!adv });

        // 1) Manufacturer data -> iBeacon
        const md = adv.manufacturerData ?? adv.kCBAdvDataManufacturerData ?? null;
        const mdBytes = mdToBytes(md);
        if (mdBytes) {
          const ib = parseIBeaconBytes(mdBytes);
          if (ib) {
            const mm = `${ib.major}|${ib.minor}`;
            if (!this.allowedMM.size || this.allowedMM.has(mm)) {
              log('iBeacon via manufacturer:', {
                uuid: ib.uuid,
                major: ib.major,
                minor: ib.minor,
                rssi,
                mp: ib.measuredPower,
                raw: toHex(mdBytes),
              });
              this.push(rssi, ib.uuid, ib.major, ib.minor, ib.measuredPower);
              return;
            }
          } else {
            log('Manufacturer present but not iBeacon:', toHex(mdBytes));
          }
        }

        // 2) Service data -> Minew fallback (FEF3/C5E2)
        const sd = adv.serviceData;
        if (sd && typeof sd === 'object') {
          for (const key of Object.keys(sd)) {
            const b = mdToBytes(sd[key]);
            if (!b) continue;
            const m = parseMinewServiceFrame(b, key);
            if (!m) continue;
            const mm = `${m.major}|${m.minor}`;
            if (!this.allowedMM.size || this.allowedMM.has(mm)) {
              log('Minew via service:', {
                service: key,
                major: m.major,
                minor: m.minor,
                rssi,
                mp: m.measuredPower,
                raw: toHex(b),
              });
              this.push(rssi, m.uuid, m.major, m.minor, m.measuredPower);
              return;
            }
          }
        }

        // 3) Nothing usable found :(
        log('Not iBeacon/Minew:', { name, rssi, advKeys: Object.keys(adv || {}) });
      } catch (e) {
        err('Discover handler error:', e);
      }
    });

    this.subStop = this.bleEmitter.addListener('BleManagerStopScan', () => {
      if (this.running) setTimeout(() => this.doBleScan().catch(() => {}), 250);
    });

    // kick initial scan + keepalive scans
    await this.doBleScan().catch(() => {});
    this.rescanTimer = setInterval(() => {
      if (this.running) this.doBleScan().catch(() => {});
    }, 12000);

    // Probe discovered list periodically
    this.probeTimer = setInterval(async () => {
      if (!this.running) return;
      try {
        const list: any[] = await BleManager.getDiscoveredPeripherals();
        if (!Array.isArray(list) || !list.length) return;

        const polled: IBeaconReading[] = [];
        for (const p of list) {
          const rssi = p?.rssi ?? -127;
          const adv = p?.advertising || {};
          const md = adv.manufacturerData ?? adv.kCBAdvDataManufacturerData ?? null;
          const mdBytes = mdToBytes(md);
          if (mdBytes) {
            const ib = parseIBeaconBytes(mdBytes);
            if (ib) {
              const mm = `${ib.major}|${ib.minor}`;
              if (!this.allowedMM.size || this.allowedMM.has(mm)) {
                polled.push({
                  uuid: ib.uuid.toLowerCase(),
                  major: ib.major,
                  minor: ib.minor,
                  rssi,
                  ts: Date.now(),
                  measuredPower: ib.measuredPower,
                } as any);
                continue;
              }
            }
          }
          const sd = adv.serviceData;
          if (sd && typeof sd === 'object') {
            for (const key of Object.keys(sd)) {
              const b = mdToBytes(sd[key]);
              if (!b) continue;
              const m = parseMinewServiceFrame(b, key);
              if (m) {
                const mm = `${m.major}|${m.minor}`;
                if (!this.allowedMM.size || this.allowedMM.has(mm)) {
                  polled.push({
                    uuid: m.uuid.toLowerCase(),
                    major: m.major,
                    minor: m.minor,
                    rssi,
                    ts: Date.now(),
                    measuredPower: m.measuredPower,
                  } as any);
                  break;
                }
              }
            }
          }
        }
        if (polled.length) {
          log('Probe pushed', polled.length, 'readings');
          onBatch(polled);
        }
      } catch (e) {
        err('Probe error:', e);
      }
    }, 3000);
  }

  private detachBle() {
    try {
      BleManager.stopScan();
    } catch {}
    this.subDiscover?.remove?.();
    this.subStop?.remove?.();
    this.subState?.remove?.();
    this.subDiscover = this.subStop = this.subState = undefined;
    if (this.rescanTimer) clearInterval(this.rescanTimer);
    if (this.probeTimer) clearInterval(this.probeTimer);
    this.rescanTimer = this.probeTimer = undefined;
    log('BLE scan stopped');
  }

  private async doBleScan() {
    log('BLE scan start (10s, allow dupes)');
    try {
      await BleManager.scan([], 10, true);
      log('BLE scan running');
    } catch (e) {
      err('BLE scan start failed:', e);
    }
  }

  //Public API
  async start(onBatch?: (r: IBeaconReading[]) => void, opts?: StartOpts) {
    if (this.running) {
      log('Already running; stop first to restart');
      return;
    }
    this.running = true;

    // Build whitelists
    this.allowedKeys.clear();
    this.allowedMM.clear();
    if (opts?.allowed?.length) {
      for (const b of opts.allowed) {
        const k1 = this.key(b.uuid || '', b.major, b.minor);
        const k2 = this.key('any', b.major, b.minor);
        this.allowedKeys.add(k1);
        this.allowedKeys.add(k2);
        this.allowedMM.add(`${b.major}|${b.minor}`);
      }
      log('Loaded whitelist:', Array.from(this.allowedKeys));
    } else {
      log('No whitelist provided - using default Minew beacon config for minors 1, 2, 3');
      const minors = [1, 2, 3];
      for (const m of minors) {
        this.allowedMM.add(`1|${m}`);
      }
      log('Default MM whitelist:', Array.from(this.allowedMM));
    }

    const permsOk = await this.ensurePerms();
    if (!permsOk) err('Missing permissions; results may be empty');

    // Flush timer
    if (onBatch) {
      this.buffer = [];
      this.flushTimer = setInterval(() => {
        if (!this.running || !this.buffer.length) return;
        const out = this.buffer;
        this.buffer = [];
        log('Flushing', out.length, 'readings');
        try {
          onBatch(out);
        } catch (e) {
          err('onBatch error:', e);
        }
      }, 800);
    }

    // Always start BLE fallback (more reliable)
    await this.attachBle(onBatch || (() => {}));
    log('NATIVE: Starting scanner with UUID filter:', opts?.uuid || 'none');

    // Try Minew native side in parallel (probs won't work)
    if (this.isMinew) {
      this.attachMinew(onBatch || (() => {}), { uuid: opts?.uuid });
    }

    log('NATIVE: Scan successfully started');
  }

  async stop() {
    if (!this.running) return;
    this.running = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    this.buffer = [];
    if (this.isMinew) this.detachMinew();
    this.detachBle();
    log('Scanner stopped');
  }
}
