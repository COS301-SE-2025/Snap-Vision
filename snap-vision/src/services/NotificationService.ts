import messaging from '@react-native-firebase/messaging';

/**
 * Requests notification permission from the user.
 * @returns {Promise<boolean>} true if permission granted, false otherwise
 */
export async function requestNotificationPermission(): Promise<boolean> {
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
    console.warn('Failed to get FCM token:', e);
    return null;
  }
}