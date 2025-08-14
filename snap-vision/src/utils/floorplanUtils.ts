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
      isPrebundled: true, // Flag to identify pre-bundled floorplans
    },
    {
      id: `${TISHANA_HOME_ID}_Floor_1`,
      buildingId: TISHANA_HOME_ID, // Using the building name as the ID
      buildingName: 'Tishana Home',
      floorLabel: 'Floor 1',
      uri: 'file:///android_asset/floorplans/tishana_house.jpg',
      timestamp: new Date().toISOString(),
      status: 'active',
      isPrebundled: true, // Flag to identify pre-bundled floorplans
    },
  ];

  try {
    for (const floorplanData of floorplans) {
      // Save to AsyncStorage with the same key format used by the upload functionality
      const storageKey = `floorplan_${floorplanData.buildingId}_${floorplanData.floorLabel}`;

      // Check if already exists
      const existing = await AsyncStorage.getItem(storageKey);
      if (!existing) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(floorplanData));
        console.log(
          `Pre-bundled floorplan initialized: ${floorplanData.buildingName} - ${floorplanData.floorLabel}`,
        );
      } else {
        // Update existing with isPrebundled flag if it doesn't have it
        const existingData = JSON.parse(existing);
        if (!existingData.isPrebundled) {
          existingData.isPrebundled = true;
          await AsyncStorage.setItem(storageKey, JSON.stringify(existingData));
          console.log(
            `Updated existing floorplan with prebundled flag: ${floorplanData.buildingName} - ${floorplanData.floorLabel}`,
          );
        }
      }
    }
  } catch (error) {
    console.error('Failed to initialize pre-bundled floorplans:', error);
  }
};

// Helper function to get all floorplans and ensure unique keys
export const getAllFloorplans = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const floorplanKeys = keys.filter((key) => key.startsWith('floorplan_'));

    const floorplans = await Promise.all(
      floorplanKeys.map(async (key) => {
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }),
    );

    // Filter out null values and ensure unique IDs
    const validFloorplans = floorplans.filter((fp) => fp !== null);

    // Create a Map to ensure unique entries based on buildingId + floorLabel
    const uniqueFloorplans = new Map();

    validFloorplans.forEach((fp) => {
      const uniqueKey = `${fp.buildingId}_${fp.floorLabel}`;
      if (!uniqueFloorplans.has(uniqueKey)) {
        uniqueFloorplans.set(uniqueKey, fp);
      }
    });

    return Array.from(uniqueFloorplans.values());
  } catch (error) {
    console.error('Failed to get floorplans:', error);
    return [];
  }
};

// Helper function to clear duplicate floorplans
export const clearDuplicateFloorplans = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const floorplanKeys = keys.filter((key) => key.startsWith('floorplan_'));

    const floorplans = await Promise.all(
      floorplanKeys.map(async (key) => {
        const data = await AsyncStorage.getItem(key);
        return { key, data: data ? JSON.parse(data) : null };
      }),
    );

    // Group by buildingId + floorLabel
    const grouped = new Map();

    floorplans.forEach(({ key, data }) => {
      if (data) {
        const uniqueKey = `${data.buildingId}_${data.floorLabel}`;
        if (!grouped.has(uniqueKey)) {
          grouped.set(uniqueKey, []);
        }
        grouped.get(uniqueKey).push({ key, data });
      }
    });

    // Remove duplicates (keep the first one)
    for (const [uniqueKey, items] of grouped.entries()) {
      if (items.length > 1) {
        console.log(`Found ${items.length} duplicates for ${uniqueKey}, removing extras`);

        // Keep the first item, remove the rest
        for (let i = 1; i < items.length; i++) {
          await AsyncStorage.removeItem(items[i].key);
          console.log(`Removed duplicate: ${items[i].key}`);
        }
      }
    }

    console.log('Duplicate cleanup completed');
  } catch (error) {
    console.error('Failed to clear duplicate floorplans:', error);
  }
};
