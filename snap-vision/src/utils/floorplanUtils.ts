import AsyncStorage from '@react-native-async-storage/async-storage';

const IT_BUILDING_ID = 'way/1301530915';

export const initializePreBundledFloorplans = async () => {
  // Define the pre-bundled floorplan
  const floorplanData = {
    id: `${IT_BUILDING_ID}_Floor_2`,
    buildingId: IT_BUILDING_ID,
    buildingName: 'IT Building',
    floorLabel: 'Floor 2',
    uri: 'file:///android_asset/floorplans/it_building_floor2.jpg',
    timestamp: new Date().toISOString(),
    status: 'active',
  };

  // Save to AsyncStorage with the same key format used by the upload functionality
  const storageKey = `floorplan_${IT_BUILDING_ID}_Floor_2`;

  try {
    // Check if already exists
    const existing = await AsyncStorage.getItem(storageKey);
    if (!existing) {
      await AsyncStorage.setItem(storageKey, JSON.stringify(floorplanData));
      console.log('Pre-bundled floorplan initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize pre-bundled floorplan:', error);
  }
};
