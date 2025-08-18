import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export const useUserRole = () => {
  const [role, setRole] = useState<string | null>(null);
  const [adminLocations, setAdminLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const uid = auth().currentUser?.uid;
        if (!uid) {
          setIsLoading(false);
          return;
        }
        
        const doc = await firestore().doc(`userInformation/${uid}`).get();
        const data = doc.data();
        
        setRole(data?.role || 'user');
        setAdminLocations(data?.adminLocations || []);
      } catch (error) {
        console.error('Error fetching user info:', error);
        setRole('user');
        setAdminLocations([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserInfo();
  }, []);

  return { role, adminLocations, isLoading };
};
