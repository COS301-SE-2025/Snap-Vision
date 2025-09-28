import storage from '@react-native-firebase/storage';
import AuthorizationService from '../../security/AuthorizationService';
import InputValidator from '../../security/InputValidator';

const authService = AuthorizationService.getInstance();

export const uploadFloorplanImage = async (
  locationId: string,
  buildingId: string,
  floorLabel: string,
  fileUri: string,
): Promise<string> => {
  // Input validation
  const validLocationId = InputValidator.validateDocumentId(locationId);
  const validBuildingId = InputValidator.validateDocumentId(buildingId);
  const validFloorLabel = InputValidator.validateText(floorLabel);

  if (!validLocationId || !validBuildingId || !validFloorLabel || !fileUri) {
    throw new Error('Invalid input parameters');
  }

  // Authorization check - only editors and admins can upload floorplans
  if (!(await authService.canModifyBuilding(validLocationId, validBuildingId))) {
    throw new Error('Unauthorized: Cannot upload floorplans for this location');
  }

  const floorNumber = validFloorLabel;
  const storagePath = `floorplans/${validLocationId}/${validBuildingId}/${floorNumber}.jpg`;

  ////consolelog('Uploading to:', storagePath);
  ////consolelog('Current user UID:', auth().currentUser?.uid);

  const reference = storage().ref(storagePath);
  await reference.putFile(fileUri);
  return await reference.getDownloadURL();
};
