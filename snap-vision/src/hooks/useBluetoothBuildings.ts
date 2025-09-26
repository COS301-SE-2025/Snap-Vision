import { useState, useEffect } from 'react';
import { firestore } from '../services/firebase';
import { Building } from '../types/Building';

interface UseBluetoothBuildingsReturn {
  buildings: Building[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useBluetoothBuildings = (): UseBluetoothBuildingsReturn => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBeaconBuildings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all locations
      const locationsSnapshot = await firestore().collection('locations').get();

      const beaconBuildings: Building[] = [];

      // For each location, get buildings with beacons
      for (const locationDoc of locationsSnapshot.docs) {
        const locationId = locationDoc.id;

        const buildingSnapshot = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('buildingPOIs')
          .where('hasBluetoothBeacons', '==', true)
          .get();

        buildingSnapshot.docs.forEach((doc) => {
          beaconBuildings.push({
            id: doc.id,
            name: doc.data().name || 'Unnamed Building',
            locationId: locationId,
            hasBluetoothBeacons: true,
            floors: doc.data().floors || 1,
            description: doc.data().description,
          });
        });
      }

      setBuildings(beaconBuildings);
    } catch (err) {
      console.error('Error fetching beacon buildings:', err);
      setError('Failed to load buildings with Bluetooth beacons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeaconBuildings();
  }, []);

  const refetch = async () => {
    await fetchBeaconBuildings();
  };

  return {
    buildings,
    loading,
    error,
    refetch,
  };
};
