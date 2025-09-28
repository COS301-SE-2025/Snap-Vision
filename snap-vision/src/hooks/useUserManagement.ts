import { useState, useEffect } from 'react';
import { User, UserFilters } from '../types/User';
import firestore from '@react-native-firebase/firestore';
import AuthorizationService from '../security/AuthorizationService';
import InputValidator from '../security/InputValidator';

const authService = AuthorizationService.getInstance();

export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<UserFilters>({
    role: 'All',
    searchQuery: '',
  });
  const [loading, setLoading] = useState(true);
  const [allLocations, setAllLocations] = useState<{ id: string; name: string }[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has admin permissions
    const checkPermissions = async () => {
      const context = await authService.getCurrentUserContext();
      if (!context || context.role !== 'admin') {
        setAuthError('Admin access required');
        setLoading(false);
        return;
      }
      setAuthError(null);
    };

    checkPermissions();

    const unsubscribe = firestore()
      .collection('userInformation')
      .onSnapshot(
        (snapshot) => {
          if (!snapshot) return;

          const data: User[] = snapshot.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              name: InputValidator.validateText(d.name) || '',
              email: InputValidator.validateEmail(d.email) || '',
              role: d.role === 'admin' ? 'Admin' : d.role === 'editor' ? 'Editor' : 'Viewer',
            };
          });

          setUsers(data);
          setLoading(false);
        },
        (error) => {
          //console.error('Firestore error:', error);
          setAuthError('Failed to load user data');
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
        ////consoleerror('Failed to fetch locations:', error);
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
      // Validate inputs
      const validUserId = InputValidator.validateUserId(user.id);
      // Convert UI role to database role
      const databaseRole = user.role === 'Viewer' ? 'user' : user.role.toLowerCase();
      const validRole = InputValidator.validateRole(databaseRole);

      if (!validUserId || !validRole) {
        throw new Error('Invalid user data');
      }

      // Check authorization
      const context = await authService.getCurrentUserContext();
      if (!context || context.role !== 'admin') {
        throw new Error('Admin access required');
      }

      // Validate location for editors
      let validLocations: string[] = [];
      if (validRole === 'editor') {
        if (!selectedLocation) {
          throw new Error('No location selected for editor');
        }
        const validLocationId = InputValidator.validateDocumentId(selectedLocation);
        if (!validLocationId) {
          throw new Error('Invalid location ID');
        }
        validLocations = [validLocationId];
      }

      const updateData: any = { role: validRole };

      switch (validRole) {
        case 'admin':
          updateData.adminLocations = firestore.FieldValue.delete();
          break;

        case 'editor':
          updateData.adminLocations = validLocations;
          break;

        case 'user':
          updateData.adminLocations = firestore.FieldValue.delete();
          break;

        default:
          updateData.adminLocations = firestore.FieldValue.delete();
      }

      await firestore().collection('userInformation').doc(validUserId).update(updateData);

      // Clear auth cache for the updated user
      authService.clearCache(validUserId);
    } catch (err) {
      //console.error('Failed to update role:', err);
      throw err;
    }
  };

  const deleteUser = async (user: User) => {
    try {
      // Validate input
      const validUserId = InputValidator.validateUserId(user.id);
      if (!validUserId) {
        throw new Error('Invalid user ID');
      }

      // Check authorization
      const context = await authService.getCurrentUserContext();
      if (!context || context.role !== 'admin') {
        throw new Error('Admin access required');
      }

      // Prevent self-deletion
      if (context.userId === validUserId) {
        throw new Error('Cannot delete your own account');
      }

      await firestore().collection('userInformation').doc(validUserId).delete();

      // Clear auth cache
      authService.clearCache(validUserId);
    } catch (err) {
      //console.error('Failed to delete user:', err);
      throw err;
    }
  };

  return {
    users: filteredUsers,
    loading,
    filters,
    authError,
    updateSearchQuery,
    updateRoleFilter,
    editUser,
    deleteUser,
    allLocations,
    setAllLocations,
  };
};
