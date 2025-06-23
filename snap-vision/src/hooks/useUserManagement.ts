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

  useEffect(() => {
  const unsubscribe = firestore()
    .collection('userInformation')
    .onSnapshot(
      snapshot => {
        if (!snapshot) return;

        const data: User[] = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.name || '',
            email: d.email || '',
            role: d.role === 'admin' ? 'Admin' : 'Viewer',
          };
        });
        setUsers(data);
        setLoading(false);
      },
      error => {
        console.error('Firestore error:', error);
        setLoading(false);
      }
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
      filtered = filtered.filter(user => user.role === filters.role);
    }

    // Filter by search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    setFilteredUsers(filtered);
  };

  const updateSearchQuery = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const updateRoleFilter = (role: 'All' | 'Admin' | 'Viewer') => {
    setFilters(prev => ({ ...prev, role }));
  };

  const editUser = async (user: User) => {
    try {
      const roleValue = user.role === 'Admin' ? 'admin' : 'user';
      await firestore().collection('userInformation').doc(user.id).update({
        role: roleValue,
      });
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };


  const deleteUser = async (user: User) => {
    try {
      await firestore().collection('userInformation').doc(user.id).delete();
    } catch (err) {
      console.error('Failed to delete user:', err);
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
  };
};