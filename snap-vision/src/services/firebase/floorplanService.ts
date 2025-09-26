import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { Building, Location } from '../../types/floorplan';
import AuthorizationService from '../../security/AuthorizationService';
import InputValidator from '../../security/InputValidator';

const authService = AuthorizationService.getInstance();

export const fetchBuildings = async (locationId: string): Promise<Building[]> => {
  // Input validation
  const validLocationId = InputValidator.validateDocumentId(locationId);
  if (!validLocationId) {
    throw new Error('Invalid location ID');
  }

  // Authorization check
  if (!(await authService.canAccessLocation(validLocationId))) {
    throw new Error('Unauthorized access to location buildings');
  }

  const snapshot = await firestore().collection(`locations/${validLocationId}/buildingPOIs`).get();

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
  // Input validation
  const validLocationId = InputValidator.validateDocumentId(locationId);
  const validBuildingId = InputValidator.validateDocumentId(buildingId);
  const validFloorLabel = InputValidator.validateText(floorLabel);
  const validDownloadURL = InputValidator.validateUrl(downloadURL);

  if (!validLocationId || !validBuildingId || !validFloorLabel || !validDownloadURL) {
    throw new Error('Invalid input parameters');
  }

  // Authorization check - only editors and admins can save floorplan metadata
  if (!(await authService.canModifyBuilding(validLocationId, validBuildingId))) {
    throw new Error('Unauthorized: Cannot modify floorplan metadata for this location');
  }

  const floorplanDocRef = firestore().doc(
    `locations/${validLocationId}/buildingPOIs/${validBuildingId}/floorplans/${validFloorLabel}`,
  );

  await floorplanDocRef.set({
    buildingId,
    floorLabel,
    downloadURL,
    timestamp: firestore.FieldValue.serverTimestamp(),
    uploadedBy: auth().currentUser?.uid,
  });
};
