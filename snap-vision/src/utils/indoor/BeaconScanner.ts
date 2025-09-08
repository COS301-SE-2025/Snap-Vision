// indoor/BeaconScanner.ts
export type IBeaconKey = { uuid: string; major: number; minor: number };
export type IBeaconReading = IBeaconKey & { rssi: number; ts: number };

export interface BeaconScanner {
  start(onBatch: (readings: IBeaconReading[]) => void): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
