import WifiManager from 'react-native-wifi-reborn';

export async function scanForWiFiNetworks() {
  try {
    const results = await WifiManager.reScanAndLoadWifiList();
    console.log('WiFi scan results:', results);

    if (!Array.isArray(results)) {
      console.warn('WiFi scan returned non-array:', results);
      return [];
    }

    return results.map((wifi) => ({
      SSID: wifi.SSID,
      BSSID: wifi.BSSID,
      level: wifi.level,
      frequency: wifi.frequency,
    }));
  } catch (error) {
    console.error('Wi-Fi scan failed:', error);
    return [];
  }
}
