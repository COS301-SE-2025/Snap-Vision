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
  buildingName?: string;
}

export async function collectWiFiFingerprint(fingerprint: FingerprintData): Promise<void> {
  try {
    // Scan Wi-Fi networks
    const results = await WifiManager.reScanAndLoadWifiList();

    //consolelog('WiFi scan results:', results);

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
    //consoleerror('Failed to collect WiFi fingerprint:', error);
    throw new Error('Failed to save WiFi fingerprint to database');
  }
}

// NEW: Delete WiFi fingerprint at matching location/building/floor/coords
export async function deleteWiFiFingerprint({
  locationId,
  buildingId,
  floorId,
  coordinates,
}: {
  locationId: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
}): Promise<void> {
  try {
    const snapshot = await firestore()
      .collection(`locations/${locationId}/wifiFingerprints`)
      .where('buildingId', '==', buildingId)
      .where('floorId', '==', floorId)
      .get();

    const docsToDelete = snapshot.docs.filter((doc) => {
      const data = doc.data();
      const epsilon = 0.001;
      return (
        Math.abs(data.coordinates?.x - coordinates.x) < epsilon &&
        Math.abs(data.coordinates?.y - coordinates.y) < epsilon
      );
    });

    const batch = firestore().batch();
    docsToDelete.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  } catch (error) {
    //consoleerror('Failed to delete WiFi fingerprint:', error);
    throw new Error('Failed to delete WiFi fingerprint from database');
  }
}
