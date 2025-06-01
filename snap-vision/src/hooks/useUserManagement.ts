// src/hooks/useUserManagement.ts
import { useState, useEffect } from 'react';
import { User, UserFilters } from '../types/User';
//import { firestore } from '../services';

export const useUserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<UserFilters>({
    role: 'All',
    searchQuery: '',
  });
  const [loading, setLoading] = useState(true);

  // Mock data for now - replace with Firebase calls
  const mockUsers: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'johndoe@example.com',
      role: 'Admin',
      status: 'Active',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'janesmith@example.com',
      role: 'Admin',
      status: 'Active',
    },
    {
      id: '3',
      name: 'James Wilson',
      email: 'jameswilson@example.com',
      role: 'Viewer',
      status: 'Inactive',
    },
  ];

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 1000);
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
    // TODO: Implement edit user functionality
    console.log('Edit user:', user);
  };

  const deleteUser = async (user: User) => {
    // TODO: Implement delete user functionality
    console.log('Delete user:', user);
    // For now, just remove from local state
    setUsers(prev => prev.filter(u => u.id !== user.id));
  };

  const toggleUserStatus = async (user: User) => {
    // TODO: Implement toggle status functionality
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    console.log('Toggle status for:', user.name, 'to:', newStatus);
    
    // Update local state
    setUsers(prev =>
      prev.map(u =>
        u.id === user.id ? { ...u, status: newStatus } : u
      )
    );
  };

  const bulkDeactivate = async () => {
    // TODO: Implement bulk deactivate functionality
    console.log('Bulk deactivate users');
    setUsers(prev =>
      prev.map(user => ({ ...user, status: 'Inactive' as const }))
    );
  };

  const addNewUser = () => {
    // TODO: Navigate to add user screen or show modal
    console.log('Add new user');
  };

  return {
    users: filteredUsers,
    loading,
    filters,
    updateSearchQuery,
    updateRoleFilter,
    editUser,
    deleteUser,
    toggleUserStatus,
    bulkDeactivate,
    addNewUser,
  };
};