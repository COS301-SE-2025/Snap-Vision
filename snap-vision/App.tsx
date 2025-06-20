import React, { useEffect, useRef, useState } from 'react';
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
import queryString from 'query-string';
import { NavigationContainerRef } from '@react-navigation/native';
import { DeepLinkProvider, useDeepLink } from './src/DeepLinkContext';
import auth from '@react-native-firebase/auth';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import { navigationRef } from './src/navigation/RootNavigation';

const Stack = createNativeStackNavigator();

function AppInner() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const { setCoords } = useDeepLink();
  const [authReady, setAuthReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Tabs'>('Login');
  const [pendingDeepLink, setPendingDeepLink] = useState<{ lat?: string; lng?: string } | null>(null);

  // Listen for auth state
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setInitialRoute(user ? 'Tabs' : 'Login');
      setAuthReady(true); // Only render navigator after this
    });
    return unsubscribe;
  }, []);

  // if(!authReady) return null;

  // Handle deep link only after auth is ready
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url.includes('/location')) {
        const [, query = ''] = url.split('?');
        const params = queryString.parse(query);

        // Save the deep link params until auth is ready
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
  
    // When auth is ready and there's a pending deep link, handle navigation
    useEffect(() => {
      if (!authReady || !pendingDeepLink) return;
  
      if (auth().currentUser) {
        // User is already logged in, navigate directly to Map with coordinates
        navigationRef.current?.navigate('Tabs', {
          screen: 'Map',
          params: {
            lat: pendingDeepLink.lat,
            lng: pendingDeepLink.lng,
          },
        });
      } else {
        // User is not logged in, save coords and go to Login screen
        setCoords({ lat: pendingDeepLink.lat, lng: pendingDeepLink.lng });
        navigationRef.current?.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
      setPendingDeepLink(null);
    }, [authReady, pendingDeepLink, setCoords]);

  return (
    <ThemeProvider>
      <NavigationContainer ref={navigationRef}>
        {authReady && (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {initialRoute === 'Tabs' ? (
            <Stack.Screen name="Tabs" component={BottomTabs} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
          <Stack.Screen name="Register" component={RegistrationScreen} />
          <Stack.Screen name="AdminLoadFloorplans" component={AdminLoadFloorplansScreen} />
          <Stack.Screen name="AdminEditFloorplans" component={AdminEditFloorplansScreen} />
          <Stack.Screen name="AdminSettings" component={AdminSettingsFrom} />
          <Stack.Screen name="AdminManageUsers" component={ManageUsersScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
      )}
      </NavigationContainer>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <DeepLinkProvider>
      <AppInner />
    </DeepLinkProvider>
  );
}