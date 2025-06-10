// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen'; 
import RegistrationScreen from './src/screens/RegistrationScreen';
import BottomTabs from './src/navigation/BottomTabs';
import AdminLoadFloorplansScreen from './src/screens/AdminLoadFloorplansScreen';
import AdminEditFloorplansScreen from './src/screens/AdminEditFloorplansScreen';
import AdminSettingsFrom from './src/components/organisms/AdminSettingsForm';
import { ThemeProvider } from './src/theme/ThemeContext';
import ManageUsersScreen from './src/screens/ManageUsersScreen';


const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
          <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegistrationScreen} />
            <Stack.Screen name="Tabs" component={BottomTabs} />
            <Stack.Screen name="AdminLoadFloorplans" component={AdminLoadFloorplansScreen} />
            <Stack.Screen name="AdminEditFloorplans" component={AdminEditFloorplansScreen} />
            <Stack.Screen name="AdminSettings" component={AdminSettingsFrom} />
            <Stack.Screen name="AdminManageUsers" component={ManageUsersScreen} />
          </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
