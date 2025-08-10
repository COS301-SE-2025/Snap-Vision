import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Text strings must be rendered within a <Text> component']);
// App.tsx
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import RegistrationScreen from './src/screens/RegistrationScreen';
import BottomTabs from './src/navigation/BottomTabs';
import AdminLoadFloorplansScreen from './src/screens/AdminLoadFloorplansScreen';
import AdminEditFloorplansScreen from './src/screens/AdminEditFloorplansScreen';
import AdminFloorplanEditorScreen from './src/screens/AdminFloorplanEditorScreen';
import AdminSettingsFrom from './editTests/AdminSettingsForm';
import { ThemeProvider } from './src/theme/ThemeContext';
import ManageUsersScreen from './src/screens/ManageUsersScreen';
import { Linking } from 'react-native';
import queryString from 'query-string';
import { DeepLinkProvider, useDeepLink } from './src/DeepLinkContext';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import { LandingProvider } from './src/context/LandingContext';
import { UserProvider } from './src/context/UserContext';
import { BadgeProvider } from './src/context/BadgeContext';
import { AccessibilityProvider } from './src/context/AccessibilityContext';
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

const Stack = createNativeStackNavigator();

import { navigationRef } from './src/navigation/RootNavigation';

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
          </Stack.Navigator>
          <Toast config={toastConfig} />
        </NavigationContainer>
      </ThemeProvider>
    </BadgeProvider>
  );
}

export default function App() {
  return (
    <DeepLinkProvider>
      <LandingProvider>
        <UserProvider>
          <AccessibilityProvider>
            <AppInner />
            <Toast config={toastConfig} />
          </AccessibilityProvider>
        </UserProvider>
      </LandingProvider>
    </DeepLinkProvider>
  );
}
