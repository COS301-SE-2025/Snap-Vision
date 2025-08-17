import { useState, useEffect } from 'react';
import { Building, Location } from '../types/floorplan';
import { fetchBuildings, fetchUserInfo, fetchLocations } from '../services/firebase/floorplanService';

export const useBuildings = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'user'>();
  const [adminLocations, setAdminLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadBuildings = async (locationId: string) => {
    if (!locationId) return;
    
    setIsLoading(true);
    try {
      const buildingsData = await fetchBuildings(locationId);
      setBuildings(buildingsData);
    } catch (error) {
      console.error('Error loading buildings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserInfo = async () => {
    try {
      const userInfo = await fetchUserInfo();
      if (userInfo) {
        setUserRole(userInfo.role);
        setAdminLocations(userInfo.adminLocations);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
  };

  const loadLocations = async () => {
    try {
      const allLocations = await fetchLocations();
      
      if (userRole === 'admin') {
        setLocations(allLocations);
      } else if (userRole === 'editor') {
        setLocations(allLocations.filter((loc) => adminLocations.includes(loc.id)));
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  useEffect(() => {
    loadUserInfo();
  }, []);

  useEffect(() => {
    if (userRole) {
      loadLocations();
    }
  }, [userRole, adminLocations]);

  return {
    buildings,
    locations,
    userRole,
    adminLocations,
    isLoading,
    loadBuildings,
    loadUserInfo,
    loadLocations,
  };
};
