import WifiManager from 'react-native-wifi-reborn';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';
import { PermissionService } from './PermissionService';

export interface WiFiNetwork {
  SSID: string;
  BSSID: string;
  level: number;
  frequency?: number;
}

export interface WiFiFingerprint {
  id: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  description: string;
  wifiNetworks: WiFiNetwork[];
  timestamp: Date;
  roomId?: string;
  roomName?: string;
  type: 'room_center' | 'corridor_point' | 'junction' | 'doorway';
}

export interface PositionEstimate {
  coordinates: { x: number; y: number };
  confidence: number;
  roomId?: string;
  roomName?: string;
  description?: string;
  matchedFingerprint?: string;
}

export interface BuildingFingerprintStats {
  totalFloors: number;
  totalFingerprints: number;
  fingerprintsByFloor: { [floorId: string]: number };
}

export class WiFiPositioningService {
  private static instance: WiFiPositioningService;
  private fingerprints: Map<string, WiFiFingerprint[]> = new Map();

  static getInstance(): WiFiPositioningService {
    if (!WiFiPositioningService.instance) {
      WiFiPositioningService.instance = new WiFiPositioningService();
    }
    return WiFiPositioningService.instance;
  }

  // Check and request necessary permissions
  async requestPermissions(): Promise<boolean> {
    try {
      const permissionService = PermissionService.getInstance();
      return await permissionService.requestWiFiPermissions();
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }

  // Scan for WiFi networks
  async scanWiFiNetworks(): Promise<WiFiNetwork[]> {
    try {
      // Check permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission required for WiFi scanning');
      }

      // Enable WiFi if disabled
      await WifiManager.setEnabled(true);

      // Start WiFi scan
      await WifiManager.reScanAndLoadWifiList();

      // Wait for scan to complete
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get scan results
      const wifiArray = await WifiManager.loadWifiList();

      // Filter and format networks
      const formattedNetworks = wifiArray
        .filter((network) => network.SSID && network.BSSID) // Valid networks only
        .map((network) => ({
          SSID: network.SSID,
          BSSID: network.BSSID,
          level: network.level || -100,
          frequency: network.frequency || 0,
        }))
        .sort((a, b) => b.level - a.level); // Sort by signal strength

      console.log(`WiFi scan found ${formattedNetworks.length} networks`);
      return formattedNetworks;
    } catch (error) {
      console.error('WiFi scan failed:', error);
      const errorMessage =
        typeof error === 'object' && error !== null && 'message' in error
          ? (error as { message: string }).message
          : String(error);
      throw new Error('Failed to scan WiFi networks: ' + errorMessage);
    }
  }

  // Collect WiFi fingerprint at current location
  async collectFingerprint(
    buildingId: string,
    floorId: string,
    coordinates: { x: number; y: number },
    description: string,
    options: {
      roomId?: string;
      roomName?: string;
      type?: 'room_center' | 'corridor_point' | 'junction' | 'doorway';
    } = {},
  ): Promise<WiFiFingerprint> {
    try {
      const wifiNetworks = await this.scanWiFiNetworks();

      const fingerprint: WiFiFingerprint = {
        id: `wifi_${buildingId}_${floorId}_${Date.now()}`,
        buildingId,
        floorId,
        coordinates,
        description,
        wifiNetworks,
        timestamp: new Date(),
        roomId: options.roomId,
        roomName: options.roomName,
        type: options.type || 'corridor_point',
      };

      // Save to Firestore
      await this.saveFingerprint(fingerprint);

      // Update local cache
      const buildingKey = `${buildingId}_${floorId}`;
      if (!this.fingerprints.has(buildingKey)) {
        this.fingerprints.set(buildingKey, []);
      }
      this.fingerprints.get(buildingKey)!.push(fingerprint);

      console.log(`WiFi fingerprint collected: ${description}`);
      return fingerprint;
    } catch (error) {
      console.error('Failed to collect WiFi fingerprint:', error);
      throw error;
    }
  }

  // Save fingerprint to Firestore
  private async saveFingerprint(fingerprint: WiFiFingerprint): Promise<void> {
    try {
      await firestore()
        .collection('WiFiFingerprints')
        .doc(fingerprint.id)
        .set({
          ...fingerprint,
          timestamp: firestore.FieldValue.serverTimestamp(),
        });

      console.log('WiFi fingerprint saved to Firestore');
    } catch (error) {
      console.error('Failed to save fingerprint to Firestore:', error);
      throw new Error('Failed to save WiFi fingerprint to database');
    }
  }

  // Load stored fingerprints for a building/floor
  async loadFingerprints(buildingId: string, floorId?: string): Promise<void> {
    try {
      let query = firestore().collection('WiFiFingerprints').where('buildingId', '==', buildingId);

      if (floorId) {
        query = query.where('floorId', '==', floorId);
      }

      const snapshot = await query.get();

      const fingerprintsByFloor = new Map<string, WiFiFingerprint[]>();

      snapshot.docs.forEach((doc) => {
        const data = doc.data() as WiFiFingerprint;
        const buildingKey = `${data.buildingId}_${data.floorId}`;

        if (!fingerprintsByFloor.has(buildingKey)) {
          fingerprintsByFloor.set(buildingKey, []);
        }
        fingerprintsByFloor.get(buildingKey)!.push(data);
      });

      // Update cache
      fingerprintsByFloor.forEach((fingerprints, key) => {
        this.fingerprints.set(key, fingerprints);
      });

      const totalFingerprints = Array.from(fingerprintsByFloor.values()).reduce(
        (sum, arr) => sum + arr.length,
        0,
      );

      console.log(`Loaded ${totalFingerprints} WiFi fingerprints for building ${buildingId}`);
    } catch (error) {
      console.error('Failed to load fingerprints:', error);
      throw error;
    }
  }

  // Estimate current position based on WiFi signals
  async estimatePosition(buildingId: string, floorId: string): Promise<PositionEstimate | null> {
    try {
      // Get current WiFi signals
      const currentNetworks = await this.scanWiFiNetworks();
      if (currentNetworks.length === 0) {
        console.warn('No WiFi networks detected for positioning');
        return null;
      }

      // Ensure fingerprints are loaded
      const buildingKey = `${buildingId}_${floorId}`;
      if (!this.fingerprints.has(buildingKey)) {
        await this.loadFingerprints(buildingId, floorId);
      }

      const storedFingerprints = this.fingerprints.get(buildingKey) || [];
      if (storedFingerprints.length === 0) {
        console.warn('No stored fingerprints found for positioning');
        return null;
      }

      // Find best matching fingerprint
      let bestMatch: WiFiFingerprint | null = null;
      let highestSimilarity = 0;

      for (const fingerprint of storedFingerprints) {
        const similarity = this.calculateWiFiSimilarity(currentNetworks, fingerprint.wifiNetworks);

        console.log(`Similarity with ${fingerprint.description}: ${similarity.toFixed(3)}`);

        if (similarity > highestSimilarity) {
          highestSimilarity = similarity;
          bestMatch = fingerprint;
        }
      }

      // Only return if confidence is above threshold
      if (highestSimilarity < 0.4) {
        console.warn(`Best similarity (${highestSimilarity.toFixed(3)}) below threshold`);
        return null;
      }

      const estimate: PositionEstimate = {
        coordinates: bestMatch!.coordinates,
        confidence: highestSimilarity,
        roomId: bestMatch!.roomId,
        roomName: bestMatch!.roomName,
        description: bestMatch!.description,
        matchedFingerprint: bestMatch!.id,
      };

      console.log(
        `Position estimated: ${bestMatch!.description} (confidence: ${highestSimilarity.toFixed(3)})`,
      );
      return estimate;
    } catch (error) {
      console.error('Position estimation failed:', error);
      return null;
    }
  }

  // Calculate similarity between current WiFi signals and stored fingerprint
  private calculateWiFiSimilarity(current: WiFiNetwork[], stored: WiFiNetwork[]): number {
    if (current.length === 0 || stored.length === 0) return 0;

    let totalWeight = 0;
    let matchWeight = 0;

    // Create maps for faster lookup
    const currentMap = new Map(current.map((n) => [n.BSSID, n]));
    const storedMap = new Map(stored.map((n) => [n.BSSID, n]));

    // Find common networks
    const commonBSSIDs = Array.from(currentMap.keys()).filter((bssid) => storedMap.has(bssid));

    if (commonBSSIDs.length === 0) return 0;

    // Calculate weighted similarity based on signal strength
    for (const bssid of commonBSSIDs) {
      const currentNetwork = currentMap.get(bssid)!;
      const storedNetwork = storedMap.get(bssid)!;

      // Weight by signal strength (stronger signals are more reliable)
      const weight = Math.abs(Math.max(currentNetwork.level, storedNetwork.level)) / 100;

      // Calculate signal strength similarity (0-1)
      const signalDiff = Math.abs(currentNetwork.level - storedNetwork.level);
      const signalSimilarity = Math.max(0, 1 - signalDiff / 40); // 40dBm difference = 0 similarity

      matchWeight += signalSimilarity * weight;
      totalWeight += weight;
    }

    // Include penalty for networks that appear/disappear
    const currentOnlyCount = current.length - commonBSSIDs.length;
    const storedOnlyCount = stored.length - commonBSSIDs.length;
    const networkPenalty =
      (currentOnlyCount + storedOnlyCount) / Math.max(current.length, stored.length);

    const baseSimilarity = totalWeight > 0 ? matchWeight / totalWeight : 0;
    const finalSimilarity = baseSimilarity * (1 - networkPenalty * 0.3); // 30% penalty for missing/extra networks

    return Math.max(0, Math.min(1, finalSimilarity));
  }

  // Get fingerprint statistics for a building
  async getFingerprintStats(
    buildingId: string,
    floorId?: string,
  ): Promise<{
    totalFingerprints: number;
    fingerprintsByType: { [key: string]: number };
    fingerprintsByFloor: { [key: string]: number };
    averageNetworksPerFingerprint: number;
  }> {
    await this.loadFingerprints(buildingId, floorId);

    const allFingerprints: WiFiFingerprint[] = [];

    for (const [key, fingerprints] of this.fingerprints.entries()) {
      if (key.startsWith(buildingId)) {
        allFingerprints.push(...fingerprints);
      }
    }

    const stats = {
      totalFingerprints: allFingerprints.length,
      fingerprintsByType: {} as { [key: string]: number },
      fingerprintsByFloor: {} as { [key: string]: number },
      averageNetworksPerFingerprint: 0,
    };

    let totalNetworks = 0;

    for (const fingerprint of allFingerprints) {
      // Count by type
      stats.fingerprintsByType[fingerprint.type] =
        (stats.fingerprintsByType[fingerprint.type] || 0) + 1;

      // Count by floor
      stats.fingerprintsByFloor[fingerprint.floorId] =
        (stats.fingerprintsByFloor[fingerprint.floorId] || 0) + 1;

      totalNetworks += fingerprint.wifiNetworks.length;
    }

    stats.averageNetworksPerFingerprint =
      allFingerprints.length > 0 ? totalNetworks / allFingerprints.length : 0;

    return stats;
  }

  // Clear fingerprints from cache and optionally from database
  async clearFingerprints(
    buildingId: string,
    floorId?: string,
    fromDatabase = false,
  ): Promise<void> {
    if (fromDatabase) {
      try {
        let query = firestore()
          .collection('WiFiFingerprints')
          .where('buildingId', '==', buildingId);

        if (floorId) {
          query = query.where('floorId', '==', floorId);
        }

        const snapshot = await query.get();
        const batch = firestore().batch();

        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
        console.log(`Deleted ${snapshot.docs.length} fingerprints from database`);
      } catch (error) {
        console.error('Failed to delete fingerprints from database:', error);
        throw error;
      }
    }

    // Clear from cache
    if (floorId) {
      const buildingKey = `${buildingId}_${floorId}`;
      this.fingerprints.delete(buildingKey);
    } else {
      const keysToDelete = Array.from(this.fingerprints.keys()).filter((key) =>
        key.startsWith(buildingId),
      );
      keysToDelete.forEach((key) => this.fingerprints.delete(key));
    }

    console.log('WiFi fingerprints cleared from cache');
  }

  // Get fingerprints for a specific building and floor
  async getFingerprints(buildingId: string, floorId: string): Promise<WiFiFingerprint[]> {
    const buildingKey = `${buildingId}_${floorId}`;

    // Load from database if not in cache
    if (!this.fingerprints.has(buildingKey)) {
      await this.loadFingerprints(buildingId, floorId);
    }

    return this.fingerprints.get(buildingKey) || [];
  }

  // Get building fingerprint statistics
  async getBuildingFingerprintStats(buildingId: string): Promise<BuildingFingerprintStats> {
    await this.loadFingerprints(buildingId);

    const stats: BuildingFingerprintStats = {
      totalFloors: 0,
      totalFingerprints: 0,
      fingerprintsByFloor: {},
    };

    // Count fingerprints by floor
    for (const [key, fingerprints] of this.fingerprints.entries()) {
      if (key.startsWith(buildingId)) {
        const floorId = key.split('_')[1];
        stats.fingerprintsByFloor[floorId] = fingerprints.length;
        stats.totalFingerprints += fingerprints.length;
        stats.totalFloors++;
      }
    }

    return stats;
  }

  // Get current position estimate
  async getCurrentPosition(buildingId: string, floorId: string): Promise<PositionEstimate> {
    const estimate = await this.estimatePosition(buildingId, floorId);
    if (!estimate) {
      throw new Error(
        'Unable to determine current position. No WiFi networks found or no matching fingerprints.',
      );
    }
    return estimate;
  }

  // Delete a specific fingerprint
  async deleteFingerprint(fingerprintId: string): Promise<void> {
    try {
      // Delete from database
      await firestore().collection('WiFiFingerprints').doc(fingerprintId).delete();

      // Remove from cache
      for (const [key, fingerprints] of this.fingerprints.entries()) {
        const index = fingerprints.findIndex((f) => f.id === fingerprintId);
        if (index !== -1) {
          fingerprints.splice(index, 1);
          break;
        }
      }

      console.log('WiFi fingerprint deleted:', fingerprintId);
    } catch (error) {
      console.error('Failed to delete fingerprint:', error);
      throw new Error('Failed to delete WiFi fingerprint');
    }
  }
}

export default WiFiPositioningService;
