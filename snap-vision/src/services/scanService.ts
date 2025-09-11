import WifiManager from 'react-native-wifi-reborn';

export async function scanForWiFiNetworks() {
  try {
    const results = await WifiManager.reScanAndLoadWifiList();
    //consolelog('WiFi scan results:', results);

    if (!Array.isArray(results)) {
      //consolewarn('WiFi scan returned non-array:', results);
      return [];
    }

    return results.map((wifi) => ({
      SSID: wifi.SSID,
      BSSID: wifi.BSSID,
      level: wifi.level,
      frequency: wifi.frequency,
    }));
  } catch (error) {
    //consoleerror('Wi-Fi scan failed:', error);
    return [];
  }
}
