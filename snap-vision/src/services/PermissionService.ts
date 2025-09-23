import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export class PermissionService {
  private static instance: PermissionService;

  public static getInstance(): PermissionService {
    if (!PermissionService.instance) {
      PermissionService.instance = new PermissionService();
    }
    return PermissionService.instance;
  }

  /**
   * Request WiFi and location permissions required for WiFi fingerprinting
   */
  async requestWiFiPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        return await this.requestAndroidWiFiPermissions();
      } else if (Platform.OS === 'ios') {
        return await this.requestIOSLocationPermissions();
      }
      return false;
    } catch (error) {
      //consoleerror('Permission request failed:', error);
      return false;
    }
  }

  /**
   * Request Bluetooth permissions required for beacon scanning
   */
  async requestBluetoothPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        return await this.requestAndroidBluetoothPermissions();
      } else if (Platform.OS === 'ios') {
        return await this.requestIOSBluetoothPermissions();
      }
      return false;
    } catch (error) {
      console.error('Bluetooth permission request failed:', error);
      return false;
    }
  }

  /**
   * Check if all required WiFi permissions are granted
   */
  async checkWiFiPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        return await this.checkAndroidWiFiPermissions();
      } else if (Platform.OS === 'ios') {
        return await this.checkIOSLocationPermissions();
      }
      return false;
    } catch (error) {
      //consoleerror('Permission check failed:', error);
      return false;
    }
  }

  /**
   * Check if all required Bluetooth permissions are granted
   */
  async checkBluetoothPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        return await this.checkAndroidBluetoothPermissions();
      } else if (Platform.OS === 'ios') {
        return await this.checkIOSBluetoothPermissions();
      }
      return false;
    } catch (error) {
      console.error('Bluetooth permission check failed:', error);
      return false;
    }
  }

  /**
   * Request WiFi and location permissions on Android
   */
  private async requestAndroidWiFiPermissions(): Promise<boolean> {
    try {
      // Check Android version for permission requirements
      const androidVersion = Platform.Version as number;
      const permissions: string[] = [];

      // Location permissions (required for WiFi scanning on Android 6+)
      permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);

      // WiFi state permissions
      if (androidVersion >= 23) {
        permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
      }

      if (androidVersion >= 33) {
        permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
      }

      const results = await PermissionsAndroid.requestMultiple(permissions);

      const allGranted = permissions.every(
        (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED,
      );

      if (!allGranted) {
        Alert.alert(
          'Permissions Required',
          'WiFi positioning requires location permissions to scan for nearby networks. Please enable location permissions in your device settings.',
          [{ text: 'OK' }],
        );
        return false;
      }

      return true;
    } catch (error) {
      //consoleerror('Android permission request failed:', error);
      return false;
    }
  }

  /**
   * Check WiFi and location permissions on Android
   */
  private async checkAndroidWiFiPermissions(): Promise<boolean> {
    try {
      const fineLocationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      const coarseLocationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      );

      // Check NEARBY_WIFI_DEVICES only on Android 13+
      const androidVersion = Platform.Version as number;
      let nearbyWiFiDevices = true; // Default to true for older versions

      if (androidVersion >= 33) {
        nearbyWiFiDevices = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
        );
      }

      return fineLocationGranted && coarseLocationGranted && nearbyWiFiDevices;
    } catch (error) {
      //consoleerror('Android permission check failed:', error);
      return false;
    }
  }

  /**
   * Request location permissions on iOS (required for WiFi scanning)
   */
  private async requestIOSLocationPermissions(): Promise<boolean> {
    try {
      const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);

      if (result === RESULTS.GRANTED) {
        return true;
      }

      Alert.alert(
        'Location Permission Required',
        'WiFi positioning requires location permission to scan for nearby networks. Please enable location access in Settings.',
        [{ text: 'OK' }],
      );

      return false;
    } catch (error) {
      //consoleerror('iOS permission request failed:', error);
      return false;
    }
  }

  /**
   * Check location permissions on iOS
   */
  private async checkIOSLocationPermissions(): Promise<boolean> {
    try {
      const result = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      return result === RESULTS.GRANTED;
    } catch (error) {
      //consoleerror('iOS permission check failed:', error);
      return false;
    }
  }

  /**
   * Request Bluetooth permissions on Android
   */
  private async requestAndroidBluetoothPermissions(): Promise<boolean> {
    try {
      const androidVersion = Platform.Version as number;
      const permissions: (keyof typeof PermissionsAndroid.PERMISSIONS)[] = [];

      // Location permission is required for Bluetooth scanning
      permissions.push('ACCESS_FINE_LOCATION');

      // Bluetooth permissions for Android 12+ (API 31+)
      if (androidVersion >= 31) {
        permissions.push('BLUETOOTH_SCAN');
        permissions.push('BLUETOOTH_CONNECT');
      }

      const permissionStrings = permissions.map((p) => PermissionsAndroid.PERMISSIONS[p]);
      const results = await PermissionsAndroid.requestMultiple(permissionStrings);

      const allGranted = permissionStrings.every(
        (permission) => results[permission] === PermissionsAndroid.RESULTS.GRANTED,
      );

      if (!allGranted) {
        Alert.alert(
          'Bluetooth Permissions Required',
          'Bluetooth beacon scanning requires location and Bluetooth permissions. Please enable these permissions in your device settings.',
          [{ text: 'OK' }],
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Android Bluetooth permission request failed:', error);
      return false;
    }
  }

  /**
   * Check Bluetooth permissions on Android
   */
  private async checkAndroidBluetoothPermissions(): Promise<boolean> {
    try {
      const androidVersion = Platform.Version as number;

      // Location permission check
      const fineLocationGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );

      if (!fineLocationGranted) {
        return false;
      }

      // Bluetooth permission checks based on Android version
      if (androidVersion >= 31) {
        const bluetoothScanGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        );
        const bluetoothConnectGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        );
        return bluetoothScanGranted && bluetoothConnectGranted;
      } else {
        // For older Android versions, we mainly need location permission
        // and the manifest permissions should be sufficient
        return true;
      }
    } catch (error) {
      console.error('Android Bluetooth permission check failed:', error);
      return false;
    }
  }

  /**
   * Request Bluetooth permissions on iOS
   */
  private async requestIOSBluetoothPermissions(): Promise<boolean> {
    try {
      // iOS doesn't require explicit Bluetooth permissions for scanning
      // but location permission is still needed
      const locationResult = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);

      if (locationResult === RESULTS.GRANTED) {
        return true;
      }

      Alert.alert(
        'Location Permission Required',
        'Bluetooth beacon scanning requires location permission. Please enable location access in Settings.',
        [{ text: 'OK' }],
      );

      return false;
    } catch (error) {
      console.error('iOS Bluetooth permission request failed:', error);
      return false;
    }
  }

  /**
   * Check Bluetooth permissions on iOS
   */
  private async checkIOSBluetoothPermissions(): Promise<boolean> {
    try {
      const result = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('iOS Bluetooth permission check failed:', error);
      return false;
    }
  }

  /**
   * Show permission explanation dialog
   */
  showPermissionExplanation(): void {
    Alert.alert(
      'WiFi Positioning Permissions',
      'This app uses WiFi fingerprinting for indoor positioning. To scan for nearby WiFi networks, we need location permissions.\n\nYour location data is only used locally for positioning and is not shared.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Grant Permissions', onPress: () => this.requestWiFiPermissions() },
      ],
    );
  }

  /**
   * Show Bluetooth permission explanation dialog
   */
  showBluetoothPermissionExplanation(): void {
    Alert.alert(
      'Bluetooth Beacon Scanning Permissions',
      'This app uses Bluetooth beacon scanning for indoor positioning. To scan for nearby Bluetooth beacons, we need location and Bluetooth permissions.\n\nYour location data is only used locally for positioning and is not shared.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Grant Permissions', onPress: () => this.requestBluetoothPermissions() },
      ],
    );
  }
}
