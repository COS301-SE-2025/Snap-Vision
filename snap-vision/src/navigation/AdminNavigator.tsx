import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminScreen from '../screens/AdminScreen';
import AdminLoadFloorplansScreen from '../screens/AdminLoadFloorplansScreen';
import AdminEditFloorplansScreen from '../screens/AdminEditFloorplansScreen';
import AdminFloorplanEditorScreen from '../screens/AdminFloorplanEditorScreen';
import AdminIndoorPositioningScreen from '../screens/AdminIndoorPositioningScreen';
import AdminSettingsScreen from '../screens/AdminSettingsScreen';
import AdminManageUsersScreen from '../screens/AdminManageUsersScreen';

export type AdminStackParamList = {
  AdminMain: undefined;
  AdminLoadFloorplans: undefined;
  AdminEditFloorplans: undefined;
  AdminFloorplanEditor: {
    buildingId: string;
    floorId: string;
    buildingName: string;
    floorName: string;
  };
  AdminIndoorPositioning: {
    buildingId: string;
    floorId: string;
  };
  AdminSettings: undefined;
  AdminManageUsers: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

export default function AdminNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="AdminMain"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AdminMain" component={AdminScreen} />
      <Stack.Screen name="AdminLoadFloorplans" component={AdminLoadFloorplansScreen} />
      <Stack.Screen name="AdminEditFloorplans" component={AdminEditFloorplansScreen} />
      <Stack.Screen name="AdminFloorplanEditor" component={AdminFloorplanEditorScreen} />
      <Stack.Screen name="AdminIndoorPositioning" component={AdminIndoorPositioningScreen} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
      <Stack.Screen name="AdminManageUsers" component={AdminManageUsersScreen} />
    </Stack.Navigator>
  );
}
