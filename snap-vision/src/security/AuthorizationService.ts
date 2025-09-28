// src/security/AuthorizationService.ts
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export interface AuthorizationContext {
  userId: string;
  role: string;
  adminLocations?: string[];
}

export class AuthorizationService {
  private static instance: AuthorizationService;
  private authCache = new Map<string, { context: AuthorizationContext; expiry: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  public static getInstance(): AuthorizationService {
    if (!AuthorizationService.instance) {
      AuthorizationService.instance = new AuthorizationService();
    }
    return AuthorizationService.instance;
  }

  /**
   * Get current user's authorization context with caching
   */
  async getCurrentUserContext(): Promise<AuthorizationContext | null> {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return null;
    }

    const cached = this.authCache.get(currentUser.uid);
    if (cached && Date.now() < cached.expiry) {
      return cached.context;
    }

    try {
      const userDoc = await firestore().collection('userInformation').doc(currentUser.uid).get();

      const userData = userDoc.data();
      const context: AuthorizationContext = {
        userId: currentUser.uid,
        role: userData?.role || 'user',
        adminLocations: userData?.adminLocations || [],
      };

      // Cache the result
      this.authCache.set(currentUser.uid, {
        context,
        expiry: Date.now() + this.CACHE_TTL,
      });

      return context;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate user can access a specific user resource
   */
  async canAccessUser(targetUserId: string): Promise<boolean> {
    const context = await this.getCurrentUserContext();
    if (!context) return false;

    // Users can always access their own data
    if (context.userId === targetUserId) {
      return true;
    }

    // Only admins can access other users
    return context.role === 'admin';
  }

  /**
   * Validate user can access a location resource
   */
  async canAccessLocation(locationId: string): Promise<boolean> {
    const context = await this.getCurrentUserContext();
    if (!context) return false;

    // Admins can access all locations
    if (context.role === 'admin') {
      return true;
    }

    // Editors can only access their assigned locations
    if (context.role === 'editor') {
      return context.adminLocations?.includes(locationId) ?? false;
    }

    // Regular users can view all locations (read-only)
    return true;
  }

  /**
   * Validate user can modify a location resource
   */
  async canModifyLocation(locationId: string): Promise<boolean> {
    const context = await this.getCurrentUserContext();
    if (!context) return false;

    // Admins can modify all locations
    if (context.role === 'admin') {
      return true;
    }

    // Editors can only modify their assigned locations
    if (context.role === 'editor') {
      return context.adminLocations?.includes(locationId) ?? false;
    }

    // Regular users cannot modify locations
    return false;
  }

  /**
   * Validate user can access building resource
   */
  async canAccessBuilding(locationId: string, buildingId: string): Promise<boolean> {
    // First check location access
    if (!(await this.canAccessLocation(locationId))) {
      return false;
    }

    // Validate building exists in the location
    try {
      const buildingDoc = await firestore()
        .collection(`locations/${locationId}/buildingPOIs`)
        .doc(buildingId)
        .get();

      return buildingDoc.exists();
    } catch {
      return false;
    }
  }

  /**
   * Validate user can modify building resource
   */
  async canModifyBuilding(locationId: string, buildingId: string): Promise<boolean> {
    // Check modification permission for location
    if (!(await this.canModifyLocation(locationId))) {
      return false;
    }

    // Validate building exists
    return this.canAccessBuilding(locationId, buildingId);
  }

  /**
   * Validate user can access QR code resource
   */
  async canAccessQRCode(locationId: string, qrCodeId: string): Promise<boolean> {
    // Check location access first
    if (!(await this.canAccessLocation(locationId))) {
      return false;
    }

    try {
      const qrDoc = await firestore()
        .collection(`locations/${locationId}/qrCodes`)
        .doc(qrCodeId)
        .get();

      return qrDoc.exists();
    } catch {
      return false;
    }
  }

  /**
   * Validate user can modify QR code resource
   */
  async canModifyQRCode(locationId: string, qrCodeId: string): Promise<boolean> {
    const canModify = await this.canModifyLocation(locationId);
    const canAccess = await this.canAccessQRCode(locationId, qrCodeId);
    return canModify && canAccess;
  }

  /**
   * Validate user can access recently visited data
   */
  async canAccessRecentlyVisited(targetUserId: string): Promise<boolean> {
    const context = await this.getCurrentUserContext();
    if (!context) return false;

    // Users can only access their own recently visited data
    return context.userId === targetUserId;
  }

  /**
   * Validate user can access badge data
   */
  async canAccessBadgeData(targetUserId: string): Promise<boolean> {
    const context = await this.getCurrentUserContext();
    if (!context) return false;

    // Users can only access their own badge data
    return context.userId === targetUserId;
  }

  /**
   * Validate user can access timetable data
   */
  async canAccessTimetable(targetUserId: string): Promise<boolean> {
    const context = await this.getCurrentUserContext();
    if (!context) return false;

    // Users can only access their own timetable data
    return context.userId === targetUserId;
  }

  /**
   * Validate user can access crowd report data
   */
  async canAccessCrowdReports(): Promise<boolean> {
    const context = await this.getCurrentUserContext();
    return !!context; // Any authenticated user can access crowd reports
  }

  /**
   * Validate user can create crowd reports
   */
  async canCreateCrowdReport(): Promise<boolean> {
    const context = await this.getCurrentUserContext();
    return !!context; // Any authenticated user can create crowd reports
  }

  /**
   * Validate user can modify their own crowd report
   */
  async canModifyCrowdReport(reportId: string, reporterId: string): Promise<boolean> {
    const context = await this.getCurrentUserContext();
    if (!context) return false;

    // Users can only modify their own reports or admins can modify any
    return context.userId === reporterId || context.role === 'admin';
  }

  /**
   * Validate user can access FCM tokens
   */
  async canAccessFCMToken(targetUserId: string): Promise<boolean> {
    const context = await this.getCurrentUserContext();
    if (!context) return false;

    // Users can only access their own FCM tokens
    return context.userId === targetUserId;
  }

  /**
   * Clear authorization cache (useful after role changes)
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.authCache.delete(userId);
    } else {
      this.authCache.clear();
    }
  }

  /**
   * Sanitize and validate resource ID
   */
  static sanitizeResourceId(id: string): string | null {
    if (!id || typeof id !== 'string') {
      return null;
    }

    // Remove potentially dangerous characters
    const sanitized = id.replace(/[^\w-]/g, '').trim();

    // Validate length (Firestore document IDs are typically under 1500 chars)
    if (sanitized.length === 0 || sanitized.length > 200) {
      return null;
    }

    return sanitized;
  }


}

export default AuthorizationService;
