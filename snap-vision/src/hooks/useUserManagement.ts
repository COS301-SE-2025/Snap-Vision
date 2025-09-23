// src/hooks/useUserManagement.ts
import { useState, useEffect } from 'react';
import { User, UserFilters } from '../types/User';
import firestore from '@react-native-firebase/firestore';

export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<UserFilters>({
    role: 'All',
    searchQuery: '',
  });
  const [loading, setLoading] = useState(true);
  const [allLocations, setAllLocations] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('userInformation')
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) return;

          const data: User[] = snapshot.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              name: d.name || '',
              email: d.email || '',
              // handle editor role here too
              role: d.role === 'admin' ? 'Admin' : d.role === 'editor' ? 'Editor' : 'Viewer',
            };
          });
          setUsers(data);
          setLoading(false);
        },
        (error) => {
          //consoleerror('Firestore error:', error);
          setLoading(false);
        },
      );

    return unsubscribe;
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, filters]);

  const applyFilters = () => {
    let filtered = [...users];

    // Filter by role
    if (filters.role !== 'All') {
      filtered = filtered.filter((user) => user.role === filters.role);
    }

    // Filter by search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
      );
    }

    setFilteredUsers(filtered);
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const snapshot = await firestore().collection('locations').get();
        const locations = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setAllLocations(locations);
      } catch (error) {
        //consoleerror('Failed to fetch locations:', error);
      }
    };

    fetchLocations();
  }, []);

  const updateSearchQuery = (query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  };

  const updateRoleFilter = (role: 'All' | 'Admin' | 'Viewer' | 'Editor') => {
    setFilters((prev) => ({ ...prev, role }));
  };

  const editUser = async (user: User, selectedLocation?: string) => {
    try {
      const updateData: any = {};

      switch (user.role) {
        case 'Admin':
          updateData.role = 'admin';
          updateData.adminLocations = firestore.FieldValue.delete();
          break;

        case 'Viewer':
          updateData.role = 'viewer';
          updateData.adminLocations = firestore.FieldValue.delete();
          break;

        case 'Editor':
          if (!selectedLocation) throw new Error('No location selected for editor');
          updateData.role = 'editor';
          updateData.adminLocations = [selectedLocation];
          break;

        default:
          updateData.role = 'user';
          updateData.adminLocations = firestore.FieldValue.delete();
      }

      await firestore().collection('userInformation').doc(user.id).update(updateData);
    } catch (err) {
      //consoleerror('Failed to update role:', err);
    }
  };

  const deleteUser = async (user: User) => {
    try {
      await firestore().collection('userInformation').doc(user.id).delete();
    } catch (err) {
      //consoleerror('Failed to delete user:', err);
    }
  };

  return {
    users: filteredUsers,
    loading,
    filters,
    updateSearchQuery,
    updateRoleFilter,
    editUser,
    deleteUser,
    allLocations,
    setAllLocations,
  };
};
