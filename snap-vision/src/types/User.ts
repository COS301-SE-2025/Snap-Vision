export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Viewer' | 'Editor';
  status?: 'Active' | 'Inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserFilters {
  role: 'All' | 'Admin' | 'Viewer' | 'Editor';
  searchQuery: string;
}
