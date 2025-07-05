// src/services/firebase/recentlyVService.ts
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export interface Visit {
  id?: string;
  userId: string;
  poiId: string;
  name: string;
  timestamp: any;
  centroid: {
    latitude: number;
    longitude: number;
  };
}

export async function getRecentlyVPOIs(userId?: string): Promise<Visit[]> {
  try {
    const currentUserId = userId || auth().currentUser?.uid;
    if (!currentUserId) return [];

    const snapshot = await firestore()
      .collection('recentlyVisited')
      .where('userId', '==', currentUserId)
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Visit[];
  } catch (error) {
    console.error('Error fetching recently visited POIs:', error);
    return [];
  }
}

export async function addRecentlyVisitedPOI(visit: Visit): Promise<void> {
  try {
    await firestore().collection('recentlyVisited').add({
      ...visit,
      timestamp: firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding visit:', error);
    throw error;
  }
}