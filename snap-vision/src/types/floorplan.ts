// Interface for building data from UPcampusPOIs
export interface Building {
  id: string;
  name: string;
  centroid?: {
    latitude: number;
    longitude: number;
  };
  floors?: number;
}

export interface Location {
  id: string;
  name: string;
}

export interface UploadedData {
  buildingId: string;
  floorLabel: string;
  imageUri: string;
  locationId: string;
}
