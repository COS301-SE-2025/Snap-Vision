import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';

interface Building {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  floors: number;
  hasNavigation?: boolean;
  source: string;
  location: string;
}

export const useBuildings = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBuildingsWithNavigation();
  }, []);

  const loadBuildingsWithNavigation = async () => {
    try {
      setIsLoading(true);

      const locationSnapshot = await firestore().collection('locations').get();
      const locationIds = locationSnapshot.docs.map((doc) => doc.id);

      const allBuildings: Building[] = [];
      const buildingsFromRooms = new Map<string, Building>();

     