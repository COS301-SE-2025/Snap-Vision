export interface Building {
  id: string;
  name: string;
  locationId: string;
  hasBluetoothBeacons: boolean;
  floors?: number;
  description?: string;
}
