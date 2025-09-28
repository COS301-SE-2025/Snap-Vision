export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Dashboard: undefined;
  ShopScreen: undefined;
  BadgeScreen: undefined;
  BluetoothBuildings: undefined;
  BluetoothIndoorNavigation: {
    buildingId: string;
    buildingName: string;
    locationId: string;
  };
};
