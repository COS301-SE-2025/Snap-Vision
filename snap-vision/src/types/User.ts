// src/types/User.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Viewer';
  status: 'Active' | 'Inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserFilters {
  role: 'All' | 'Admin' | 'Viewer';
  searchQuery: string;
}