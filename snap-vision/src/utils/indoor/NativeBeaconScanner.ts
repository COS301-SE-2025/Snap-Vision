// indoor/NativeBeaconScanner.ts (ANDROID 14/15 HARDENED)
import BleManager from 'react-native-ble-manager';
import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid } from 'react-native';
import type { BeaconScanner, IBeaconReading } from './BeaconScanner';
import { Buffer } from 'buffer';

const BleManagerModule = NativeModules.BleManager;
const bleEmitter = new NativeEventEmitter(BleManagerModule);
const TAG = '[BeaconScanner]';
const log = (...a: any[]) => console.log(TAG, ...a);
const err = (...a: any[]) => console.error(TAG, ...a);

function mdToBytes(md: any): number[] | null {
  try {
    if (!md) return null;
    if (Array.isArray(md.bytes)) return md.bytes as number[];
    const b64 = typeof md.data === 'string' ? md.data : typeof md === 'string' ? md : null;
    if (b64) return Array.from(Buffer.from(b64, 'base64').values());
  } catch (e) {
    err('mdToBytes error', e);
  }
  return null;
}

function parseIBeaconBytes(bytes: number[]): { uuid: string; major: number; minor: number } | null {
  if (!bytes || bytes.length < 25) return null;
  let idx = -1;
  for (let i = 0; i < bytes.length - 1; i++)
    if (bytes[i] === 0x02 && bytes[i + 1] === 0x15) {
      idx = i;
      break;
    }
  if (idx < 0) return null;
  const s = idx + 2;
  const h = (n: number) => n.toString(16).padStart(2, '0');
  const uu = bytes.slice(s, s + 16);
  const uuid =
    `${uu.slice(0, 4).map(h).join('')}-${uu.slice(4, 6).map(h).join('')}-${uu.slice(6, 8).map(h).join('')}-${uu.slice(8, 10).map(h).join('')}-${uu.slice(10, 16).map(h).join('')}`.toLowerCase();
  const major = (bytes[s + 16] << 8) | bytes[s + 17];
  const minor = (bytes[s + 18] << 8) | bytes[s + 19];
  return { uuid, major, minor };
}

export class NativeBeaconScanner implements BeaconScanner {
  private running = false;
  private subDiscover?: any;
  private subStop?: any;
  private flushTimer?: NodeJS.Timer;
  private rescanTimer?: NodeJS.Timer;
  private buffer: IBeaconReading[] = [];
  private seenCount = 0;

  isRunning() {
    return this.running;
  }

  private async ensurePerms() {
    if (Platform.OS !== 'android') return;
    const perms: string[] = [];
    // @ts-ignore
    if (Platform.Version >= 31) {
      perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    }
    // Some OEMs still gate scans on coarse too
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
    log('Requesting permissions:', perms);
    const res = await PermissionsAndroid.requestMultiple(perms);
    log('Permission results:', res);
  }

  private attachListeners(onBatch: (readings: IBeaconReading[]) => void) {
    // Discover (attach BEFORE scan())
    this.subDiscover = bleEmitter.addListener('BleManagerDiscoverPeripheral', (p: any) => {
      try {
        const adv = p.advertising || {};
        const md = adv.manufacturerData ?? adv.kCBAdvDataManufacturerData ?? null;
        const bytes = mdToBytes(md);
        if (!bytes) return;
        const parsed = parseIBeaconBytes(bytes);
        if (!parsed) return;

        const rssi = typeof p.rssi === 'number' ? p.rssi : NaN;
        if (!Number.isFinite(rssi) || rssi === 127) return;

        this.buffer.push({ ...parsed, rssi, ts: Date.now() });
        this.seenCount++;
        // log first few sightings for sanity
        if (this.seenCount <= 5) {
          log('✓ iBeacon', parsed.uuid, parsed.major, parsed.minor, 'RSSI', rssi);
        }
      } catch (e) {
        err('discover error', e);
      }
    });

    // Scan stopped (Android sometimes fires immediately on duration expiry)
    this.subStop = bleEmitter.addListener('BleManagerStopScan', () => {
      if (!this.running) return;
      log('BleManagerStopScan → scheduling restart');
      // restart in 300ms
      setTimeout(() => this.doScan().catch(err), 300);
    });

    // Batch flush
    this.flushTimer = setInterval(() => {
      if (!this.running) return;
      if (!this.buffer.length) return;
      const out = this.buffer;
      this.buffer = [];
      onBatch(out);
    }, 800);
  }

  private async doScan() {
    // Using a finite duration (e.g., 10s) improves reliability on some Android 14/15 builds
    const DURATION_SEC = 10;
    log('scan([],', DURATION_SEC, ', true)…');
    await BleManager.scan([], DURATION_SEC, true);
  }

  async start(onBatch: (readings: IBeaconReading[]) => void) {
    if (this.running) {
      log('start: already running');
      return;
    }
    this.running = true;
    this.seenCount = 0;
    this.buffer = [];
    log('Platform', Platform.OS, 'Version', Platform.Version);

    await this.ensurePerms();
    await BleManager.start({ showAlert: false }).catch(err);
    // Priming state helps some devices deliver events
    try {
      await BleManager.checkState();
    } catch {}

    this.attachListeners(onBatch);

    await this.doScan();

    // Safety: some devices ignore StopScan event; force a rescan loop
    this.rescanTimer = setInterval(() => {
      if (!this.running) return;
      this.doScan().catch(err);
    }, 12000); // restart every 12s
    log('start: initialized');
  }

  async stop() {
    if (!this.running) {
      log('stop: not running');
      return;
    }
    this.running = false;
    log('stop: stopping…');
    try {
      await BleManager.stopScan();
    } catch {}

    this.subDiscover?.remove?.();
    this.subDiscover = undefined;
    this.subStop?.remove?.();
    this.subStop = undefined;

    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = undefined;
    if (this.rescanTimer) clearInterval(this.rescanTimer);
    this.rescanTimer = undefined;

    const dropped = this.buffer.length;
    this.buffer = [];
    log('stop: done. dropped buffered=', dropped);
  }
}
