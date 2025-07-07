import AsyncStorage from '@react-native-async-storage/async-storage';

// Building IDs - using names as identifiers for buildings without IDs
const IT_BUILDING_ID = 'way/1301530915';
const TISHANA_HOME_ID = 'Tishana Home'; // Using the building name as the identifier

export const initializePreBundledFloorplans = async () => {
  // Define the pre-bundled floorplans
  const floorplans = [
    {
      id: `${IT_BUILDING_ID}_Floor_2`,
      buildingId: IT_BUILDING_ID,
      buildingName: 'IT Building',
      floorLabel: 'Floor 2',
      uri: 'file:///android_asset/floorplans/it_building_floor2.jpg',
      timestamp: new Date().toISOString(),
      status: 'active',
    },
    {
      id: `${TISHANA_HOME_ID}_Floor_1`,
      buildingId: TISHANA_HOME_ID, // Using the building name as the ID
      buildingName: 'Tishana Home',
      floorLabel: 'Floor 1',
      uri: 'file:///android_asset/floorplans/tishana_home_floor1.jpg',
      timestamp: new Date().toISOString(),
      status: 'active',
    }
  ];

  try {
    for (const floorplanData of floorplans) {
      // Save to AsyncStorage with the same key format used by the upload functionality
      const storageKey = `floorplan_${floorplanData.buildingId}_${floorplanData.floorLabel}`;
      
      // Check if already exists
      const existing = await AsyncStorage.getItem(storageKey);
      if (!existing) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(floorplanData));
        console.log(`Pre-bundled floorplan initialized: ${floorplanData.buildingName} - ${floorplanData.floorLabel}`);
      }
    }
  } catch (error) {
    console.error('Failed to initialize pre-bundled floorplans:', error);
  }
};