// src/services/firebase/recentlyVService.ts
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface Visit {
  id?: string;
  userId: string;
  poiId: string;
  name: string;
  timestamp?: FirebaseFirestoreTypes.Timestamp;
  centroid: {
    latitude: number;
    longitude: number;
  };
}

// Fetch the 10 most recent visits for the current user
export async function getRecentlyVPOIs(userId?: string): Promise<Visit[]> {
  try {
    const currentUserId = userId || auth().currentUser?.uid;
    if (!currentUserId) return [];

    const userDoc = await firestore().collection('recentlyVisited').doc(currentUserId).get();

    if (!userDoc.exists) {
      return [];
    }

    const data = userDoc.data();
    const pois: Visit[] = data?.pois || [];

    // Sort by timestamp descending
    pois.sort((a, b) => {
      const tA = a.timestamp?.toMillis?.() ?? 0;
      const tB = b.timestamp?.toMillis?.() ?? 0;
      return tB - tA;
    });

    return pois.slice(0, 10);
  } catch (error) {
    //consoleerror('Error fetching recently visited POIs:', error);
    return [];
  }
}

// Add a POI to the user's recently visited list
export async function addRecentlyVisitedPOI(visit: Omit<Visit, 'timestamp'>): Promise<void> {
  try {
    const { userId, poiId } = visit;

    const userDocRef = firestore().collection('recentlyVisited').doc(userId);
    const userDoc = await userDocRef.get();

    const newVisit: Visit = {
      ...visit,
      timestamp: firestore.Timestamp.now(),
    };

    if (userDoc.exists()) {
      const data = userDoc.data() || {};
      const pois: Visit[] = data.pois || [];

      // Prevent duplicate POIs
      const alreadyExists = pois.some((poi) => poi.poiId === poiId);
      if (alreadyExists) {
        //consolelog(`POI ${poiId} already exists for user ${userId}`);
        return;
      }

      pois.push(newVisit);
      await userDocRef.update({ pois });
    } else {
      await userDocRef.set({
        userId,
        pois: [newVisit],
      });
    }
  } catch (error) {
    //consoleerror('Error adding recently visited POI:', error);
    throw error;
  }
}
