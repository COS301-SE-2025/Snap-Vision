import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RegistrationInIndex } from './app/(tabs)';
import MapScreen from './app/(tabs)/MapScreen';
// import { HomeScreen } from './app/(tabs)';
// import { Registration } from './app/(tabs)/registration';
// import RegisterScreen from './app/(tabs)/RegisterScreen';
// import registration from './app/(tabs)/registration';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';


type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;


export type RootStackParamList = {
  Register: undefined;
  Map: undefined;
};
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Register" 
          component={RegistrationInIndex} 
          options={{ title: 'Register' }} 
        />
        <Stack.Screen 
          name="Map"  // 🟢 Must match exactly what you're using in navigate()
          component={MapScreen}
          options={{ title: 'Map View' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

