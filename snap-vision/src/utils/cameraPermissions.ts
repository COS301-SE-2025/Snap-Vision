// src/utils/cameraPermissions.ts
import { PermissionsAndroid, Platform, Alert } from 'react-native';

export const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: 'Camera Permission',
        message: 'Snap Vision needs camera access for AR navigation',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      });

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      } else {
        Alert.alert(
          'Camera Permission Required',
          'AR navigation requires camera access. Please enable camera permission in settings.',
          [{ text: 'OK' }],
        );
        return false;
      }
    } catch (err) {
      console.warn('Camera permission error:', err);
      return false;
    }
  }

  // For iOS, camera permissions are handled automatically by react-native-vision-camera
  return true;
};

export const hasCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      return granted;
    } catch (err) {
      console.warn('Camera permission check error:', err);
      return false;
    }
  }

  return true;
};
