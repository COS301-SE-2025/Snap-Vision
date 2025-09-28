import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import AuthorizationService from '../security/AuthorizationService';
import InputValidator from '../security/InputValidator';

const authService = AuthorizationService.getInstance();

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
    // Input validation
    const validLocationId = InputValidator.validateDocumentId(fingerprint.locationId);
    const validBuildingId = InputValidator.validateDocumentId(fingerprint.buildingId);
    const validFloorId = InputValidator.validateDocumentId(fingerprint.floorId);

    if (!validLocationId || !validBuildingId || !validFloorId) {
      throw new Error('Invalid location, building, or floor ID');
    }

    // Authorization check - need building modification access to collect fingerprints
    if (!(await authService.canModifyBuilding(validLocationId, validBuildingId))) {
      throw new Error('Unauthorized: Cannot collect WiFi fingerprints for this location');
    }

    // Scan Wi-Fi networks
    const results = await WifiManager.reScanAndLoadWifiList();

    ////consolelog('WiFi scan results:', results);

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
      locationId: validLocationId,
      buildingId: validBuildingId,
      floorId: validFloorId,
      coordinates: fingerprint.coordinates,
      description: InputValidator.validateText(fingerprint.description) || '',
      type: InputValidator.validateText(fingerprint.type) || 'manual',
      buildingName: fingerprint.buildingName
        ? InputValidator.validateText(fingerprint.buildingName)
        : undefined,
    };

    // Save under: locations/{locationId}/wifiFingerprints
    await firestore().collection(`locations/${validLocationId}/wifiFingerprints`).add(payload);
  } catch (error) {
    ////consoleerror('Failed to collect WiFi fingerprint:', error);
    throw new Error('Failed to save WiFi fingerprint to database');
  }
}

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
    // Input validation
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validBuildingId = InputValidator.validateDocumentId(buildingId);
    const validFloorId = InputValidator.validateDocumentId(floorId);

    if (!validLocationId || !validBuildingId || !validFloorId) {
      throw new Error('Invalid location, building, or floor ID');
    }

    // Authorization check - need building modification access to delete fingerprints
    if (!(await authService.canModifyBuilding(validLocationId, validBuildingId))) {
      throw new Error('Unauthorized: Cannot delete WiFi fingerprints for this location');
    }

    const snapshot = await firestore()
      .collection(`locations/${validLocationId}/wifiFingerprints`)
      .where('buildingId', '==', validBuildingId)
      .where('floorId', '==', validFloorId)
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
    ////consoleerror('Failed to delete WiFi fingerprint:', error);
    throw new Error('Failed to delete WiFi fingerprint from database');
  }
}
