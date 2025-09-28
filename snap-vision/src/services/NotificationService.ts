import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Platform, PermissionsAndroid } from 'react-native';
import AuthorizationService from '../security/AuthorizationService';
import InputValidator from '../security/InputValidator';

const authService = AuthorizationService.getInstance();

/**
 * Requests notification permission from the user.
 * @returns {Promise<boolean>} true if permission granted, false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // For Android 13+ (API 33+), request POST_NOTIFICATIONS permission first
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }
  }

  // Request Firebase messaging permission
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

/**
 * Retrieves the FCM token for this device.
 * @returns {Promise<string | null>} The FCM token, or null if failed
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await messaging().getToken();
    return token;
  } catch (e) {
    //console.warn('Failed to get FCM token:', e);
    return null;
  }
}
export async function storeFCMToken(token: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Input validation
  const validToken = InputValidator.validateText(token);
  if (!validToken) {
    throw new Error('Invalid FCM token');
  }

  // Authorization check - users can only store their own tokens
  if (!(await authService.canAccessFCMToken(user.uid))) {
    throw new Error('Unauthorized: Cannot store FCM token');
  }

  await firestore()
    .collection('userFCMTokens')
    .doc(user.uid)
    .set({ token: validToken }, { merge: true });
}

export async function setupFCM() {
  const permissionGranted = await requestNotificationPermission();
  if (permissionGranted) {
    const token = await getFCMToken();
    //console.log('FCM Token:', token);
    if (token) {
      await storeFCMToken(token);
    }
  }
}
export async function createDefaultChannel() {
  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
  });
}

export async function displayForegroundNotification(remoteMessage: any) {
  await notifee.displayNotification({
    title: remoteMessage.notification?.title || 'Notification',
    body: remoteMessage.notification?.body || '',
    android: {
      channelId: 'default',
    },
  });
}
