export type IBeaconReading = {
  uuid: string;
  major: number;
  minor: number;
  rssi: number;
  ts: number;
  measuredPower?: number; // optional (parsed from iBeacon payload)
};

export interface BeaconScanner {
  start(onBatch: (readings: IBeaconReading[]) => void): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
