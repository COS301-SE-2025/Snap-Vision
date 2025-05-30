// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen'; 
import RegistrationScreen from './src/screens/RegistrationScreen';
import BottomTabs from './src/navigation/BottomTabs';

import { ThemeProvider } from './src/theme/ThemeContext'; 


const Stack = createNativeStackNavigator();

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
