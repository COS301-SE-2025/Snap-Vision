import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';
import WifiManager from 'react-native-wifi-reborn';

interface FingerprintData {
  locationId: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  description: string;
  type: string;
}

export async function collectWiFiFingerprint(
  fingerprint: FingerprintData
): Promise<void> {
  try {
    // Scan Wi-Fi networks
    const results = await WifiManager.reScanAndLoadWifiList();

    // Structure data
    const wifiSignals = results.map((wifi) => ({
      SSID: wifi.SSID,
      BSSID: wifi.BSSID,
      level: wifi.level, // signal strength
      frequency: wifi.frequency,
    }));

    const payload = {
      timestamp: Date.now(),
      wifiSignals,
      ...fingerprint,
    };

    // Save under: locations/{locationId}/wifiFingerprints
    await firestore()
      .collection(`locations/${fingerprint.locationId}/wifiFingerprints`)
      .add(payload);
  } catch (error) {
    console.error('Failed to collect WiFi fingerprint:', error);
    throw new Error('Failed to save WiFi fingerprint to database');
  }
}
