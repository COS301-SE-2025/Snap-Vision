import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AuthorizationService from '../security/AuthorizationService';
import InputValidator from '../security/InputValidator';

const authService = AuthorizationService.getInstance();

export interface QRCodeMapping {
  id: string;
  qrValue: string;
  roomId: string;
  buildingId: string;
  buildingName?: string;
  floorId: string;
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

    // Input validation
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validBuildingId = InputValidator.validateDocumentId(buildingId);
    const validRoomId = InputValidator.validateDocumentId(roomId);
    const validFloorId = InputValidator.validateDocumentId(floorId);
    const validQRValue = InputValidator.validateText(qrValue);

    if (!validLocationId || !validBuildingId || !validRoomId || !validFloorId || !validQRValue) {
      throw new Error('Invalid input parameters');
    }

    // Authorization check - only admins and location editors can create QR codes
    if (!(await authService.canModifyLocation(validLocationId))) {
      throw new Error('Unauthorized: Cannot modify QR codes for this location');
    }

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
    //consoleerror('Error creating QR code mapping:', error);
    throw error;
  }
};

/**
 * Get QR code mapping by QR code value (search per location)
 * (Could also be a collectionGroup query on 'qrCodes' if needed)
 */
export const getQRCodeMappingByValue = async (qrValue: string): Promise<QRCodeMapping | null> => {
  try {
    // Authentication check
    const context = await authService.getCurrentUserContext();
    if (!context) {
      throw new Error('User not authenticated');
    }

    // Input validation
    const validQRValue = InputValidator.validateText(qrValue);
    if (!validQRValue) {
      throw new Error('Invalid QR code value');
    }

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
        const data = doc.data() as QRCodeMapping;
        return { ...data, id: doc.id };
      }
    }

    return null;
  } catch (error) {
    //consoleerror('Error getting QR code mapping:', error);
    throw error;
  }
};

/** Get all locations for dropdown selection */
export const getLocations = async (): Promise<LocationLite[]> => {
  try {
    // Authentication check
    const context = await authService.getCurrentUserContext();
    if (!context) {
      throw new Error('User not authenticated');
    }

    const snapshot = await firestore().collection('locations').get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data() as any).name ?? doc.id,
    }));
  } catch (error) {
    //consoleerror('Error getting locations:', error);
    throw error;
  }
};

/** Get all buildings for a location */
export const getBuildingsForLocation = async (locationId: string): Promise<BuildingLite[]> => {
  try {
    // Input validation
    const validLocationId = InputValidator.validateDocumentId(locationId);
    if (!validLocationId) {
      throw new Error('Invalid location ID');
    }

    // Authorization check
    if (!(await authService.canAccessLocation(validLocationId))) {
      throw new Error('Unauthorized access to location buildings');
    }

    const buildingsSnapshot = await firestore()
      .collection('locations')
      .doc(validLocationId)
      .collection('buildingPOIs')
      .get();

    return buildingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data() as any).name ?? doc.id,
    }));
  } catch (error) {
    //consoleerror('Error getting buildings for location:', error);
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
    // Input validation
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validBuildingId = InputValidator.validateDocumentId(buildingId);

    if (!validLocationId || !validBuildingId) {
      throw new Error('Invalid location or building ID');
    }

    // Authorization check
    if (!(await authService.canAccessBuilding(validLocationId, validBuildingId))) {
      throw new Error('Unauthorized access to building floors');
    }

    const col = firestore()
      .collection('locations')
      .doc(validLocationId)
      .collection('buildingPOIs')
      .doc(validBuildingId)
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
    //consoleerror('Error getting floors for building:', error);
    throw error;
  }
};

export const getRoomsForFloor = async (
  locationId: string,
  buildingId: string,
  floorId: string,
): Promise<RoomLite[]> => {
  try {
    // Input validation
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validBuildingId = InputValidator.validateDocumentId(buildingId);
    const validFloorId = InputValidator.validateDocumentId(floorId);

    if (!validLocationId || !validBuildingId || !validFloorId) {
      throw new Error('Invalid location, building, or floor ID');
    }

    // Authorization check
    if (!(await authService.canAccessBuilding(validLocationId, validBuildingId))) {
      throw new Error('Unauthorized access to building rooms');
    }

    // First, fetch all rooms for the location & building (index-friendly)
    const roomsSnapshot = await firestore()
      .collection('locations')
      .doc(validLocationId)
      .collection('roomPOIs')
      .where('buildingId', '==', validBuildingId)
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
    //consoleerror('Error getting rooms for floor:', error);
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
    // Input validation
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validBuildingId = InputValidator.validateDocumentId(buildingId);

    if (!validLocationId || !validBuildingId) {
      throw new Error('Invalid location or building ID');
    }

    // Authorization check - need to access building to get its QR codes
    if (!(await authService.canAccessBuilding(validLocationId, validBuildingId))) {
      throw new Error('Unauthorized access to building QR codes');
    }

    const snapshot = await firestore()
      .collection('locations')
      .doc(validLocationId)
      .collection('qrCodes')
      .where('buildingId', '==', validBuildingId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as QRCodeMapping);
  } catch (error) {
    //consoleerror('Error getting QR codes for building:', error);
    throw error;
  }
};

/** Delete a QR code mapping */
export const deleteQRCodeMapping = async (
  locationId: string,
  qrCodeId: string,
): Promise<boolean> => {
  try {
    // Input validation
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validQRCodeId = InputValidator.validateDocumentId(qrCodeId);

    if (!validLocationId || !validQRCodeId) {
      throw new Error('Invalid location or QR code ID');
    }

    // Authorization check - only editors and admins can delete QR codes
    if (!(await authService.canModifyQRCode(validLocationId, validQRCodeId))) {
      throw new Error('Unauthorized: Cannot delete QR codes for this location');
    }

    await firestore()
      .collection('locations')
      .doc(validLocationId)
      .collection('qrCodes')
      .doc(validQRCodeId)
      .delete();
    return true;
  } catch (error) {
    //consoleerror('Error deleting QR code mapping:', error);
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
    // Input validation
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validQRCodeId = InputValidator.validateDocumentId(qrCodeId);

    if (!validLocationId || !validQRCodeId) {
      throw new Error('Invalid location or QR code ID');
    }

    // Authorization check - only editors and admins can update QR codes
    if (!(await authService.canModifyQRCode(validLocationId, validQRCodeId))) {
      throw new Error('Unauthorized: Cannot update QR codes for this location');
    }

    // Validate update data
    const sanitizedUpdates: Partial<QRCodeMapping> = {};
    if (updates.description !== undefined) {
      const validDescription = InputValidator.validateText(updates.description);
      if (validDescription) sanitizedUpdates.description = validDescription;
    }
    if (updates.qrValue !== undefined) {
      const validQRValue = InputValidator.validateText(updates.qrValue);
      if (!validQRValue) throw new Error('Invalid QR code value');
      sanitizedUpdates.qrValue = validQRValue;
    }

    await firestore()
      .collection('locations')
      .doc(validLocationId)
      .collection('qrCodes')
      .doc(validQRCodeId)
      .update(sanitizedUpdates);
    return true;
  } catch (error) {
    //consoleerror('Error updating QR code mapping:', error);
    throw error;
  }
};
