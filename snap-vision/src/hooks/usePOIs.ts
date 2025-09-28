import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';

export interface POI {
  id: string;
  name: string;
  location: string;
  centroid: {
    latitude: number;
    longitude: number;
  };
  tags?: {
    building?: string;
    [key: string]: any;
  };
  type?: string;
}

export const usePOIs = () => {
  const [pois, setPois] = useState<POI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPOIs = async () => {
      try {
        setIsLoading(true);
        const snapshot = await firestore().collection('locations/up-campus/buildingPOIs').get();

        const poisData = snapshot.docs.map((doc) => ({
          id: doc.id,
          location: 'up-campus',
          ...doc.data(),
        })) as POI[];

        setPois(poisData);
      } catch (err) {
        //console.error('Error fetching POIs:', err);
        setError('Failed to load buildings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPOIs();
  }, []);

  return { pois, isLoading, error };
};
