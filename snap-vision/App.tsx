import { LogBox, Linking } from 'react-native';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import RegistrationScreen from './src/screens/RegistrationScreen';
import BottomTabs from './src/navigation/BottomTabs';
import AdminLoadFloorplansScreen from './src/screens/AdminLoadFloorplansScreen';
import AdminEditFloorplansScreen from './src/screens/AdminEditFloorplansScreen';
import AdminFloorplanEditorScreen from './src/screens/AdminFloorplanEditorScreen';
import { ThemeProvider } from './src/theme/ThemeContext';
import ManageUsersScreen from './src/screens/ManageUsersScreen';
import queryString from 'query-string';
import { DeepLinkProvider, useDeepLink } from './src/DeepLinkContext';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import { LandingProvider } from './src/context/LandingContext';
import { UserProvider } from './src/context/UserContext';
import { BadgeProvider } from './src/context/BadgeContext';
import { AccessibilityProvider } from './src/context/AccessibilityContext';
import { UserIconProvider } from './src/context/UserIconContext';
import BadgeUnlockNotifier from './src/components/organisms/BadgeUnlockNotifier';
import ShopScreen from './src/screens/ShopScreen';
import { initializePreBundledFloorplans } from './src/utils/floorplanUtils';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/toastConfig';
import AuthResolverScreen from './src/screens/AuthResolverScreen';
import BuildingSelectionScreen from './src/screens/BuildingSelectionScreen';
import IndoorNavigationInterfaceScreen from './src/screens/IndoorNavigationInterfaceScreen';
import IndoorNavigationInstructionsScreen from './src/screens/IndoorNavigationInstructionsScreen';
import IndoorSchematicNavScreen from './src/screens/IndoorSchematicNavScreen';
import ARIndoorNavScreen from './src/screens/ARIndoorNavScreen';
import QRCodeAdminScreen from './src/screens/QRCodeAdminScreen';
import messaging from '@react-native-firebase/messaging';
import { createDefaultChannel } from './src/services/NotificationService';
import { displayForegroundNotification } from './src/services/NotificationService';
import { setupFCM } from './src/services/NotificationService';
import BluetoothBuildingsScreen from './src/screens/BluetoothBuildingsScreen';
import BluetoothIndoorNavigationScreen from './src/screens/BluetoothIndoorNavigationScreen';
import IndoorNavigationUnavailableScreen from './src/screens/IndoorNavigationUnavailableScreen';

import { navigationRef } from './src/navigation/RootNavigation';
LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text> component',
  'VirtualizedLists should never be nested inside plain ScrollViews with the same orientation',
]);

const Stack = createNativeStackNavigator();

function AppInner() {
  const { setCoords } = useDeepLink();
  const [pendingDeepLink, setPendingDeepLink] = useState<{ lat?: string; lng?: string } | null>(
    null,
  );

  // Handle deep link
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url.includes('/location')) {
        const [, query = ''] = url.split('?');
        const params = queryString.parse(query);
        setPendingDeepLink({ lat: params.lat as string, lng: params.lng as string });
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

  useEffect(() => {
    if (!pendingDeepLink) return;
    setCoords({ lat: pendingDeepLink.lat, lng: pendingDeepLink.lng });
    setPendingDeepLink(null);
  }, [pendingDeepLink, setCoords]);

  useEffect(() => {
    initializePreBundledFloorplans();
  }, []);

  //fcm token for notifications upon loading of app
  useEffect(() => {
    setupFCM();
  }, []);

  //notfication channel needed for notifee
  useEffect(() => {
    createDefaultChannel();
  }, []);

  //foreground notifications
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      await displayForegroundNotification(remoteMessage);
    });
    return unsubscribe;
  }, []);

  return (
    <BadgeProvider>
        <ThemeProvider>
          <NavigationContainer ref={navigationRef}>
            <BadgeUnlockNotifier />
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="AuthResolver">
              <Stack.Screen name="AuthResolver" component={AuthResolverScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegistrationScreen} />
              <Stack.Screen name="Tabs" component={BottomTabs} />
              <Stack.Screen name="AdminLoadFloorplans" component={AdminLoadFloorplansScreen} />
              <Stack.Screen name="AdminFloorplanEditor" component={AdminFloorplanEditorScreen} />
              <Stack.Screen name="AdminEditFloorplans" component={AdminEditFloorplansScreen} />
              <Stack.Screen name="AdminManageUsers" component={ManageUsersScreen} />
              <Stack.Screen name="AdminQRCodes" component={QRCodeAdminScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="ShopScreen" component={ShopScreen} />
              <Stack.Screen
                name="BuildingSelection"
                component={BuildingSelectionScreen}
                options={{ title: 'Indoor Navigation' }}
              />
              <Stack.Screen
                name="IndoorNavigationInterface"
                component={IndoorNavigationInterfaceScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="IndoorNavigationInstructions"
                component={IndoorNavigationInstructionsScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen name="IndoorSchematicNav" component={IndoorSchematicNavScreen} />
              <Stack.Screen
                name="ARIndoorNav"
                component={ARIndoorNavScreen}
                options={{ headerShown: false }}
              />
            <Stack.Screen
              name="BluetoothBuildings"
              component={BluetoothBuildingsScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BluetoothIndoorNavigation"
              component={BluetoothIndoorNavigationScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="IndoorNavigationUnavailable"
              component={IndoorNavigationUnavailableScreen}
              options={{ headerShown: false }}
            />
          </Stack.Navigator>
          <Toast config={toastConfig} />
        </NavigationContainer>
      </ThemeProvider>
    </BadgeProvider>
  );
}

export default function App() {
  return (
    <UserIconProvider>
    <DeepLinkProvider>
      <LandingProvider>
        <UserProvider>
          <AccessibilityProvider>
            <AppInner />
          </AccessibilityProvider>
        </UserProvider>
      </LandingProvider>
    </DeepLinkProvider>
    </UserIconProvider>
  );
}
