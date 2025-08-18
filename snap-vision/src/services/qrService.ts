// src/services/qrService.ts
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export interface QRCodeMapping {
  id: string;
  qrValue: string;
  roomId: string;
  buildingId: string;
  buildingName?: string;
  floorId: string; // <- matches floorplan doc ID (e.g., "1", "G")
  locationId: string;
  locationName?: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  createdBy: string;
  description?: string;
  roomName?: string;
}

export interface LocationLite {
  id: string;
  name: string;
}

export interface BuildingLite {
  id: string;
  name: string;
}

export interface FloorLite {
  id: string; // floorplan doc ID
  name: string; // display label: floorLabel || id
}

export interface RoomLite {
  id: string;
  name: string;
  floorId?: string;
  floorLabel?: string;
  buildingId?: string;
  buildingName?: string;
}

/**
 * Create a new QR code mapping
 * Stores in: locations/{locationId}/qrCodes/{qrId}
 */
export const createQRCodeMapping = async (
  locationId: string,
  locationName: string,
  buildingId: string,
  buildingName: string,
  floorId: string, // MUST be the floorplan doc ID
  roomId: string,
  roomName: string,
  qrValue: string,
  description?: string,
): Promise<QRCodeMapping> => {
  try {
    const userId = auth().currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const qrRef = firestore().collection('locations').doc(locationId).collection('qrCodes').doc();

    const qrData: QRCodeMapping = {
      id: qrRef.id,
      qrValue,
      locationId,
      locationName,
      buildingId,
      buildingName,
      floorId, // store floorplan doc ID
      roomId,
      roomName,
      createdAt: firestore.Timestamp.now(),
      createdBy: userId,
      description,
    };

    await qrRef.set(qrData);
    return qrData;
  } catch (error) {
    console.error('Error creating QR code mapping:', error);
    throw error;
  }
};

/**
 * Get QR code mapping by QR code value (search per location)
 * (Could also be a collectionGroup query on 'qrCodes' if needed)
 */
export const getQRCodeMappingByValue = async (qrValue: string): Promise<QRCodeMapping | null> => {
  try {
    const locationsSnapshot = await firestore().collection('locations').get();

    for (const locationDoc of locationsSnapshot.docs) {
      const locationId = locationDoc.id;
      const qrSnapshot = await firestore()
        .collection('locations')
        .doc(locationId)
        .collection('qrCodes')
        .where('qrValue', '==', qrValue)
        .limit(1)
        .get();

      if (!qrSnapshot.empty) {
        const doc = qrSnapshot.docs[0];
        return { id: doc.id, ...(doc.data() as QRCodeMapping) };
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting QR code mapping:', error);
    throw error;
  }
};

/** Get all locations for dropdown selection */
export const getLocations = async (): Promise<LocationLite[]> => {
  try {
    const snapshot = await firestore().collection('locations').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data() as any).name ?? doc.id,
    }));
  } catch (error) {
    console.error('Error getting locations:', error);
    throw error;
  }
};

/** Get all buildings for a location */
export const getBuildingsForLocation = async (locationId: string): Promise<BuildingLite[]> => {
  try {
    const buildingsSnapshot = await firestore()
      .collection('locations')
      .doc(locationId)
      .collection('buildingPOIs')
      .get();

    return buildingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data() as any).name ?? doc.id,
    }));
  } catch (error) {
    console.error('Error getting buildings for location:', error);
    throw error;
  }
};

/**
 * Get floors for a building from floorplans:
 * locations/{locationId}/buildingPOIs/{buildingId}/floorplans/{<floorId>}
 * Each doc may have { floorLabel, downloadURL, ... }
 */
export const getFloorsForBuilding = async (
  locationId: string,
  buildingId: string,
): Promise<FloorLite[]> => {
  try {
    const col = firestore()
      .collection('locations')
      .doc(locationId)
      .collection('buildingPOIs')
      .doc(buildingId)
      .collection('floorplans');

    // Prefer order by floorLabel if present; fall back to unsorted get
    let snap: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>;
    try {
      snap = await col.orderBy('floorLabel', 'asc').get();
    } catch {
      snap = await col.get();
    }

    const floors = snap.docs.map((d) => {
      const data = d.data() as any;
      const label = (data && (data.floorLabel ?? data.name)) || d.id;
      return { id: d.id, name: String(label) };
    });

    return floors;
  } catch (error) {
    console.error('Error getting floors for building:', error);
    throw error;
  }
};

/**
 * Get rooms on a given floor for a building.
 * Rooms are in: locations/{locationId}/roomPOIs
 * We try to match floor by:
 *   - room.floorId === floorId (preferred, store floorplan doc ID)
 *   - OR room.floorLevel === floorId
 *   - OR room.floorLabel === floorId
 */
export const getRoomsForFloor = async (
  locationId: string,
  buildingId: string,
  floorId: string,
): Promise<RoomLite[]> => {
  try {
    // First, fetch all rooms for the location & building (index-friendly)
    const roomsSnapshot = await firestore()
      .collection('locations')
      .doc(locationId)
      .collection('roomPOIs')
      .where('buildingId', '==', buildingId)
      .get();

    // Then filter by any floor field that matches the chosen floorId
    const rooms = roomsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .filter((r) => {
        // Normalize to strings for safe comparison
        const rFloorId = r.floorId != null ? String(r.floorId) : undefined;
        const rFloorLevel = r.floorLevel != null ? String(r.floorLevel) : undefined;
        const rFloorLabel = r.floorLabel != null ? String(r.floorLabel) : undefined;
        const target = String(floorId);
        return rFloorId === target || rFloorLevel === target || rFloorLabel === target;
      })
      .map<RoomLite>((r) => ({
        id: r.id,
        name: r.name ?? r.roomName ?? r.id,
        buildingId: r.buildingId,
        buildingName: r.buildingName,
        floorId: r.floorId ?? r.floorLevel ?? r.floorLabel,
        floorLabel: r.floorLabel ?? r.floorLevel ?? r.floorId,
      }));

    return rooms;
  } catch (error) {
    console.error('Error getting rooms for floor:', error);
    throw error;
  }
};

/**
 * Get all QR codes for a specific building within a location
 */
export const getQRCodesForBuilding = async (
  locationId: string,
  buildingId: string,
): Promise<QRCodeMapping[]> => {
  try {
    const snapshot = await firestore()
      .collection('locations')
      .doc(locationId)
      .collection('qrCodes')
      .where('buildingId', '==', buildingId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as QRCodeMapping);
  } catch (error) {
    console.error('Error getting QR codes for building:', error);
    throw error;
  }
};

/** Delete a QR code mapping */
export const deleteQRCodeMapping = async (
  locationId: string,
  qrCodeId: string,
): Promise<boolean> => {
  try {
    await firestore()
      .collection('locations')
      .doc(locationId)
      .collection('qrCodes')
      .doc(qrCodeId)
      .delete();
    return true;
  } catch (error) {
    console.error('Error deleting QR code mapping:', error);
    throw error;
  }
};

/** Update a QR code mapping */
export const updateQRCodeMapping = async (
  locationId: string,
  qrCodeId: string,
  updates: Partial<QRCodeMapping>,
): Promise<boolean> => {
  try {
    await firestore()
      .collection('locations')
      .doc(locationId)
      .collection('qrCodes')
      .doc(qrCodeId)
      .update(updates);
    return true;
  } catch (error) {
    console.error('Error updating QR code mapping:', error);
    throw error;
  }
};
