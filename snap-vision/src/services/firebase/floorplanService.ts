import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Building, Location } from '../../types/floorplan';

export const fetchBuildings = async (locationId: string): Promise<Building[]> => {
  const snapshot = await firestore()
    .collection(`locations/${locationId}/buildingPOIs`)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || 'Unnamed Building',
      centroid: data.centroid,
      floors: data.floors || 1,
    };
  });
};

export const fetchUserInfo = async () => {
  const userId = (await auth().currentUser)?.uid;
  if (!userId) return null;

  const userSnap = await firestore().doc(`userInformation/${userId}`).get();
  const data = userSnap.data();
  return {
    role: data?.role,
    adminLocations: data?.adminLocations || [],
  };
};

export const fetchLocations = async (): Promise<Location[]> => {
  const snapshot = await firestore().collection('locations').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }));
};

export const saveFloorplanMetadata = async (
  locationId: string,
  buildingId: string,
  floorLabel: string,
  downloadURL: string,
) => {
  const floorplanDocRef = firestore().doc(
    `locations/${locationId}/buildingPOIs/${buildingId}/floorplans/${floorLabel}`,
  );

  await floorplanDocRef.set({
    buildingId,
    floorLabel,
    downloadURL,
    timestamp: firestore.FieldValue.serverTimestamp(),
    uploadedBy: auth().currentUser?.uid,
  });
};
