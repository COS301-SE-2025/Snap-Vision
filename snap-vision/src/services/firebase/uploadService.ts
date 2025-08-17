import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';

export const uploadFloorplanImage = async (
  locationId: string,
  buildingId: string,
  floorLabel: string,
  fileUri: string,
): Promise<string> => {
  const floorNumber = floorLabel;
  const storagePath = `floorplans/${locationId}/${buildingId}/${floorNumber}.jpg`;
  
  console.log('Uploading to:', storagePath);
  console.log('Current user UID:', auth().currentUser?.uid);

  const reference = storage().ref(storagePath);
  await reference.putFile(fileUri);
  return await reference.getDownloadURL();
};
