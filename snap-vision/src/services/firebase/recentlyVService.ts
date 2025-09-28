import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import AuthorizationService from '../../security/AuthorizationService';
import InputValidator from '../../security/InputValidator';

export interface Visit {
  userId: string;
  poiId: string;
  name: string;
  location: string;
  timestamp: FirebaseFirestoreTypes.Timestamp;
}

const authService = AuthorizationService.getInstance();

// Fetch the 10 most recent visits for the current user
export async function getRecentlyVPOIs(userId?: string): Promise<Visit[]> {
  try {
    const currentUserId = userId || auth().currentUser?.uid;
    const validUserId = InputValidator.validateUserId(currentUserId);

    if (!validUserId) {
      //console.warn('Invalid user ID provided to getRecentlyVPOIs');
      return [];
    }

    // Authorization check
    if (!(await authService.canAccessRecentlyVisited(validUserId))) {
      //console.warn('Unauthorized access attempt to recently visited data');
      return [];
    }

    const userDoc = await firestore().collection('recentlyVisited').doc(validUserId).get();

    if (!userDoc.exists) {
      return [];
    }

    const data = userDoc.data();
    const pois: Visit[] = data?.pois || [];

    // Validate and sanitize the data
    const validatedPois: Visit[] = pois
      .map((poi: any) => {
        const validUserId = InputValidator.validateUserId(poi.userId);
        const validPoiId = InputValidator.validateDocumentId(poi.poiId);
        const validName = InputValidator.validateText(poi.name);
        const validLocation = InputValidator.validateDocumentId(poi.location);

        if (!validUserId || !validPoiId || !validName || !validLocation) {
          return null;
        }

        return {
          userId: validUserId,
          poiId: validPoiId,
          name: validName,
          location: validLocation,
          timestamp: poi.timestamp,
        };
      })
      .filter((poi: any): poi is Visit => poi !== null);

    // Sort by timestamp descending
    validatedPois.sort((a, b) => {
      const tA = a.timestamp?.toMillis?.() ?? 0;
      const tB = b.timestamp?.toMillis?.() ?? 0;
      return tB - tA;
    });

    return validatedPois.slice(0, 10);
  } catch (error) {
    //console.error('Error fetching recently visited POIs:', error);
    return [];
  }
}

// Add a POI to the user's recently visited list
export async function addRecentlyVisitedPOI(visit: Omit<Visit, 'timestamp'>): Promise<void> {
  try {
    const validUserId = InputValidator.validateUserId(visit.userId);
    const validPoiId = InputValidator.validateDocumentId(visit.poiId);
    const validName = InputValidator.validateText(visit.name);
    const validLocation = InputValidator.validateDocumentId(visit.location);

    if (!validUserId || !validPoiId || !validName || !validLocation) {
      throw new Error('Invalid visit data provided');
    }

    // Authorization check - users can only add to their own recently visited list
    if (!(await authService.canAccessRecentlyVisited(validUserId))) {
      throw new Error('Unauthorized: Cannot access recently visited data');
    }

    const userDocRef = firestore().collection('recentlyVisited').doc(validUserId);
    const userDoc = await userDocRef.get();

    const newVisit: Visit = {
      userId: validUserId,
      poiId: validPoiId,
      name: validName,
      location: validLocation,
      timestamp: firestore.Timestamp.now(),
    };

    if (userDoc.exists()) {
      const data = userDoc.data() || {};
      const pois: Visit[] = data.pois || [];

      // Prevent duplicate POIs
      const alreadyExists = pois.some((poi) => poi.poiId === validPoiId);
      if (alreadyExists) {
        //console.log(`POI ${validPoiId} already exists for user ${validUserId}`);
        return;
      }

      pois.push(newVisit);

      // Keep only the most recent 50 visits to prevent unbounded growth
      const sortedPois = pois
        .sort((a, b) => {
          const timeA = a.timestamp?.toMillis?.() ?? 0;
          const timeB = b.timestamp?.toMillis?.() ?? 0;
          return timeB - timeA;
        })
        .slice(0, 50);

      await userDocRef.update({ pois: sortedPois });
    } else {
      await userDocRef.set({
        userId: validUserId,
        pois: [newVisit],
      });
    }

    //console.log(`Added POI ${validPoiId} to recently visited for user ${validUserId}`);
  } catch (error) {
    //console.error('Error adding recently visited POI:', error);
    throw error;
  }
}
