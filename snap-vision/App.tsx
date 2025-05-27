import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from './app/(tabs)/login';
import RegistrationScreen from './app/(tabs)/registration';
import BottomTabs from './app/(tabs)/BottomTabs';

import { ThemeProvider } from './app/(tabs)/ThemeContext';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tabs: undefined; 
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ThemeProvider>
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegistrationScreen} />
        <Stack.Screen name="Tabs" component={BottomTabs} /> 
      </Stack.Navigator>
    </NavigationContainer>
    </ThemeProvider>

  );
}
