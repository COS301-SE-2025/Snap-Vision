export interface FloorplanMeta {
  locationId: string;
  buildingId: string;
  buildingName: string;
  floorLabel: string;
  timestamp: string;
  downloadURL: string;
  id: string;
}

export interface Location {
  id: string;
  name: string;
}

export interface Building {
  id: string;
  name: string;
}

export type RootStackParamList = {
  AdminEditFloorplansScreen: undefined;
  AdminLoadFloorplansScreen: undefined;
  AdminFloorplanEditor: {
    locationId: string;
    buildingId: string;
    floorLabel: string;
    imageUri?: string;
  };
};
