// utils/indoor/NativeBeaconScanner.ts
import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid } from 'react-native';
import type { BeaconScanner, IBeaconReading } from '../../types/BeaconScanner';
import BleManager from 'react-native-ble-manager';
import { Buffer } from 'buffer';

const TAG = '[BeaconScanner]';
const log = (...a: any[]) => console.log(TAG, ...a);
const err = (...a: any[]) => console.error(TAG, ...a);

// Helper to format hex for logging
function toHex(bytes: number[], maxLen = 20): string {
  if (!bytes) return 'null';
  const slice = bytes.slice(0, maxLen);
  const hex = slice.map(b => b.toString(16).padStart(2, '0')).join(' ');
  return bytes.length > maxLen ? `${hex}...` : hex;
}

// ---------- Helpers (used by fallback path) ----------
function mdToBytes(md: any): number[] | null {
  try {
    if (!md) return null;
    if (Array.isArray(md.bytes)) return md.bytes as number[];
    const b64 =
      typeof md?.data === 'string'
        ? md.data
        : typeof md === 'string'
        ? md
        : null;
    if (b64) return Array.from(Buffer.from(b64, 'base64').values());
  } catch (e) {
    err('mdToBytes error', e);
  }
  return null;
}

// iBeacon (manufacturer data): 0x02 0x15 [UUID16][major2][minor2][measuredPower1]
function parseIBeaconBytes(bytes: number[]) {
  if (!bytes || bytes.length < 25) {
    log('❌ iBeacon parse failed: insufficient length', bytes?.length || 0, 'bytes:', toHex(bytes, 10));
    return null;
  }
  
  let idx = -1;
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0x02 && bytes[i + 1] === 0x15) {
      idx = i;
      break;
    }
  }
  
  if (idx < 0) {
    log('❌ iBeacon parse failed: no 0x02 0x15 header found in:', toHex(bytes, 15));
    return null;
  }
  
  const start = idx + 2;
  if (bytes.length < start + 21) {
    log('❌ iBeacon parse failed: insufficient data after header. Need', start + 21, 'got', bytes.length);
    return null;
  }

  const uu = bytes.slice(start, start + 16);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  const uuid = `${uu.slice(0, 4).map(h).join('')}-${uu.slice(4, 6).map(h).join('')}-${uu
    .slice(6, 8)
    .map(h)
    .join('')}-${uu.slice(8, 10).map(h).join('')}-${uu.slice(10, 16).map(h).join('')}`.toLowerCase();
  const major = (bytes[start + 16] << 8) | bytes[start + 17];
  const minor = (bytes[start + 18] << 8) | bytes[start + 19];
  let mp = bytes[start + 20];
  if (mp > 127) mp -= 256;

  log('✅ iBeacon parsed successfully:', {
    uuid: uuid,
    major: major,
    minor: minor,
    measuredPower: mp,
    rawBytes: toHex(bytes, 30)
  });

  return { uuid, major, minor, measuredPower: mp };
}

// Minew service-data fallback (e.g., service UUIDs FEF3 / C5E2)
function parseMinewServiceFrame(bytes: number[], serviceKey: string) {
  if (!bytes || bytes.length < 6) {
    log('❌ Minew parse failed: insufficient length', bytes?.length || 0, 'for service', serviceKey);
    return null;
  }
  
  const n = bytes.length;
  const major = (bytes[n - 6] << 8) | bytes[n - 5];
  const minor = (bytes[n - 4] << 8) | bytes[n - 3];
  let mp = bytes[n - 2];
  if (mp > 127) mp -= 256;
  const uuid = `minew-${serviceKey.toLowerCase()}`;
  
  log('✅ Minew beacon parsed:', {
    uuid: uuid,
    major: major,
    minor: minor,
    measuredPower: mp,
    serviceKey: serviceKey,
    rawBytes: toHex(bytes)
  });
  
  return { uuid, major, minor, measuredPower: mp };
}

// ---------- Hybrid scanner ----------
type StartOpts = { uuid?: string }; // optional Minew UUID filter

export class NativeBeaconScanner implements BeaconScanner {
  private running = false;
  private scanCount = 0;
  private lastScanTime = 0;
  private scanStartTime = 0;

  // Minew path
  private isMinew = Platform.OS === 'android' && !!(NativeModules as any).MinewScanner;
  private minewEmitter?: NativeEventEmitter;
  private minewSub?: { remove: () => void };

  // Fallback BLE path
  private bleEmitter = new NativeEventEmitter(NativeModules.BleManager);
  private subDiscover?: any;
  private subStop?: any;
  private subState?: any;
  private rescanTimer?: NodeJS.Timer;
  private probeTimer?: NodeJS.Timer;

  // Batching (shared)
  private flushTimer?: NodeJS.Timer;
  private buffer: IBeaconReading[] = [];

  isRunning() {
    return this.running;
  }

  // --- Permissions (Android) ---
  private async ensurePerms() {
    if (Platform.OS !== 'android') {
      log('🔐 iOS platform - no permissions needed');
      return true;
    }
    const perms: any[] = [];
    // @ts-ignore
    if (Platform.Version >= 31) {
      perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
      perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
    }
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
    
    log('🔐 Requesting permissions:', perms);
    const res = await PermissionsAndroid.requestMultiple(perms);
    const granted = Object.values(res).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
    log('🔐 Permissions result:', granted ? '✅ ALL GRANTED' : '❌ SOME DENIED', res);
    
    return granted;
  }

  // --- Common ---
  private push(rssi: number, uuid: string, major: number, minor: number, measuredPower?: number) {
    const reading: IBeaconReading = {
      uuid: uuid.toLowerCase(),
      major: Number(major),
      minor: Number(minor),
      rssi: typeof rssi === 'number' ? Number(rssi) : -127,
      ts: Date.now(),
    } as IBeaconReading;
    if (typeof measuredPower === 'number') (reading as any).measuredPower = measuredPower;
    
    log('📡 Beacon reading added to buffer:', {
      uuid: reading.uuid,
      major: reading.major,
      minor: reading.minor,
      rssi: reading.rssi,
      measuredPower: measuredPower,
      bufferSize: this.buffer.length + 1
    });
    
    this.buffer.push(reading);
  }

  // --- Minew path ---
  private attachMinew(onBatch: (r: IBeaconReading[]) => void, opts?: StartOpts) {
    const Minew = (NativeModules as any).MinewScanner;
    this.minewEmitter = new NativeEventEmitter(Minew);

    log('🔵 Attaching Minew scanner with options:', opts);

    this.minewSub = this.minewEmitter.addListener('onBeacon', (e: any) => {
      if (!e) {
        log('⚠️ Minew beacon event received but data is null/undefined');
        return;
      }
      
      log('🔵 Minew beacon detected:', {
        uuid: e.uuid,
        major: e.major,
        minor: e.minor,
        rssi: e.rssi,
        txPower: e.txPower,
        timestamp: e.timestamp,
        rawEvent: e
      });
      
      // e = { uuid, major, minor, rssi, txPower?, timestamp }
      this.push(e.rssi, e.uuid, e.major, e.minor, e.txPower);
    });

    // Add diagnostic timer to check if Minew is working
    const minewDiagnosticTimer = setInterval(() => {
      if (!this.running) {
        clearInterval(minewDiagnosticTimer);
        return;
      }
      log('🔵 Minew diagnostic: Scanner running, buffer size:', this.buffer.length);
      
      // If no beacons found after 15 seconds, try BLE fallback
      if (Date.now() - this.scanStartTime > 15000 && this.buffer.length === 0) {
        log('⚠️ Minew scanner: No beacons detected in 15+ seconds');
        log('🔄 Auto-switching to BLE fallback...');
        clearInterval(minewDiagnosticTimer);
        this.detachMinew();
        this.attachBle(onBatch);
        return;
      }
      
      // If no beacons found after 30 seconds, warn user
      if (Date.now() - this.scanStartTime > 30000 && this.buffer.length === 0) {
        log('⚠️ Minew scanner: No beacons detected in 30+ seconds');
        log('💡 Suggestion: Check if beacons are powered on and in range');
      }
    }, 5000); // Check every 5 seconds

    // Store start time for diagnostics
    this.scanStartTime = Date.now();

    // kick scan
    const filterUuid = opts?.uuid?.toLowerCase?.();
    log('🔵 Starting Minew scan...');
    log('🔍 UUID filter:', filterUuid || 'NO FILTER (scanning all beacons)');
    
    // TEMPORARY: Remove UUID filter to detect ALL beacons for debugging
    const scanParams = filterUuid ? { uuid: filterUuid } : {};
    log('🔧 Scan params:', scanParams);
    
    Minew.startScan(scanParams).then(() => {
      log('✅ Minew scan started successfully');
    }).catch((e: any) => {
      err('❌ Minew start error', e);
      log('🔄 Minew failed, will attempt BLE fallback...');
      this.detachMinew();
      this.attachBle(onBatch);
    });
  }

  private detachMinew() {
    const Minew = (NativeModules as any).MinewScanner;
    log('🔵 Detaching Minew scanner...');
    try {
      Minew.stopScan?.();
      log('🔵 Minew scan stopped');
    } catch (e) {
      err('⚠️ Error stopping Minew scan:', e);
    }
    this.minewSub?.remove?.();
    this.minewSub = undefined;
    this.minewEmitter = undefined;
  }

  // --- Fallback BLE path ---
  private async attachBle(onBatch: (r: IBeaconReading[]) => void) {
    log('🔷 Attaching BLE scanner...');
    
    try {
      await BleManager.start({ showAlert: false });
      log('🔷 BleManager started');
      
      const state = await BleManager.checkState();
      log('🔷 BLE state:', state);
    } catch (e) {
      err('⚠️ BleManager start/checkState error:', e);
    }

    // Some Androids expose enableBluetooth
    // @ts-ignore
    if (BleManager.enableBluetooth) {
      try {
        await BleManager.enableBluetooth();
        log('🔷 Bluetooth enabled');
      } catch (e) {
        log('⚠️ Could not enable Bluetooth:', e);
      }
    }

    // BLE state changes
    this.subState = this.bleEmitter.addListener('BleManagerDidUpdateState', (s: any) => {
      log('🔷 BLE state changed:', s);
      if (s?.state === 'on' && this.running) {
        log('🔷 BLE is ON, starting scan...');
        this.doBleScan().catch(() => {});
      } else {
        log('🔷 BLE is OFF or scanner not running');
      }
    });

    // Discover event
    this.subDiscover = this.bleEmitter.addListener('BleManagerDiscoverPeripheral', (p: any) => {
      try {
        this.scanCount++;
        log(`🔷 [${this.scanCount}] BLE peripheral discovered:`, {
          id: p?.id,
          name: p?.name || 'unnamed',
          rssi: p?.rssi,
          hasAdvertising: !!p?.advertising,
          hasManufacturerData: !!(p?.advertising?.manufacturerData || p?.advertising?.kCBAdvDataManufacturerData),
          hasServiceData: !!(p?.advertising?.serviceData)
        });

        const rssi = p?.rssi ?? -127;
        const adv = p?.advertising || {};

        // 1) iBeacon manufacturer data
        const md = adv.manufacturerData ?? adv.kCBAdvDataManufacturerData ?? null;
        if (md) {
          log('🔷 Found manufacturer data:', typeof md, md);
          const mdBytes = mdToBytes(md);
          if (mdBytes) {
            log('🔷 Manufacturer data bytes:', toHex(mdBytes));
            const iB = parseIBeaconBytes(mdBytes);
            if (iB) {
              log('🎯 iBeacon detected via manufacturer data!');
              this.push(rssi, iB.uuid, iB.major, iB.minor, iB.measuredPower);
              return;
            }
          } else {
            log('⚠️ Could not parse manufacturer data');
          }
        } else {
          log('🔷 No manufacturer data found');
        }

        // 2) Minew service-data fallback
        const sd = adv.serviceData;
        if (sd && typeof sd === 'object') {
          log('🔷 Found service data:', Object.keys(sd));
          for (const key of Object.keys(sd)) {
            log('🔷 Processing service data for key:', key);
            const b = mdToBytes(sd[key]);
            if (!b) {
              log('⚠️ Could not parse service data for key:', key);
              continue;
            }
            log('🔷 Service data bytes for', key, ':', toHex(b));
            const m = parseMinewServiceFrame(b, key);
            if (m) {
              log('🎯 Minew beacon detected via service data!');
              this.push(rssi, m.uuid, m.major, m.minor, m.measuredPower);
              return;
            }
          }
        } else {
          log('🔷 No service data found');
        }
        
        log('❌ Peripheral does not contain iBeacon or Minew data');
      } catch (e) {
        err('⚠️ Error processing discovered peripheral:', e);
      }
    });

    // Rescan on stop
    this.subStop = this.bleEmitter.addListener('BleManagerStopScan', () => {
      log('🔷 BLE scan stopped, scheduling restart...');
      if (this.running) setTimeout(() => this.doBleScan().catch(() => {}), 250);
    });

    // Start scanning and keep it alive
    log('🔷 Starting initial BLE scan...');
    await this.doBleScan().catch(() => {});
    
    this.rescanTimer = setInterval(() => {
      if (this.running) {
        log('🔷 Periodic rescan triggered');
        this.doBleScan().catch(() => {});
      }
    }, 12000);

    // Poll discovered list (some devices miss discover events)
    this.probeTimer = setInterval(async () => {
      if (!this.running) return;
      try {
        const list: any[] = await BleManager.getDiscoveredPeripherals();
        if (!Array.isArray(list) || !list.length) {
          log('🔷 Probe: no discovered peripherals');
          return;
        }
        
        log('🔷 Probe: checking', list.length, 'discovered peripherals');
        const polled: IBeaconReading[] = [];
        
        for (const p of list) {
          const rssi = p?.rssi ?? -127;
          const adv = p?.advertising || {};
          
          // Check manufacturer data
          const md = adv.manufacturerData ?? adv.kCBAdvDataManufacturerData ?? null;
          const mdBytes = mdToBytes(md);
          if (mdBytes) {
            const iB = parseIBeaconBytes(mdBytes);
            if (iB) {
              log('🔷 Probe: found iBeacon in discovered list');
              polled.push({
                uuid: iB.uuid.toLowerCase(),
                major: iB.major,
                minor: iB.minor,
                rssi,
                ts: Date.now(),
                // @ts-ignore
                measuredPower: iB.measuredPower,
              } as IBeaconReading);
              continue;
            }
          }
          
          // Check service data
          const sd = adv.serviceData;
          if (sd && typeof sd === 'object') {
            for (const key of Object.keys(sd)) {
              const b = mdToBytes(sd[key]);
              if (!b) continue;
              const m = parseMinewServiceFrame(b, key);
              if (m) {
                log('🔷 Probe: found Minew beacon in discovered list');
                polled.push({
                  uuid: m.uuid.toLowerCase(),
                  major: m.major,
                  minor: m.minor,
                  rssi,
                  ts: Date.now(),
                  // @ts-ignore
                  measuredPower: m.measuredPower,
                } as IBeaconReading);
                break;
              }
            }
          }
        }
        
        if (polled.length) {
          log('🔷 Probe: sending', polled.length, 'beacon readings from discovered list');
          onBatch(polled);
        }
      } catch (e) {
        err('⚠️ Error in probe timer:', e);
      }
    }, 3000);
  }

  private detachBle() {
    log('🔷 Detaching BLE scanner...');
    try {
      BleManager.stopScan();
      log('🔷 BLE scan stopped');
    } catch (e) {
      err('⚠️ Error stopping BLE scan:', e);
    }
    
    this.subDiscover?.remove?.();
    this.subStop?.remove?.();
    this.subState?.remove?.();
    this.subDiscover = this.subStop = this.subState = undefined;

    if (this.rescanTimer) {
      clearInterval(this.rescanTimer);
      log('🔷 Rescan timer cleared');
    }
    if (this.probeTimer) {
      clearInterval(this.probeTimer);
      log('🔷 Probe timer cleared');
    }
    this.rescanTimer = this.probeTimer = undefined;
  }

  private async doBleScan() {
    const now = Date.now();
    log('🔍 Starting BLE scan... (last scan:', now - this.lastScanTime, 'ms ago)');
    this.lastScanTime = now;
    
    try {
      // 10s scan; allow duplicates
      await BleManager.scan([], 10, true);
      log('✅ BLE scan started successfully (10s duration, duplicates allowed)');
    } catch (e) {
      err('❌ BLE scan failed:', e);
      throw e;
    }
  }

  // ---------- Public API ----------
  async start(onBatch: (r: IBeaconReading[]) => void, opts?: StartOpts) {
    if (this.running) {
      log('⚠️ Scanner already running, ignoring start request');
      return;
    }
    
    log('🚀 Starting beacon scanner...');
    log('📱 Platform:', Platform.OS, Platform.Version);
    log('🔧 Minew available:', this.isMinew);
    
    this.running = true;
    this.buffer = [];
    this.scanCount = 0;

    const permsOk = await this.ensurePerms();
    if (!permsOk) {
      err('❌ Permissions not granted, scanner may not work properly');
    }

    // Batch flush every ~800ms (shared)
    this.flushTimer = setInterval(() => {
      if (!this.running || !this.buffer.length) return;
      const out = this.buffer;
      this.buffer = [];
      log('📦 Flushing', out.length, 'beacon readings to callback');
      onBatch(out);
    }, 800);

    if (this.isMinew) {
      log('🔵 Using Minew scanner path', opts?.uuid ? `(uuid filter ${opts.uuid})` : '');
      this.attachMinew(onBatch, opts);
    } else {
      log('🔷 Using BLE fallback path');
      await this.attachBle(onBatch);
    }
    
    log('✅ Beacon scanner started successfully');
    log('📊 Scanner Summary:');
    log('   • Platform:', Platform.OS, Platform.Version);
    log('   • Scanner Type:', this.isMinew ? 'Minew Native' : 'BLE Manager Fallback');
    log('   • Permissions:', permsOk ? 'Granted' : 'Denied/Partial');
    log('   • Batch Interval: 800ms');
    log('   • Scan Duration: 10s');
    log('   • Rescan Interval: 12s');
  }

  async stop() {
    if (!this.running) {
      log('⚠️ Scanner not running, ignoring stop request');
      return;
    }
    
    log('🛑 Stopping beacon scanner...');
    this.running = false;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      log('📦 Flush timer cleared');
    }
    this.flushTimer = undefined;
    
    if (this.buffer.length > 0) {
      log('📦 Discarding', this.buffer.length, 'buffered readings');
    }
    this.buffer = [];

    if (this.isMinew) {
      this.detachMinew();
    } else {
      this.detachBle();
    }
    
    log('✅ Beacon scanner stopped, total peripherals scanned:', this.scanCount);
  }
}