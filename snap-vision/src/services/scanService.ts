import WifiManager from 'react-native-wifi-reborn';
import { Platform } from 'react-native';
import { PermissionService } from './PermissionService';

export async function scanForWiFiNetworks() {
  try {
    // Check if WifiManager is available
    if (!WifiManager) {
      console.error('WifiManager is not available');
      return [];
    }

    // Check platform
    if (Platform.OS !== 'android') {
      console.warn('WiFi scanning is only supported on Android');
      return [];
    }

    // Request permissions first
    const permissionService = PermissionService.getInstance();
    const hasPermissions = await permissionService.requestWiFiPermissions();
    
    if (!hasPermissions) {
      console.warn('WiFi permissions not granted');
      return [];
    }

    // Check if WiFi is enabled
    const isWifiEnabled = await WifiManager.isEnabled();
    if (!isWifiEnabled) {
      console.warn('WiFi is not enabled on device');
      return [];
    }

    console.log('Starting WiFi scan...');
    const results = await WifiManager.reScanAndLoadWifiList();
    console.log('WiFi scan results:', results);

    if (!results || !Array.isArray(results)) {
      console.warn("WiFi scan returned invalid data:", typeof results, results);
      return [];
    }

    const mappedResults = results
      .filter((wifi: any) => wifi && typeof wifi === 'object')
      .map((wifi: any) => ({
        SSID: String(wifi.SSID || ''),
        BSSID: String(wifi.BSSID || ''),
        level: Number(wifi.level) || 0,
        frequency: Number(wifi.frequency) || 0,
      }))
      .filter((wifi: any) => wifi.SSID && wifi.BSSID);

    console.log('Mapped WiFi results:', mappedResults.length, 'networks found');
    return mappedResults;

  } catch (error) {
    console.error("Wi-Fi scan failed:", error);
    
    if (error instanceof Error) {
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return [];
  }
}