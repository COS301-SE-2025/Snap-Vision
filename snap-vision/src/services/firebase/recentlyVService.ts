// src/services/firebase/recentlyVService.ts
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export interface Visit {
  id?: string;
  userId: string;
  poiId: string;
  name: string;
  timestamp: FirebaseFirestoreTypes.Timestamp;
  centroid: {
    latitude: number;
    longitude: number;
  };
}

export async function getRecentlyVPOIs(userId?: string): Promise<Visit[]> {
  try {
    const currentUserId = userId || auth().currentUser?.uid;
    if (!currentUserId) return [];

    const userDoc = await firestore().collection('recentlyVisited').doc(currentUserId).get();

    if (!userDoc.exists) {
      console.log(`No recently visited POIs found for user ${currentUserId}`);
      return [];
    }

    return userDoc.data()?.pois || [];
  } catch (error) {
    console.error('Error fetching recently visited POIs:', error);
    return [];
  }
}

export async function addRecentlyVisitedPOI(visit: Visit): Promise<void> {
  try {
    const userId = visit.userId;
    const userDocRef = firestore().collection('recentlyVisited').doc(userId);

    const userDoc = await userDocRef.get();

    if (userDoc.exists()) {
      // Update the existing document
      const existingPOIs = userDoc.data()?.pois || [];

      // Check if the POI already exists in the array
      const alreadyVisited = existingPOIs.some((poi: Visit) => poi.poiId === visit.poiId);
      if (alreadyVisited) {
        console.log(`POI ${visit.poiId} already exists for user ${userId}`);
        return;
      }

      // Add the new POI to the array
      const newVisit = {
        ...visit,
        timestamp: firestore.Timestamp.now(), // Use Firestore's Timestamp instead of FieldValue.serverTimestamp()
      };
      const updatedPOIs = [...existingPOIs, newVisit].slice(-10); // Limit to last 10 POIs
      await userDocRef.update({ pois: updatedPOIs });
    } else {
      // Create a new document for the user
      const newVisit = {
        ...visit,
        timestamp: firestore.Timestamp.now(), // Use Firestore's Timestamp instead of FieldValue.serverTimestamp()
      };
      await userDocRef.set({ userId, pois: [newVisit] });
    }
  } catch (error) {
    console.error('Error adding visit:', error);
    throw error;
  }
}
