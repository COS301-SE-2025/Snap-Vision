import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AuthorizationService from '../security/AuthorizationService';
import InputValidator from '../security/InputValidator';
import CacheService from './CacheService';

const authService = AuthorizationService.getInstance();
const cacheService = CacheService.getInstance();

// Cache TTL configurations
const CACHE_TTL = {
  LOCATIONS: 15 * 60 * 1000, // 15 minutes
  BUILDINGS: 10 * 60 * 1000, // 10 minutes
  FLOORS: 10 * 60 * 1000,    // 10 minutes
  ROOMS: 5 * 60 * 1000,      // 5 minutes
  PATHS: 5 * 60 * 1000,      // 5 minutes
  QR_CODES: 5 * 60 * 1000,   // 5 minutes
};

export interface QRCodeMapping {
  id: string;
  qrValue: string;
  locationId: string;
  locationName: string;
  buildingId: string;
  buildingName: string;
  floorId: string;
  roomId: string;
  roomName: string;
  createdAt: FirebaseFirestoreTypes.Timestamp;
  createdBy: string;
  description?: string;
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
  id: string;
  name: string;
}

export interface RoomLite {
  id: string;
  name: string;
  floorId: string;
  buildingId: string;
  buildingName: string;
  floorLabel?: string;
}

/**
 * Create a new QR code mapping
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

    // Authorization check
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
      floorId,
      roomId,
      roomName,
      createdAt: firestore.Timestamp.now(),
      createdBy: userId,
      description,
    };

    await qrRef.set(qrData);

    // Invalidate related caches
    await cacheService.remove(`qr_codes:${locationId}:${buildingId}`, true);
    
    return qrData;
  } catch (error) {
    ////consoleerror('Error creating QR code mapping:', error);
    throw error;
  }
};

/**
 * Get QR code mapping by QR code value (cached)
 */
export const getQRCodeMappingByValue = async (qrValue: string): Promise<QRCodeMapping | null> => {
  try {
    const context = await authService.getCurrentUserContext();
    if (!context) {
      throw new Error('User not authenticated');
    }

    const validQRValue = InputValidator.validateText(qrValue);
    if (!validQRValue) {
      throw new Error('Invalid QR code value');
    }

    const cacheKey = `qr_mapping:${validQRValue}`;
    
    // Check cache first
    const cached = await cacheService.get<QRCodeMapping>(cacheKey, {
      ttl: CACHE_TTL.QR_CODES,
      userSpecific: false,
    });
    
    if (cached) {
      return cached;
    }

    // Fetch from Firestore
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
        const data = { ...doc.data(), id: doc.id } as QRCodeMapping;
        
        // Cache the result
        await cacheService.set(cacheKey, data, {
          ttl: CACHE_TTL.QR_CODES,
          userSpecific: false,
        });
        
        return data;
      }
    }

    return null;
  } catch (error) {
    ////consoleerror('Error getting QR code mapping:', error);
    throw error;
  }
};

/**
 * Get all locations (cached)
 */
export const getLocations = async (): Promise<LocationLite[]> => {
  try {
    const context = await authService.getCurrentUserContext();
    if (!context) {
      throw new Error('User not authenticated');
    }

    const cacheKey = 'locations';
    
    // Check cache first
    const cached = await cacheService.get<LocationLite[]>(cacheKey, {
      ttl: CACHE_TTL.LOCATIONS,
      userSpecific: true,
    });
    
    if (cached) {
      return cached;
    }

    // Fetch from Firestore
    const snapshot = await firestore().collection('locations').get();
    const locations = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data() as any).name ?? doc.id,
    }));
    
    // Cache the result
    await cacheService.set(cacheKey, locations, {
      ttl: CACHE_TTL.LOCATIONS,
      userSpecific: true,
    });
    
    return locations;
  } catch (error) {
    ////consoleerror('Error getting locations:', error);
    throw error;
  }
};

/**
 * Get all buildings for a location (cached)
 */
export const getBuildingsForLocation = async (locationId: string): Promise<BuildingLite[]> => {
  try {
    const validLocationId = InputValidator.validateDocumentId(locationId);
    if (!validLocationId) {
      throw new Error('Invalid location ID');
    }

    if (!(await authService.canAccessLocation(validLocationId))) {
      throw new Error('Unauthorized access to location buildings');
    }

    const cacheKey = `buildings:${locationId}`;
    
    // Check cache first
    const cached = await cacheService.get<BuildingLite[]>(cacheKey, {
      ttl: CACHE_TTL.BUILDINGS,
      userSpecific: false,
    });
    
    if (cached) {
      return cached;
    }

    // Fetch from Firestore
    const buildingsSnapshot = await firestore()
      .collection('locations')
      .doc(validLocationId)
      .collection('buildingPOIs')
      .get();

    const buildings = buildingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data() as any).name ?? doc.id,
    }));
    
    // Cache the result
    await cacheService.set(cacheKey, buildings, {
      ttl: CACHE_TTL.BUILDINGS,
      userSpecific: false,
    });
    
    return buildings;
  } catch (error) {
    ////consoleerror('Error getting buildings for location:', error);
    throw error;
  }
};

/**
 * Get floors for a building (cached)
 */
export const getFloorsForBuilding = async (
  locationId: string,
  buildingId: string,
): Promise<FloorLite[]> => {
  try {
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validBuildingId = InputValidator.validateDocumentId(buildingId);

    if (!validLocationId || !validBuildingId) {
      throw new Error('Invalid location or building ID');
    }

    if (!(await authService.canAccessBuilding(validLocationId, validBuildingId))) {
      throw new Error('Unauthorized access to building floors');
    }

    const cacheKey = `floors:${locationId}:${buildingId}`;
    
    // Check cache first
    const cached = await cacheService.get<FloorLite[]>(cacheKey, {
      ttl: CACHE_TTL.FLOORS,
      userSpecific: false,
    });
    
    if (cached) {
      return cached;
    }

    // Fetch from Firestore
    const col = firestore()
      .collection('locations')
      .doc(validLocationId)
      .collection('buildingPOIs')
      .doc(validBuildingId)
      .collection('floorplans');

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

    // Cache the result
    await cacheService.set(cacheKey, floors, {
      ttl: CACHE_TTL.FLOORS,
      userSpecific: false,
    });
    
    return floors;
  } catch (error) {
    ////consoleerror('Error getting floors for building:', error);
    throw error;
  }
};

/**
 * Get rooms for a floor (cached)
 */
export const getRoomsForFloor = async (
  locationId: string,
  buildingId: string,
  floorId: string,
): Promise<RoomLite[]> => {
  try {
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validBuildingId = InputValidator.validateDocumentId(buildingId);
    const validFloorId = InputValidator.validateDocumentId(floorId);

    if (!validLocationId || !validBuildingId || !validFloorId) {
      throw new Error('Invalid location, building, or floor ID');
    }

    if (!(await authService.canAccessBuilding(validLocationId, validBuildingId))) {
      throw new Error('Unauthorized access to building rooms');
    }

    const cacheKey = `rooms:${locationId}:${buildingId}:${floorId}`;
    
    // Check cache first
    const cached = await cacheService.get<RoomLite[]>(cacheKey, {
      ttl: CACHE_TTL.ROOMS,
      userSpecific: false,
    });
    
    if (cached) {
      return cached;
    }

    // Fetch from Firestore
    const roomsSnapshot = await firestore()
      .collection('locations')
      .doc(validLocationId)
      .collection('roomPOIs')
      .where('buildingId', '==', validBuildingId)
      .get();

    const rooms = roomsSnapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .filter((r) => {
        const rFloorId = r.floorId != null ? String(r.floorId) : undefined;
        const rFloorLevel = r.floorLevel != null ? String(r.floorLevel) : undefined;
        const rFloorLabel = r.floorLabel != null ? String(r.floorLabel) : undefined;
        return rFloorId === floorId || rFloorLevel === floorId || rFloorLabel === floorId;
      })
      .map((r) => ({
        id: r.id,
        name: r.name || r.roomName || `Room ${r.id}`,
        buildingId: String(r.buildingId),
        buildingName: String(r.buildingName || r.buildingId),
        floorId: String(r.floorId || r.floorLevel || r.floorLabel || floorId),
        floorLabel: String(r.floorLabel || r.floorLevel || r.floorId || floorId),
      }));

    // Cache the result
    await cacheService.set(cacheKey, rooms, {
      ttl: CACHE_TTL.ROOMS,
      userSpecific: false,
    });
    
    return rooms;
  } catch (error) {
    ////consoleerror('Error getting rooms for floor:', error);
    throw error;
  }
};

/**
 * Get QR codes for a building (cached)
 */
export const getQRCodesForBuilding = async (
  locationId: string,
  buildingId: string,
): Promise<QRCodeMapping[]> => {
  try {
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validBuildingId = InputValidator.validateDocumentId(buildingId);

    if (!validLocationId || !validBuildingId) {
      throw new Error('Invalid location or building ID');
    }

    if (!(await authService.canAccessBuilding(validLocationId, validBuildingId))) {
      throw new Error('Unauthorized access to building QR codes');
    }

    const cacheKey = `qr_codes:${locationId}:${buildingId}`;
    
    // Check cache first
    const cached = await cacheService.get<QRCodeMapping[]>(cacheKey, {
      ttl: CACHE_TTL.QR_CODES,
      userSpecific: true,
    });
    
    if (cached) {
      return cached;
    }

    // Fetch from Firestore
    const qrSnapshot = await firestore()
      .collection('locations')
      .doc(validLocationId)
      .collection('qrCodes')
      .where('buildingId', '==', validBuildingId)
      .get();

    const qrCodes = qrSnapshot.docs.map((doc) => ({
      ...doc.data(),
      id: doc.id,
    })) as QRCodeMapping[];

    // Cache the result
    await cacheService.set(cacheKey, qrCodes, {
      ttl: CACHE_TTL.QR_CODES,
      userSpecific: true,
    });
    
    return qrCodes;
  } catch (error) {
    ////consoleerror('Error getting QR codes for building:', error);
    throw error;
  }
};

/**
 * Delete QR code mapping (and invalidate cache)
 */
export const deleteQRCodeMapping = async (
  locationId: string,
  qrCodeId: string,
): Promise<boolean> => {
  try {
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validQrCodeId = InputValidator.validateDocumentId(qrCodeId);

    if (!validLocationId || !validQrCodeId) {
      throw new Error('Invalid location or QR code ID');
    }

    if (!(await authService.canModifyLocation(validLocationId))) {
      throw new Error('Unauthorized: Cannot delete QR codes for this location');
    }

    // Get QR code to find building ID for cache invalidation
    const qrDoc = await firestore()
      .collection('locations')
      .doc(validLocationId)
      .collection('qrCodes')
      .doc(validQrCodeId)
      .get();

    if (!qrDoc.exists) {
      return false;
    }

    const qrData = qrDoc.data() as QRCodeMapping;
    
    await qrDoc.ref.delete();

    // Invalidate related caches
    await cacheService.remove(`qr_codes:${locationId}:${qrData.buildingId}`, true);
    await cacheService.remove(`qr_mapping:${qrData.qrValue}`, false);
    
    return true;
  } catch (error) {
    ////consoleerror('Error deleting QR code mapping:', error);
    throw error;
  }
};

/**
 * Update QR code mapping (and invalidate cache)
 */
export const updateQRCodeMapping = async (
  locationId: string,
  qrCodeId: string,
  updates: Partial<Omit<QRCodeMapping, 'id' | 'createdAt' | 'createdBy'>>,
): Promise<QRCodeMapping> => {
  try {
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validQrCodeId = InputValidator.validateDocumentId(qrCodeId);

    if (!validLocationId || !validQrCodeId) {
      throw new Error('Invalid location or QR code ID');
    }

    if (!(await authService.canModifyLocation(validLocationId))) {
      throw new Error('Unauthorized: Cannot update QR codes for this location');
    }

    const qrRef = firestore()
      .collection('locations')
      .doc(validLocationId)
      .collection('qrCodes')
      .doc(validQrCodeId);

    const qrDoc = await qrRef.get();
    if (!qrDoc.exists) {
      throw new Error('QR code not found');
    }

    const currentData = qrDoc.data() as QRCodeMapping;
    
    await qrRef.update(updates);
    
    const updatedData = { ...currentData, ...updates };

    // Invalidate related caches
    await cacheService.remove(`qr_codes:${locationId}:${currentData.buildingId}`, true);
    if (updates.qrValue && updates.qrValue !== currentData.qrValue) {
      await cacheService.remove(`qr_mapping:${currentData.qrValue}`, false);
      await cacheService.remove(`qr_mapping:${updates.qrValue}`, false);
    }
    
    return updatedData;
  } catch (error) {
    ////consoleerror('Error updating QR code mapping:', error);
    throw error;
  }
};