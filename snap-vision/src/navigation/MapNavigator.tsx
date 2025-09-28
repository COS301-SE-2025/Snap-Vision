import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MapScreen from '../screens/MapScreen';
import BluetoothBuildingsScreen from '../screens/BluetoothBuildingsScreen';

const Stack = createStackNavigator();

const MapNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MapMain" component={MapScreen} />
      <Stack.Screen name="BluetoothBuildings" component={BluetoothBuildingsScreen} />
    </Stack.Navigator>
  );
};

export default MapNavigator;
