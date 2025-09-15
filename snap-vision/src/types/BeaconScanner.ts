export interface IBeaconKey {
  uuid: string;
  major: number;
  minor: number;
}

export type IBeaconReading = IBeaconKey & {
  rssi: number;
  ts: number;
  measuredPower?: number; // optional (parsed from iBeacon payload)
};

export interface BeaconScanner {
  start(onBatch: (readings: IBeaconReading[]) => void, options?: any): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
