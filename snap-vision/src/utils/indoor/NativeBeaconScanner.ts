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
    
    // Handle direct array format
    if (Array.isArray(md.bytes)) return md.bytes as number[];
    
    // Handle base64 string format
    const b64 = typeof md?.data === 'string' ? md.data : typeof md === 'string' ? md : null;
    if (b64) return Array.from(Buffer.from(b64, 'base64').values());
    
    // Handle nested object format with company IDs (e.g., {004c: {bytes: [...], data: "..."}})
    if (typeof md === 'object' && md !== null) {
      // Look for Apple's company ID (004c) first - most common for iBeacons
      if (md['004c']) {
        const appleData = md['004c'];
        if (Array.isArray(appleData.bytes)) return appleData.bytes as number[];
        if (typeof appleData.data === 'string') {
          return Array.from(Buffer.from(appleData.data, 'base64').values());
        }
      }
      
      // Try any other company ID
      for (const companyId of Object.keys(md)) {
        const companyData = md[companyId];
        if (companyData && typeof companyData === 'object') {
          if (Array.isArray(companyData.bytes)) return companyData.bytes as number[];
          if (typeof companyData.data === 'string') {
            return Array.from(Buffer.from(companyData.data, 'base64').values());
          }
        }
      }
    }
    
    //console.log('[mdToBytes] Unknown format:', JSON.stringify(md));
    return null;
  } catch (e) {
    err('mdToBytes error:', e);
  }
  return null;
}

// Parse iBeacon from manufacturer bytes: 0x02 0x15 [UUID16][major2][minor2][tx1]
function parseIBeaconBytes(bytes: number[]) {
  if (!bytes || bytes.length < 23) return null; // Reduced from 25 to 23

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
  let mp = start + 20 < bytes.length ? bytes[start + 20] : -59; // Handle missing measured power
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

// Parse iBeacon data directly from service data (for beacons using c5e2 service)
function parseDirectServiceIBeacon(bytes: number[]) {
  if (!bytes || bytes.length < 20) return null;

  // Service data format: [UUID16][major2][minor2][tx1]
  if (bytes.length >= 20) {
    const uu = bytes.slice(0, 16);
    const h = (n: number) => n.toString(16).padStart(2, '0');
    const uuid =
      `${uu.slice(0, 4).map(h).join('')}-${uu.slice(4, 6).map(h).join('')}-${uu.slice(6, 8).map(h).join('')}-${uu.slice(8, 10).map(h).join('')}-${uu.slice(10, 16).map(h).join('')}`.toLowerCase();

    const major = (bytes[16] << 8) | bytes[17];
    const minor = (bytes[18] << 8) | bytes[19];
    let mp = bytes.length > 20 ? bytes[20] : -59; // Default measured power
    if (mp > 127) mp -= 256;

    return { uuid, major, minor, measuredPower: mp };
  }

  return null;
}

//Types
type StartOpts = {
  uuid?: string; // optional UUID filter (for Minew native path)
  allowed?: Array<{ uuid?: string; major: number; minor: number; txPowerAt1m?: number }>;
};

export class NativeBeaconScanner {
  private running = false;

  // RSSI smoothing: keep a moving average per beacon (uuid|major|minor)
  private rssiAverages: Record<
    string,
    { sum: number; count: number; avg: number; lastUpdate?: number }
  > = {};
  private RSSI_WINDOW = 8; // Increased for more smoothing in larger venue

  // Ignore small movement: only update if estimated distance changes by > threshold (meters)
  private lastDistances: Record<string, number> = {};
  private DISTANCE_THRESHOLD = 0.5; // Reduced for less sensitivity to small changes

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
  private cacheCleanTimer?: NodeJS.Timer;

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
    uuid = (uuid || '').toLowerCase();
    major = Number(major);
    minor = Number(minor);
    rssi = typeof rssi === 'number' ? Number(rssi) : -127;
    const key = `${uuid}|${major}|${minor}`;

    //RSSI smoothing
    if (!this.rssiAverages[key]) {
      this.rssiAverages[key] = { sum: 0, count: 0, avg: rssi, lastUpdate: Date.now() };
    }
    const avgObj = this.rssiAverages[key];
    avgObj.sum += rssi;
    avgObj.count++;
    if (avgObj.count > this.RSSI_WINDOW) {
      avgObj.sum -= avgObj.sum / avgObj.count;
      avgObj.count = this.RSSI_WINDOW;
    }
    avgObj.avg = avgObj.sum / avgObj.count;
    const smoothRssi = avgObj.avg;

    //Distance estimation with damping for larger venue
    const tx = typeof measuredPower === 'number' ? measuredPower : -59;
    const n = 2.4; // Increased from 2.0 for gentler distance scaling
    const estDist = Math.pow(10, (tx - smoothRssi) / (10 * n));

    //Ignore small changes
    let shouldPush = true;
    if (this.lastDistances[key] !== undefined) {
      const delta = Math.abs(estDist - this.lastDistances[key]);
      if (delta < this.DISTANCE_THRESHOLD) {
        shouldPush = false;
      }
    }
    this.lastDistances[key] = estDist;

    if (shouldPush) {
      const reading: IBeaconReading = {
        uuid,
        major,
        minor,
        rssi: smoothRssi,
        ts: Date.now(),
      };
      if (typeof measuredPower === 'number') (reading as any).measuredPower = measuredPower;
      (reading as any).estDist = estDist;
      this.buffer.push(reading);
    }
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
    // Multiple initial scans to populate discovery cache quickly
    setTimeout(() => this.doBleScan().catch(() => {}), 200);
    setTimeout(() => this.doBleScan().catch(() => {}), 400);
    setTimeout(() => this.doBleScan().catch(() => {}), 600);

    // Much faster rescan for instant detection
    this.rescanTimer = setInterval(() => {
      if (this.running) this.doBleScan().catch(() => {});
    }, 1000); // was 4000 - now every 1s for instant detection

    // Clear BLE cache periodically to prevent stale data
    this.cacheCleanTimer = setInterval(async () => {
      if (!this.running) return;
      try {
        // Clear the discovered peripherals cache to force fresh discoveries
        await BleManager.retrieveServices(''); // This often clears internal cache
      } catch (e) {
        // Ignore errors - this is just cache maintenance
      }
    }, 10000); // Clear cache every 10 seconds

    // Probe discovered list very frequently for instant detection
    this.probeTimer = setInterval(async () => {
      if (!this.running) return;
      try {
        const list: any[] = await BleManager.getDiscoveredPeripherals();
        if (!Array.isArray(list) || !list.length) return;

        const polled: IBeaconReading[] = [];
        let foundBeacons = 0;
        const now = Date.now();

        for (const p of list) {
          let rssi = p?.rssi ?? -127;
          const adv = p?.advertising || {};

          // DEBUG: Log all peripheral data to see what's available
          // Commented out for performance - uncomment if debugging needed
          /*
          if (p.id || p.name) {
            //console.log(`[BEACON SCAN DEBUG] Peripheral:`, {
              id: p.id,
              name: p.name,
              rssi: rssi,
              manufacturerData: adv.manufacturerData,
              manufacturerDataRaw: JSON.stringify(adv.manufacturerData),
              serviceData: adv.serviceData,
              serviceDataRaw: JSON.stringify(adv.serviceData),
              serviceUUIDs: adv.serviceUUIDs,
              localName: adv.localName,
              txPowerLevel: adv.txPowerLevel,
              isConnectable: adv.isConnectable,
              allKeys: Object.keys(p),
              advKeys: Object.keys(adv),
            });

            // DEBUG: Try to parse the manufacturer data manually
            const md = adv.manufacturerData ?? adv.kCBAdvDataManufacturerData ?? null;
            //console.log(`[BEACON SCAN DEBUG] Raw manufacturer data:`, md);
            const mdBytes = mdToBytes(md);
            //console.log(`[BEACON SCAN DEBUG] Converted to bytes:`, mdBytes);
            if (mdBytes) {
              //console.log(
                `[BEACON SCAN DEBUG] Bytes as hex:`,
                mdBytes.map((b) => b.toString(16).padStart(2, '0')).join(' '),
              );
              const ib = parseIBeaconBytes(mdBytes);
              //console.log(`[BEACON SCAN DEBUG] Parsed iBeacon:`, ib);
            }
          }
          */

          // Filter out stale cached entries - only use recent discoveries
          // If RSSI is too weak, likely a stale cache entry
          if (rssi < -95) {
            continue; // Skip very weak signals (likely stale cache)
          }

          const md = adv.manufacturerData ?? adv.kCBAdvDataManufacturerData ?? null;
          const mdBytes = mdToBytes(md);
          let uuid = '',
            major = 0,
            minor = 0,
            measuredPower;
          let found = false;

          // DEBUG: Beacon parsing - commented out for performance
          // Uncomment if you need to debug beacon detection issues
          /*
          //console.log(
            `[BEACON PARSE DEBUG] Processing peripheral ${p.id}, md:`,
            md,
            'mdBytes:',
            mdBytes,
          );
          */

          if (mdBytes) {
            const ib = parseIBeaconBytes(mdBytes);
            // DEBUG: iBeacon parsing - commented out for performance
            /*
            //console.log(`[BEACON PARSE DEBUG] parseIBeaconBytes result:`, ib);
            if (ib) {
              //console.log(
                `[BEACON PARSE DEBUG] Checking allowedMM for ${mm}, allowedMM size:`,
                this.allowedMM.size,
                'has:',
                this.allowedMM.has(mm),
              );
              if (!this.allowedMM.size || this.allowedMM.has(mm)) {
                //console.log(
                  `[BEACON PARSE DEBUG] ✅ FOUND iBeacon: UUID=${uuid} Major=${major} Minor=${minor}`,
                );
              } else {
                //console.log(`[BEACON PARSE DEBUG] ❌ iBeacon rejected by allowedMM filter`);
              }
            } else {
              //console.log(`[BEACON PARSE DEBUG] ❌ parseIBeaconBytes returned null`);
            }
            */
            if (ib) {
              const mm = `${ib.major}|${ib.minor}`;
              if (!this.allowedMM.size || this.allowedMM.has(mm)) {
                uuid = ib.uuid.toLowerCase();
                major = ib.major;
                minor = ib.minor;
                measuredPower = ib.measuredPower;
                found = true;
              }
            }
          } else {
            // No manufacturer data bytes available
          }
          if (!found) {
            const sd = adv.serviceData;

            // DEBUG: Log peripherals that couldn't be parsed as beacons
            if (rssi > -80) {
              // Only log relatively strong signals
              //console.log(`[BEACON SCAN DEBUG] Strong peripheral but no beacon data:`, {
              //   id: p.id,
              //   name: p.name,
              //   rssi: rssi,
              //   hasManufacturerData: !!md,
              //   manufacturerDataLength: mdBytes ? mdBytes.length : 0,
              //   serviceDataKeys: sd ? Object.keys(sd) : [],
              //   possibleMAC: p.id?.includes(':') ? p.id : null,
              // });
            }
            if (sd && typeof sd === 'object') {
              for (const key of Object.keys(sd)) {
                //console.log(`[BEACON PARSE DEBUG] Service key ${key}:`, sd[key]);
                const b = mdToBytes(sd[key]);
                //console.log(`[BEACON PARSE DEBUG] Service data bytes for ${key}:`, b);
                if (!b) continue;

                // Try direct iBeacon parsing from service data first (for c5e2 service)
                if (key.toLowerCase() === 'c5e2' && b.length >= 20) {
                  //console.log(
                  //   `[BEACON PARSE DEBUG] Trying direct iBeacon parse from c5e2 service data`,
                  // );
                  const directBeacon = parseDirectServiceIBeacon(b);
                  //console.log(`[BEACON PARSE DEBUG] Direct service parse result:`, directBeacon);
                  if (directBeacon) {
                    const mm = `${directBeacon.major}|${directBeacon.minor}`;
                    //console.log(
                    //   `[BEACON PARSE DEBUG] Checking allowedMM for direct service ${mm}, allowedMM size:`,
                    //   this.allowedMM.size,
                    // );
                    if (!this.allowedMM.size || this.allowedMM.has(mm)) {
                      uuid = directBeacon.uuid.toLowerCase();
                      major = directBeacon.major;
                      minor = directBeacon.minor;
                      measuredPower = directBeacon.measuredPower;
                      found = true;
                      //console.log(
                      //   `[BEACON PARSE DEBUG] ✅ FOUND via direct service parse: UUID=${uuid} Major=${major} Minor=${minor}`,
                      // );
                      break;
                    } else {
                      //console.log(
                      //   `[BEACON PARSE DEBUG] ❌ Direct service beacon rejected by allowedMM filter`,
                      // );
                    }
                  }
                }

                // Fall back to standard Minew service frame
                const m = parseMinewServiceFrame(b, key);
                //console.log(`[BEACON PARSE DEBUG] Minew parse result:`, m);
                if (m) {
                  const mm = `${m.major}|${m.minor}`;
                  if (!this.allowedMM.size || this.allowedMM.has(mm)) {
                    uuid = m.uuid.toLowerCase();
                    major = m.major;
                    minor = m.minor;
                    measuredPower = m.measuredPower;
                    found = true;
                    //console.log(
                    //   `[BEACON PARSE DEBUG] ✅ FOUND via Minew service: UUID=${uuid} Major=${major} Minor=${minor}`,
                    // );
                    break;
                  }
                }
              }
            }
          }
          if (found) {
            const key = `${uuid}|${major}|${minor}`;

            // For instant detection, be more aggressive with updates
            if (!this.rssiAverages[key]) {
              this.rssiAverages[key] = { sum: 0, count: 0, avg: rssi, lastUpdate: now };
            }
            const avgObj = this.rssiAverages[key];

            // Check if this is a fresh reading vs stale cache
            const lastUpdate = avgObj.lastUpdate || 0;
            const timeSinceUpdate = now - lastUpdate;

            // Only use readings that seem fresh (updated recently or strong signal)
            if (timeSinceUpdate > 5000 && rssi < -70) {
              continue; // Skip likely stale cache entries
            }

            avgObj.sum += rssi;
            avgObj.count++;
            avgObj.lastUpdate = now;

            // Adaptive smoothing - more smoothing when signal is noisy, less when moving
            const maxReadings = rssi > -60 ? 5 : 8; // Much more smoothing for stable positioning
            if (avgObj.count > maxReadings) {
              avgObj.sum -= avgObj.sum / avgObj.count;
              avgObj.count = maxReadings;
            }
            avgObj.avg = avgObj.sum / avgObj.count;
            const smoothRssi = avgObj.avg;

            // Distance estimation
            const tx = typeof measuredPower === 'number' ? measuredPower : -59;
            const n = 2.0;
            const estDist = Math.pow(10, (tx - smoothRssi) / (10 * n));

            // Adaptive distance filtering for smooth movement tracking
            let shouldPush = true;
            if (this.lastDistances[key] !== undefined) {
              const delta = Math.abs(estDist - this.lastDistances[key]);
              const timeSinceLastUpdate = now - lastUpdate;

              // Much more restrictive filtering for stable positioning
              const threshold = timeSinceLastUpdate > 3000 ? 0.4 : 0.15; // Smaller thresholds

              if (delta < threshold) {
                shouldPush = false;
              }
            }
            this.lastDistances[key] = estDist;

            if (shouldPush) {
              foundBeacons++;
              polled.push({
                uuid,
                major,
                minor,
                rssi: smoothRssi,
                ts: now,
                measuredPower,
                estDist,
              } as any);
            }
          }
        }

        // Clean up very old RSSI averages that might be causing stale cache issues
        if (foundBeacons > 0) {
          const keys = Object.keys(this.rssiAverages);
          for (const k of keys) {
            const lastUpdate = this.rssiAverages[k].lastUpdate || 0;
            if (now - lastUpdate > 15000) {
              // 15 seconds old
              delete this.rssiAverages[k];
              delete this.lastDistances[k];
            }
          }
        }

        if (polled.length) {
          log(
            'Probe pushed',
            polled.length,
            'readings:',
            polled.map((p) => `${p.major}|${p.minor} rssi:${p.rssi.toFixed(1)}`),
          );
          onBatch(polled);
        } else if (foundBeacons === 0 && list.length > 0) {
          log(
            'Probe found',
            list.length,
            'peripherals but no beacons - checking discovery cache...',
          );
        }
      } catch (e) {
        err('Probe error:', e);
      }
    }, 800); // Increased from 300ms to 800ms for more stable positioning
  }

  private detachBle() {
    try {
      BleManager.stopScan();
    } catch {}
    this.subDiscover?.remove?.();
    this.subStop?.remove?.();
    this.subState?.remove?.();
    this.subDiscover = this.subStop = this.subState = undefined;
    if (this.rescanTimer) clearInterval(this.rescanTimer as any);
    if (this.probeTimer) clearInterval(this.probeTimer as any);
    if (this.cacheCleanTimer) clearInterval(this.cacheCleanTimer as any);
    this.rescanTimer = this.probeTimer = undefined;
    log('BLE scan stopped');
  }

  private async doBleScan() {
    log('BLE scan start (1s, allow dupes)');
    try {
      await BleManager.scan([], 1, true); // Reduced from 2s to 1s for faster discovery
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
      // Expected values
      const minors = [1, 2, 3];
      for (const m of minors) {
        this.allowedMM.add(`1|${m}`);
      }
      
      // Also add the actual values we're seeing in the logs (from iBeacon data)
      // From the debug logs: C2:03:03:00:41:67 has [0,1,0,3] which is Major=1, Minor=3
      // From the debug logs: C2:03:03:00:41:6B has [0,1,0,1] which is Major=1, Minor=1
      this.allowedMM.add(`1|1`);  // Explicitly add what we expect to see
      this.allowedMM.add(`1|2`);
      this.allowedMM.add(`1|3`);
      
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
      }, 500); // Increased from 200ms to 500ms for more stable positioning
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
      clearInterval(this.flushTimer as any);
      this.flushTimer = undefined;
    }
    this.buffer = [];
    if (this.isMinew) this.detachMinew();
    this.detachBle();
    this.rssiAverages = {};
    this.lastDistances = {};
    log('Scanner stopped');
  }
}
