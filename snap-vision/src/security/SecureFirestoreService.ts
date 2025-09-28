import firestore from '@react-native-firebase/firestore';
import AuthorizationService from './AuthorizationService';
import InputValidator from './InputValidator';

export class SecureFirestoreService {
  private authService: AuthorizationService;

  constructor() {
    this.authService = AuthorizationService.getInstance();
  }

  /**
   * Securely get user information with authorization check
   */
  async getUserInfo(userId: string) {
    const validUserId = InputValidator.validateUserId(userId);
    if (!validUserId) {
      throw new Error('Invalid user ID');
    }

    if (!(await this.authService.canAccessUser(validUserId))) {
      throw new Error('Unauthorized access to user data');
    }

    try {
      const doc = await firestore().collection('userInformation').doc(validUserId).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        id: doc.id,
        name: InputValidator.validateText(data?.name) || '',
        email: InputValidator.validateEmail(data?.email) || '',
        role: InputValidator.validateRole(data?.role) || 'user',
        adminLocations: InputValidator.validateStringArray(data?.adminLocations) || [],
      };
    } catch (error) {
      //console.error('Error fetching user info:', error);
      throw new Error('Failed to fetch user information');
    }
  }

  /**
   * Securely update user role with authorization check
   */
  async updateUserRole(
    targetUserId: string,
    newRole: 'admin' | 'editor' | 'user',
    adminLocations?: string[],
  ) {
    const validUserId = InputValidator.validateUserId(targetUserId);
    const validRole = InputValidator.validateRole(newRole);
    const validLocations = adminLocations
      ? InputValidator.validateStringArray(adminLocations)
      : null;

    if (!validUserId || !validRole) {
      throw new Error('Invalid input parameters');
    }

    const context = await this.authService.getCurrentUserContext();
    if (!context || context.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const updateData: any = { role: validRole };

    if (validRole === 'editor') {
      if (!validLocations || validLocations.length === 0) {
        throw new Error('Editor role requires at least one location assignment');
      }
      updateData.adminLocations = validLocations;
    } else {
      updateData.adminLocations = firestore.FieldValue.delete();
    }

    try {
      await firestore().collection('userInformation').doc(validUserId).update(updateData);

      // Clear cache for updated user
      this.authService.clearCache(validUserId);
    } catch (error) {
      //console.error('Error updating user role:', error);
      throw new Error('Failed to update user role');
    }
  }

  /**
   * Securely delete user with authorization check
   */
  async deleteUser(targetUserId: string) {
    const validUserId = InputValidator.validateUserId(targetUserId);
    if (!validUserId) {
      throw new Error('Invalid user ID');
    }

    const context = await this.authService.getCurrentUserContext();
    if (!context || context.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    // Prevent self-deletion
    if (context.userId === validUserId) {
      throw new Error('Cannot delete your own account');
    }

    try {
      await firestore().collection('userInformation').doc(validUserId).delete();

      // Clear cache
      this.authService.clearCache(validUserId);
    } catch (error) {
      //console.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }

  /**
   * Securely get building information with authorization check
   */
  async getBuilding(locationId: string, buildingId: string) {
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validBuildingId = InputValidator.validateDocumentId(buildingId);

    if (!validLocationId || !validBuildingId) {
      throw new Error('Invalid location or building ID');
    }

    if (!(await this.authService.canAccessBuilding(validLocationId, validBuildingId))) {
      throw new Error('Unauthorized access to building data');
    }

    try {
      const doc = await firestore()
        .collection(`locations/${validLocationId}/buildingPOIs`)
        .doc(validBuildingId)
        .get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        id: doc.id,
        name: InputValidator.validateText(data?.name) || 'Unnamed Building',
        centroid: data?.centroid || { lat: 0, lng: 0 },
        floors: InputValidator.validateNumber(data?.floors, 1, 100) || 1,
      };
    } catch (error) {
      //console.error('Error fetching building:', error);
      throw new Error('Failed to fetch building information');
    }
  }

  /**
   * Securely get recently visited POIs with authorization check
   */
  async getRecentlyVisitedPOIs(targetUserId?: string) {
    const context = await this.authService.getCurrentUserContext();
    if (!context) {
      throw new Error('User not authenticated');
    }

    const userId = targetUserId || context.userId;
    const validUserId = InputValidator.validateUserId(userId);
    if (!validUserId) {
      throw new Error('Invalid user ID');
    }

    if (!(await this.authService.canAccessRecentlyVisited(validUserId))) {
      throw new Error('Unauthorized access to user data');
    }

    try {
      const doc = await firestore().collection('recentlyVisited').doc(validUserId).get();

      if (!doc.exists) {
        return [];
      }

      const data = doc.data();
      const pois = data?.pois || [];

      // Validate and sanitize POI data
      return pois
        .map((poi: any) => ({
          userId: InputValidator.validateUserId(poi.userId),
          poiId: InputValidator.validateDocumentId(poi.poiId),
          name: InputValidator.validateText(poi.name),
          location: InputValidator.validateDocumentId(poi.location),
          timestamp: poi.timestamp,
        }))
        .filter((poi: any) => poi.userId && poi.poiId && poi.name && poi.location)
        .sort((a: any, b: any) => {
          const timeA = a.timestamp?.toMillis?.() ?? 0;
          const timeB = b.timestamp?.toMillis?.() ?? 0;
          return timeB - timeA;
        })
        .slice(0, 10);
    } catch (error) {
      //console.error('Error fetching recently visited POIs:', error);
      throw new Error('Failed to fetch recently visited POIs');
    }
  }

  /**
   * Securely get badge data with authorization check
   */
  async getBadgeData(targetUserId: string) {
    const validUserId = InputValidator.validateUserId(targetUserId);
    if (!validUserId) {
      throw new Error('Invalid user ID');
    }

    if (!(await this.authService.canAccessBadgeData(validUserId))) {
      throw new Error('Unauthorized access to badge data');
    }

    try {
      const doc = await firestore().collection('users').doc(validUserId).get();

      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        badges: InputValidator.validateStringArray(data?.badges) || [],
        routesCompleted: InputValidator.validateNumber(data?.routesCompleted, 0) || 0,
        achievements: InputValidator.validateStringArray(data?.achievements) || [],
      };
    } catch (error) {
      //console.error('Error fetching badge data:', error);
      throw new Error('Failed to fetch badge data');
    }
  }

  /**
   * Securely create QR code mapping with authorization check
   */
  async createQRCodeMapping(
    locationId: string,
    buildingId: string,
    qrData: {
      value: string;
      description: string;
      roomId?: string;
      floorId?: string;
    },
  ) {
    const validLocationId = InputValidator.validateDocumentId(locationId);
    const validBuildingId = InputValidator.validateDocumentId(buildingId);
    const validValue = InputValidator.validateText(qrData.value, 500);
    const validDescription = InputValidator.validateText(qrData.description, 200);

    if (!validLocationId || !validBuildingId || !validValue || !validDescription) {
      throw new Error('Invalid input parameters');
    }

    if (!(await this.authService.canModifyBuilding(validLocationId, validBuildingId))) {
      throw new Error('Unauthorized to create QR code in this location');
    }

    try {
      const qrCodeData = {
        value: validValue,
        description: validDescription,
        locationId: validLocationId,
        buildingId: validBuildingId,
        roomId: qrData.roomId ? InputValidator.validateDocumentId(qrData.roomId) : null,
        floorId: qrData.floorId ? InputValidator.validateDocumentId(qrData.floorId) : null,
        createdAt: firestore.FieldValue.serverTimestamp(),
        createdBy: (await this.authService.getCurrentUserContext())?.userId,
      };

      const docRef = await firestore()
        .collection(`locations/${validLocationId}/qrCodes`)
        .add(qrCodeData);

      return { id: docRef.id, ...qrCodeData };
    } catch (error) {
      //console.error('Error creating QR code mapping:', error);
      throw new Error('Failed to create QR code mapping');
    }
  }

  /**
   * Get secure collection reference with authorization
   */
  async getAuthorizedCollectionRef(collectionPath: string) {
    // Parse the collection path to extract location info
    const pathParts = collectionPath.split('/');

    if (pathParts.length >= 2 && pathParts[0] === 'locations') {
      const locationId = pathParts[1];
      if (!(await this.authService.canAccessLocation(locationId))) {
        throw new Error('Unauthorized access to location data');
      }
    }

    return firestore().collection(collectionPath);
  }
}

export default SecureFirestoreService;
