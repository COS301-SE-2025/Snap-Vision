// utils/indoor/NativeBeaconScanner.ts
import { NativeEventEmitter, NativeModules, Platform, PermissionsAndroid } from 'react-native';
import type { BeaconScanner, IBeaconReading } from '../../types/BeaconScanner';

// Minew MBS02 beacon constants
const MINEW_DEFAULT_UUID = 'e2c56db5-dffb-48d2-b060-d0f5a71096e0'; // Default UUID for Minew beacons
const MINEW_DEFAULT_TXPOWER = -59; // Default txPower at 1m for Minew MBS02 beacons

const TAG = '[BeaconScanner]';
const log = (...a: any[]) => console.log(TAG, ...a);
const err = (...a: any[]) => console.error(TAG, ...a);

type AllowedBeacon = {
  uuid: string;
  major: number;
  minor: number;
  txPowerAt1m?: number; // from Firestore
};

type StartOpts = {
  /** Optional global UUID filter (e.g. e2c56db5-dffb-48d2-b060-d0f5a71096e0) */
  uuid?: string;
  /** Whitelist of beacons (uuid+major+minor). Only these will be emitted to positioning. */
  allowed?: AllowedBeacon[];
};

export class NativeBeaconScanner implements BeaconScanner {
  private running = false;

  // Minew (native) path only
  private minewEmitter?: NativeEventEmitter;
  private minewSub?: { remove: () => void };
  private minewDebugSub?: { remove: () => void };

  // Batch flush timer
  private flushTimer?: NodeJS.Timer;
  private buffer: IBeaconReading[] = [];

  // Whitelist + txPower map
  private allowSet: Set<string> = new Set();      // key: uuid|major|minor
  private txMap: Map<string, number> = new Map(); // key -> txPowerAt1m

  isRunning() {
    return this.running;
  }

  // ---- Helpers ----
  private keyOf(u: string, maj: number, min: number) {
    return `${u.toLowerCase()}|${Number(maj)}|${Number(min)}`;
  }

  private preloadAllowed(allowed?: AllowedBeacon[]) {
    this.allowSet.clear();
    this.txMap.clear();
    if (!allowed?.length) {
      // For the specific use case of Minew beacons with minors 1, 2, 3
      log('⚠️ No whitelist provided - using default Minew beacon config for minors 1, 2, 3');
      
      // Add the known Minew beacons as defaults
      for (let minor = 1; minor <= 3; minor++) {
        const k = this.keyOf(MINEW_DEFAULT_UUID, 1, minor);
        this.allowSet.add(k);
        this.txMap.set(k, MINEW_DEFAULT_TXPOWER);
        log(`✅ Added default Minew beacon: UUID=${MINEW_DEFAULT_UUID}, major=1, minor=${minor}`);
      }
      return;
    }
    
    for (const b of allowed) {
      const k = this.keyOf(b.uuid, b.major, b.minor);
      this.allowSet.add(k);
      if (typeof b.txPowerAt1m === 'number') {
        this.txMap.set(k, b.txPowerAt1m);
      } else {
        // Set default txPower if not provided
        this.txMap.set(k, MINEW_DEFAULT_TXPOWER);
      }
      
      // Also add key with just major/minor for more flexible matching
      const mmKey = `any|${Number(b.major)}|${Number(b.minor)}`;
      this.allowSet.add(mmKey);
      if (typeof b.txPowerAt1m === 'number') {
        this.txMap.set(mmKey, b.txPowerAt1m);
      } else {
        this.txMap.set(mmKey, MINEW_DEFAULT_TXPOWER);
      }
    }
    log('✅ Loaded whitelist:', [...this.allowSet]);
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
    // Some devices still require location for BLE scan results to come through
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);

    log('🔐 Requesting scanner-scoped permissions:', perms);
    const res = await PermissionsAndroid.requestMultiple(perms);
    const granted = Object.values(res).every(v => v === PermissionsAndroid.RESULTS.GRANTED);
    log('🔐 Permission result:', granted ? '✅ ALL GRANTED' : '❌ SOME DENIED', res);
    return granted;
  }

  private push(rssi: number, uuid: string, major: number, minor: number, maybeTx?: number) {
    const u = (uuid || '').toLowerCase();
    const k = this.keyOf(u, major, minor);
    const mmKey = `any|${Number(major)}|${Number(minor)}`;

    // More flexible whitelist matching:
    // 1) Try exact UUID+major+minor match
    // 2) Try major+minor only match with 'any' UUID
    // 3) For the specific case of Minew MBS02 beacons with minors 1,2,3 - always accept
    const isExactMatch = this.allowSet.has(k);
    const isMajorMinorMatch = this.allowSet.has(mmKey);
    const isKnownMinewBeacon = (major === 1 && (minor === 1 || minor === 2 || minor === 3));
    
    if (this.allowSet.size && !isExactMatch && !isMajorMinorMatch && !isKnownMinewBeacon) {
      log('🚫 Ignored beacon:', { uuid: u, major, minor, rssi });
      return;
    }
    
    // If beacon passed the filter, log which filter matched
    if (isExactMatch) {
      log('✅ Exact match in whitelist:', { uuid: u, major, minor });
    } else if (isMajorMinorMatch) {
      log('✅ Major/Minor match in whitelist:', { major, minor });
    } else if (isKnownMinewBeacon) {
      log('✅ Known Minew beacon configuration:', { major, minor });
    }

    // Choose measured power with enhanced flexibility:
    // 1. Try native txPower from the beacon itself
    // 2. Try exact uuid+major+minor match in txMap
    // 3. Try major+minor only match in txMap
    // 4. Use default Minew txPower
    let tx: number | undefined;
    
    if (typeof maybeTx === 'number') {
      tx = maybeTx;
      log('📊 Using txPower from beacon:', tx);
    } else if (this.txMap.has(k)) {
      tx = this.txMap.get(k);
      log('📊 Using txPower from exact match:', tx);
    } else if (this.txMap.has(mmKey)) {
      tx = this.txMap.get(mmKey);
      log('📊 Using txPower from major/minor match:', tx);
    } else if (isKnownMinewBeacon) {
      tx = MINEW_DEFAULT_TXPOWER;
      log('📊 Using default Minew txPower:', tx);
    }

    const reading: IBeaconReading = {
      uuid: u,
      major: Number(major),
      minor: Number(minor),
      rssi: typeof rssi === 'number' ? Number(rssi) : -127,
      ts: Date.now(),
      // @ts-ignore — include when present so distance model can use it
      ...(typeof tx === 'number' ? { measuredPower: tx } : {}),
    } as IBeaconReading;

    log('📡 ACCEPT iBeacon:', {
      uuid: reading.uuid,
      major: reading.major,
      minor: reading.minor,
      rssi: reading.rssi,
      measuredPower: tx,
    });

    this.buffer.push(reading);
  }

  // ---- Minew (SDK-only) ----
  private attachMinew(onBatch: (r: IBeaconReading[]) => void, opts?: StartOpts) {
    const Minew = (NativeModules as any).MinewScanner;
    this.minewEmitter = new NativeEventEmitter(Minew);

    // For Minew MBS02 beacons, we want to match the default UUID
    // but make the filter optional to catch any potential format variations
    const uuidFilter = opts?.uuid?.toLowerCase?.() || MINEW_DEFAULT_UUID.toLowerCase();
    
    log('🔵 Minew attach: UUID filter =', uuidFilter, '(default for Minew MBS02)');
    log('🔵 Looking for beacons with major=1, minors=[1,2,3]');
    
    // Listen to debug events from the native module
    this.minewDebugSub = this.minewEmitter.addListener('onBeaconDebug', (debug: any) => {
      if (!debug) return;
      
      // Format the message based on its type
      const message = debug.message || 'Debug event';
      switch (message) {
        case 'Starting Minew scanner':
          log('🔍 NATIVE: Starting scanner with UUID filter:', debug.uuidFilter);
          break;
        case 'Detected peripherals':
          log('📡 NATIVE: Found', debug.count, 'peripherals');
          break;
        case 'Raw peripheral detected':
          log('📱 NATIVE: Raw peripheral - MAC:', debug.mac, 'RSSI:', debug.rssi, 'Name:', debug.name);
          break;
        case 'Advertisement frames':
          log('📦 NATIVE: Adv frames for', debug.mac, '- Count:', debug.count);
          break;
        case 'Frame found':
          log('🧩 NATIVE: Frame type:', debug.type, 'MAC:', debug.mac, 'RSSI:', debug.rssi);
          break;
        case 'iBeacon detected':
          log('🔔 NATIVE: iBeacon - UUID:', debug.uuid, 'Major:', debug.major, 'Minor:', debug.minor, 'RSSI:', debug.rssi);
          break;
        case 'Scan started':
          log('✅ NATIVE: Scan successfully started');
          break;
        default:
          log('🔧 NATIVE DEBUG:', debug);
      }
    });

    // The native module emits iBeacon frames: { uuid, major, minor, rssi, txPower? }
    this.minewSub = this.minewEmitter.addListener('onBeacon', (e: any) => {
      if (!e) {
        log('⚠️ Empty Minew event');
        return;
      }
      
      // Log all beacon events to help with debugging
      log('🔍 Raw Minew beacon event:', { 
        uuid: e.uuid, 
        major: e.major, 
        minor: e.minor, 
        rssi: e.rssi,
        txPower: e.txPower
      });

      // More flexible UUID filtering:
      // 1. Either match the provided UUID filter
      // 2. Or match the default Minew UUID
      // 3. Or match any UUID if we're looking specifically for beacons with major=1, minor=[1,2,3]
      const u = String(e.uuid || '').toLowerCase();
      const isUuidMatch = !uuidFilter || u === uuidFilter || u === MINEW_DEFAULT_UUID.toLowerCase();
      const isKnownMinewBeacon = (e.major === 1 && (e.minor === 1 || e.minor === 2 || e.minor === 3));
      
      if (!isUuidMatch && !isKnownMinewBeacon) {
        log('🚫 Ignored beacon (UUID mismatch):', { got: u, want: uuidFilter, major: e.major, minor: e.minor });
        return;
      }
      
      // Special handling for Minew MBS02 beacons
      if (isKnownMinewBeacon) {
        log('✅ Processing known Minew beacon:', { major: e.major, minor: e.minor, rssi: e.rssi });
        
        // Always use the correct UUID for Minew beacons to ensure matching
        this.push(e.rssi, MINEW_DEFAULT_UUID, e.major, e.minor, e.txPower || MINEW_DEFAULT_TXPOWER);
        return;
      }

      // Regular handling for other iBeacon-style payloads
      this.push(e.rssi, u, e.major, e.minor, e.txPower);
    });

    // Don't filter by UUID at the native level to ensure we get all beacons
    // We'll do more flexible filtering in our listener callback
    Minew.startScan({})
      .then(() => log('✅ Minew scan started - looking for all beacon formats'))
      .catch((e: any) => err('❌ Minew start error', e));
  }

  private detachMinew() {
    const Minew = (NativeModules as any).MinewScanner;
    try {
      Minew.stopScan?.();
      log('🔵 Minew scan stopped');
    } catch (e) {
      err('⚠️ Minew stop error', e);
    }
    this.minewSub?.remove?.();
    this.minewSub = undefined;
    this.minewDebugSub?.remove?.();
    this.minewDebugSub = undefined;
    this.minewEmitter = undefined;
  }

  // ---- Public API ----
  async start(onBatch: (r: IBeaconReading[]) => void, opts?: StartOpts) {
    if (this.running) {
      log('⚠️ Scanner already running');
      return;
    }
    this.running = true;
    this.buffer = [];

    log('🔄 Starting beacon scanner with options:', opts || 'default options');
    
    // Load whitelist and perms
    this.preloadAllowed(opts?.allowed);
    const permsOk = await this.ensurePerms();
    if (!permsOk) {
      log('⚠️ Permissions may limit scan results - check Android permissions');
      // Try to continue anyway
    }

    // Use a shorter flush interval for more responsive positioning
    // 500ms instead of 800ms for faster updates
    this.flushTimer = setInterval(() => {
      if (!this.running || !this.buffer.length) return;
      const out = this.buffer;
      this.buffer = [];
      log('📦 Flush batch ->', out.length, 'readings');
      onBatch(out);
    }, 500);

    // Start Minew scanner
    this.attachMinew(onBatch, opts);
    
    // Log expected beacon configuration
    log('🔍 Scanner started, looking for Minew MBS02 beacons:');
    log('   - Expected UUID: e2c56db5-dffb-48d2-b060-d0f5a71096e0');
    log('   - Expected major: 1');
    log('   - Expected minors: 1, 2, 3');
  }

  async stop() {
    if (!this.running) {
      log('⚠️ Scanner not running');
      return;
    }
    this.running = false;

    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = undefined;
    this.buffer = [];

    this.detachMinew();
    log('✅ Scanner stopped');
  }
}
