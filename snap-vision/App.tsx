import { LogBox, Linking } from 'react-native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
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
// import ARIndoorNavScreen from './src/screens/ARIndoorNavScreen';
import QRCodeAdminScreen from './src/screens/QRCodeAdminScreen';

import messaging from '@react-native-firebase/messaging';
import { requestNotificationPermission, getFCMToken } from './src/services/NotificationService';
import notifee, { EventType } from '@notifee/react-native';
import { createDefaultChannel } from './src/services/NotificationService';
import { displayForegroundNotification } from './src/services/NotificationService';
import { setupFCM } from './src/services/NotificationService';
import BluetoothBuildingsScreen from './src/screens/BluetoothBuildingsScreen';
import BluetoothIndoorNavigationScreen from './src/screens/BluetoothIndoorNavigationScreen';
import IndoorNavigationUnavailableScreen from './src/screens/IndoorNavigationUnavailableScreen';
import TimetableScreen from './src/screens/TimetableScreen';
import TimetableBackgroundService from './src/services/TimetableBackgroundService';

import { navigationRef } from './src/navigation/RootNavigation';
LogBox.ignoreLogs([
  'Text strings must be rendered within a <Text> component',
  'VirtualizedLists should never be nested inside plain ScrollViews with the same orientation',
  'Open debugger to view warnings.',
]);
if (__DEV__) {
  require('./ReactotronConfig');
}
const Stack = createNativeStackNavigator();

function AppInner() {
  const { setCoords } = useDeepLink();
  const [pendingDeepLink, setPendingDeepLink] = useState<{ lat?: string; lng?: string } | null>(
    null,
  );
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    // Handle notification presses when app is in foreground/background
    const unsubscribeForeground = notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        try {
          const data = detail.notification?.data || {};
          const entryKey = data.entryKey;
          const action = data.action;

          //console.log('[App] Notification pressed (foreground):', { action, entryKey, data });

          if (entryKey) {
            // Mark notification as opened to prevent in-app popup
            await TimetableBackgroundService.getInstance().markNotificationOpened(entryKey);
          }

          // Handle class popup action
          if (action === 'open_class_popup') {
            //console.log('[App] Handling class popup action');

            const now = new Date();
            const classStartTime = new Date();
            const [hours, minutes] = String(data.startTime).split(':').map(Number);
            classStartTime.setHours(hours, minutes, 0, 0);

            if (now > classStartTime) {
              console.log('[App] Class time has passed, not showing popup');
              return;
            }

            // Store the class data for the popup
            await AsyncStorage.setItem(
              'pendingClassPopup',
              JSON.stringify({
                course: data.course,
                venue: data.venue,
                startTime: data.startTime,
                buildingId: data.buildingId,
                buildingName: data.buildingName,
                lat: data.lat,
                lng: data.lng,
                entryKey: entryKey,
                expiresAt: classStartTime.getTime(),
              }),
            );

            //console.log('[App] Stored pending class popup, navigating to Map');

            // Use the same navigation pattern as login/register (replace instead of navigate)
            if (navigationRef.current) {
              navigationRef.current.reset({
                index: 0,
                routes: [
                  {
                    name: 'Tabs',
                    params: {
                      screen: 'Map',
                      params: {
                        fromNotification: true,
                        course: data.course,
                        venue: data.venue,
                        startTime: data.startTime,
                        lat: data.lat,
                        lng: data.lng,
                      },
                    },
                  },
                ],
              });
            }
          } else {
            // Handle regular deep links using the existing deep link system
            const lat = data.lat;
            const lng = data.lng;
            if (lat && lng) {
              // Use the deep link context like location sharing does
              setCoords({ lat, lng });
              if (navigationRef.current) {
                navigationRef.current.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'Tabs',
                      params: {
                        screen: 'Map',
                        params: { lat, lng },
                      },
                    },
                  ],
                });
              }
            }
          }

          // Cancel the tapped notification
          if (detail.notification?.id) {
            await notifee.cancelNotification(detail.notification.id);
          }
        } catch (e) {
          //console.error('[App] notifee foreground press handler error:', e);
        }
      }
    });

    return () => {
      unsubscribeForeground();
    };
  }, [setCoords]);

  // Handle background notification events (when app is closed/background)
  useEffect(() => {
    const handleBackgroundEvent = async ({ type, detail }: any) => {
      if (type === EventType.PRESS) {
        try {
          const data = detail.notification?.data || {};
          const entryKey = data.entryKey;
          const action = data.action;

          //console.log('[App] Notification pressed (background):', { action, entryKey, data });

          if (entryKey) {
            await TimetableBackgroundService.getInstance().markNotificationOpened(entryKey);
          }

          // Store for when app opens - use the same pattern as deep links
          if (action === 'open_class_popup') {
            //console.log('[App] Storing class popup data for when app opens');

            // Store both the popup data AND use the deep link system
            await AsyncStorage.setItem(
              'pendingClassPopup',
              JSON.stringify({
                course: data.course,
                venue: data.venue,
                startTime: data.startTime,
                buildingId: data.buildingId,
                buildingName: data.buildingName,
                lat: data.lat,
                lng: data.lng,
                entryKey: entryKey,
              }),
            );

            // Also set the deep link coords so it behaves like location sharing
            if (data.lat && data.lng) {
              await AsyncStorage.setItem(
                'pendingNotificationDeepLink',
                JSON.stringify({
                  lat: data.lat,
                  lng: data.lng,
                  fromNotification: true,
                  course: data.course,
                  venue: data.venue,
                  startTime: data.startTime,
                }),
              );
            }
          } else {
            // Handle regular location deep links
            if (data.lat && data.lng) {
              await AsyncStorage.setItem(
                'pendingNotificationDeepLink',
                JSON.stringify({
                  lat: data.lat,
                  lng: data.lng,
                }),
              );
            }
          }

          if (detail.notification?.id) {
            await notifee.cancelNotification(detail.notification.id);
          }
        } catch (e) {
          //console.error('[App] notifee background press handler error:', e);
        }
      }
    };

    // Set up background event handler
    notifee.onBackgroundEvent(handleBackgroundEvent);
  }, []);

  // Check for pending navigation when app becomes active
  useEffect(() => {
    const checkPendingNavigation = async () => {
      try {
        const pendingDeepLinkData = await AsyncStorage.getItem('pendingNotificationDeepLink');
        if (pendingDeepLinkData) {
          const data = JSON.parse(pendingDeepLinkData);
          await AsyncStorage.removeItem('pendingNotificationDeepLink');

          //console.log('[App] App opened from background notification, setting up navigation');

          // Set the deep link coords
          setCoords({ lat: data.lat, lng: data.lng });

          // Navigate using the same pattern as successful flows
          setTimeout(() => {
            if (navigationRef.current) {
              navigationRef.current.reset({
                index: 0,
                routes: [
                  {
                    name: 'Tabs',
                    params: {
                      screen: 'Map',
                      params: {
                        lat: data.lat,
                        lng: data.lng,
                        fromNotification: data.fromNotification || false,
                        course: data.course,
                        venue: data.venue,
                        startTime: data.startTime,
                      },
                    },
                  },
                ],
              });
            }
          }, 100);
        }
      } catch (error) {
        //console.error('[App] Error checking pending navigation:', error);
      }
    };

    checkPendingNavigation();
  }, [setCoords]);

  // Handle deep link
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      console.log('[App] Deep link received:', url);
      
      // Handle both https:// and snapvision:// schemes
      if (url.includes('/location') || url.includes('snapvision://location')) {
        let query = '';
        
        if (url.includes('snapvision://location')) {
          // Handle custom scheme: snapvision://location?lat=...&lng=...
          const [, queryPart = ''] = url.split('?');
          query = queryPart;
        } else {
          // Handle HTTPS scheme: https://...../location?lat=...&lng=...
          const [, queryPart = ''] = url.split('?');
          query = queryPart;
        }
        
        const params = queryString.parse(query);
        console.log('[App] Location deep link params:', params);
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
    
    console.log('[App] Setting deep link coords:', pendingDeepLink);
    
    // Check if user is logged in
    const currentUser = auth().currentUser;
    if (currentUser) {
      // User is logged in, set coordinates immediately
      setCoords({ lat: pendingDeepLink.lat, lng: pendingDeepLink.lng });
      
      // Navigate to MapScreen
      console.log('[App] Navigating to MapScreen for deep link');
      if (navigationRef.current) {
        navigationRef.current.reset({
          index: 0,
          routes: [
            {
              name: 'Tabs',
              params: {
                screen: 'Map',
                params: {
                  lat: pendingDeepLink.lat,
                  lng: pendingDeepLink.lng,
                },
              },
            },
          ],
        });
      }
    } else {
      // User not logged in, store for after login
      AsyncStorage.setItem('pendingDeepLinkAfterLogin', JSON.stringify(pendingDeepLink));
    }
    
    setPendingDeepLink(null);
  }, [pendingDeepLink, setCoords]);

  // Handle deep links after user logs in
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (user) => {
      if (user) {
        // User just logged in, check for pending deep links
        try {
          const storedDeepLink = await AsyncStorage.getItem('pendingDeepLinkAfterLogin');
          if (storedDeepLink) {
            const coords = JSON.parse(storedDeepLink);
            console.log('[App] Processing stored deep link after login:', coords);
            
            // Remove the stored deep link
            await AsyncStorage.removeItem('pendingDeepLinkAfterLogin');
            
            // Set the coordinates to trigger navigation
            setCoords({ lat: coords.lat, lng: coords.lng });
            
            const navigateToMap = () => {
              console.log('[App] Navigating to MapScreen for stored deep link after login');
              if (navigationRef.current && isNavigationReady) {
                navigationRef.current.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'Tabs',
                      params: {
                        screen: 'Map',
                        params: {
                          lat: coords.lat,
                          lng: coords.lng,
                        },
                      },
                    },
                  ],
                });
              } else {
                console.log('[App] Navigation not ready yet, waiting...');
                // Wait for navigation to be ready
                const checkReady = () => {
                  if (navigationRef.current && isNavigationReady) {
                    navigationRef.current.reset({
                      index: 0,
                      routes: [
                        {
                          name: 'Tabs',
                          params: {
                            screen: 'Map',
                            params: {
                              lat: coords.lat,
                              lng: coords.lng,
                            },
                          },
                        },
                      ],
                    });
                  } else {
                    setTimeout(checkReady, 100);
                  }
                };
                setTimeout(checkReady, 500);
              }
            };
            
            // Small delay to ensure auth flow is complete
            setTimeout(navigateToMap, 1000);
          }
        } catch (error) {
          console.error('[App] Error processing stored deep link:', error);
        }
      }
    });

    return unsubscribe;
  }, [setCoords, isNavigationReady]);

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

  // Start background timetable service
  useEffect(() => {
    const startBackgroundService = async () => {
      try {
        await TimetableBackgroundService.getInstance().start();
      } catch (error) {
        //console.error('[App] Error starting timetable background service:', error);
      }
    };

    startBackgroundService();

    return () => {
      TimetableBackgroundService.getInstance().stop();
    };
  }, []);

  return (
    <BadgeProvider>
      <ThemeProvider>
        <NavigationContainer 
          ref={navigationRef}
          onReady={() => {
            console.log('[App] Navigation is ready');
            setIsNavigationReady(true);
          }}
        >
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
            <Stack.Screen name="Timetable" component={TimetableScreen} />
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
            {/* <Stack.Screen
                name="ARIndoorNav"
                component={ARIndoorNavScreen}
                options={{ headerShown: false }}
              /> */}
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
