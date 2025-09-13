// utils/indoor/NativeBeaconScanner.ts
import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid } from 'react-native';
import type { BeaconScanner, IBeaconReading } from '../../types/BeaconScanner';

const TAG = '[BeaconScanner]';
const log = (...a: any[]) => console.log(TAG, ...a);
const err = (...a: any[]) => console.error(TAG, ...a);

type AllowedBeacon = { uuid: string; major: number; minor: number; txPowerAt1m?: number };

type StartOpts = {
  uuid?: string;               // optional UUID filter (e.g., common iBeacon UUID)
  allowed?: AllowedBeacon[];   // whitelist of beacons for this floor/building
};

export class NativeBeaconScanner implements BeaconScanner {
  private running = false;
  private minewEmitter?: NativeEventEmitter;
  private minewSub?: { remove: () => void };
  private flushTimer?: NodeJS.Timer;
  private buffer: IBeaconReading[] = [];
  private allowSet: Set<string> = new Set(); // key: uuid|major|minor
  private txMap: Map<string, number> = new Map(); // key -> txPowerAt1m

  isRunning() { return this.running; }

  private keyOf(u: string, maj: number, min: number) {
    return `${u.toLowerCase()}|${Number(maj)}|${Number(min)}`;
  }

  private preloadAllowed(allowed?: AllowedBeacon[]) {
    this.allowSet.clear();
    this.txMap.clear();
    if (!allowed?.length) return;
    for (const b of allowed) {
      const k = this.keyOf(b.uuid, b.major, b.minor);
      this.allowSet.add(k);
      if (typeof b.txPowerAt1m === 'number') this.txMap.set(k, b.txPowerAt1m);
    }
    log('✅ Allowed beacon filter loaded:', this.allowSet.size, 'items');
  }

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

    log('🔐 Requesting permissions (scanner-scoped):', perms);
    const res = await PermissionsAndroid.requestMultiple(perms);
    const granted = Object.values(res).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
    log('🔐 Permissions result:', granted ? '✅ ALL GRANTED' : '❌ SOME DENIED', res);
    return granted;
  }

  private push(rssi: number, uuid: string, major: number, minor: number, maybeTx?: number) {
    const k = this.keyOf(uuid, major, minor);
    if (this.allowSet.size && !this.allowSet.has(k)) {
      log('🚫 Filtered out non-whitelisted beacon:', { uuid, major, minor, rssi });
      return;
    }
    const tx = typeof maybeTx === 'number' ? maybeTx : (this.txMap.get(k));

    const reading: IBeaconReading = {
      uuid: uuid.toLowerCase(),
      major: Number(major),
      minor: Number(minor),
      rssi: typeof rssi === 'number' ? Number(rssi) : -127,
      ts: Date.now(),
      // @ts-ignore – many pipelines accept measuredPower when available
      ...(typeof tx === 'number' ? { measuredPower: tx } : {}),
    } as IBeaconReading;

    log('📡 Minew reading buffered:', { uuid: reading.uuid, major: reading.major, minor: reading.minor, rssi: reading.rssi, measuredPower: tx });
    this.buffer.push(reading);
  }

  private attachMinew(onBatch: (r: IBeaconReading[]) => void, opts?: StartOpts) {
    const Minew = (NativeModules as any).MinewScanner;
    this.minewEmitter = new NativeEventEmitter(Minew);

    log('🔵 Minew attach (SDK-only). UUID filter =', opts?.uuid || 'none');

    this.minewSub = this.minewEmitter.addListener('onBeacon', (e: any) => {
      if (!e) { log('⚠️ Minew event empty'); return; }
      log('🔵 Minew event:', e);
      this.push(e.rssi, e.uuid, e.major, e.minor, e.txPower);
    });

    const params = opts?.uuid ? { uuid: opts.uuid.toLowerCase() } : {};
    Minew.startScan(params)
      .then(() => log('✅ Minew scan started'))
      .catch((err: any) => err && console.error('❌ Minew start error', err));
  }

  private detachMinew() {
    const Minew = (NativeModules as any).MinewScanner;
    try { Minew.stopScan?.(); } catch (e) { err('⚠️ Minew stop error', e); }
    this.minewSub?.remove?.();
    this.minewSub = undefined;
    this.minewEmitter = undefined;
  }

  async start(onBatch: (r: IBeaconReading[]) => void, opts?: StartOpts) {
    if (this.running) { log('⚠️ Already running'); return; }
    this.running = true;
    this.buffer = [];

    this.preloadAllowed(opts?.allowed);
    const permsOk = await this.ensurePerms();
    if (!permsOk) log('⚠️ Permissions not fully granted; scan may be limited');

    // Batch flush ~800ms
    this.flushTimer = setInterval(() => {
      if (!this.running || !this.buffer.length) return;
      const out = this.buffer; this.buffer = [];
      log('📦 Flush batch ->', out.length, 'readings');
      onBatch(out);
    }, 800);

    this.attachMinew(onBatch, opts);
  }

  async stop() {
    if (!this.running) { log('⚠️ Not running'); return; }
    this.running = false;
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = undefined;
    this.buffer = [];
    this.detachMinew();
    log('✅ Scanner stopped');
  }
}
