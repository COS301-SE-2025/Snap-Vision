import React, { useEffect, useRef } from 'react';
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
import { Linking } from 'react-native';
import queryString from 'query-string'; // npm install query-strin
import { NavigationContainerRef } from '@react-navigation/native';
import { BadgeProvider } from './src/context/BadgeContext';
import BadgeUnlockNotifier from './src/components/organisms/BadgeUnlockNotifier';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url.includes('/location')) {
        const [, query = ''] = url.split('?');
        const params = queryString.parse(query);
        // Navigate to the Map tab inside BottomTabs
        navigationRef.current?.navigate('Tabs', {
          screen: 'Map', // Change 'Map' to your actual tab name if different
          params: {
            lat: params.lat,
            lng: params.lng,
          },
        });
      }
    };

    const linkingListener = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      linkingListener.remove();
    };
  }, []);

  return (
    <BadgeProvider>
    <ThemeProvider>
      
      <NavigationContainer ref={navigationRef}>
        <BadgeUnlockNotifier /> 
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
    </BadgeProvider>
  );
}