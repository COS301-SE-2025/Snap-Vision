import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MapScreen from './app/(tabs)/MapScreen';
import RegistrationScreen from './app/(tabs)/registration';
import LoginScreen from './app/(tabs)/login';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';


type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;


export type RootStackParamList = {
  Register: undefined;
  Login: undefined;
  Map: undefined;
};
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
      <Stack.Screen name="Register" component={RegistrationScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen 
          name="Map"  // 🟢 Must match exactly what you're using in navigate()
          component={MapScreen}
          options={{ title: 'Map View' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

