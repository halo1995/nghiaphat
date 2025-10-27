// This file now serves as a compatibility layer for existing imports
// All actual API calls should use the hooks in hooks/useApi.ts

import type { LoginRequest, UserResponse, CreateUserRequest } from '@/services/api';
import { apiService } from '@/services/apiService';

// Legacy interface for compatibility
export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'dispatcher' | 'call_center' | 'driver' | 'accountant';
  email: string;
  phone: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  name: string;
  role: User['role'];
  email?: string;
  phone?: string;
}

export interface UpdateUserPayload {
  username: string;
  password?: string;
  name: string;
  role: User['role'];
  email?: string;
  phone?: string;
}

// Legacy functions - use useLogin hook instead
export const login = async (username: string, password: string) => {
  const response = await apiService.login({ username, password });
  localStorage.setItem('token', response.token);
  localStorage.setItem('user', JSON.stringify(response.user));
  return response.user;
};


export const getUsers = async (): Promise<User[]> => {
  const response = await apiService.getUsers();
  return response.content.map(mapUserResponseToUser);
};

export const createUser = async (payload: CreateUserPayload) => {
  const request: CreateUserRequest = {
    username: payload.username,
    password: payload.password,
    name: payload.name,
    role: mapRoleToBackend(payload.role),
    email: payload.email ?? '',
    phone: payload.phone ?? '',
  };

  const response = await apiService.createUser(request);
  return mapUserResponseToUser(response);
};

export const updateUser = async (userId: string, payload: UpdateUserPayload) => {
  const id = Number(userId);
  if (Number.isNaN(id)) {
    throw new Error('userId không hợp lệ');
  }
  const request: CreateUserRequest = {
    username: payload.username,
    password: payload.password ?? '',
    name: payload.name,
    role: mapRoleToBackend(payload.role),
    email: payload.email ?? '',
    phone: payload.phone ?? '',
  };

  const response = await apiService.updateUser(id, request);
  return mapUserResponseToUser(response);
};

export const deleteUser = async (userId: string) => {
  const id = Number(userId);
  if (Number.isNaN(id)) {
    throw new Error('userId không hợp lệ');
  }
  await apiService.deleteUser(id);
};
export const changePassword = async (oldPassword: string, newPassword: string) => {
  console.log('Changing password (mocked):', { oldPassword, newPassword });
  return Promise.resolve({ success: true, message: 'Password changed successfully (mocked)' });
};
export const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token'); // Assuming you also store a token
};

// Helper functions
export const mapUserResponseToUser = (response: UserResponse): User => {
  return {
    id: response.id.toString(),
    username: response.username,
    password: '', // Don't expose password from API response
    name: response.name,
    role: mapRoleToFrontend(response.role),
    email: response.email,
    phone: response.phone,
    createdAt: response.createdAt,
    lastLogin: response.lastLogin,
  };
};

const mapRoleToFrontend = (role: string): User['role'] => {
  const roleMap = {
    'ADMIN': 'admin',
    'DISPATCHER': "dispatcher", 
    'CALL_CENTER': 'call_center',
    'DRIVER': 'driver',
    'ACCOUNTANT': 'accountant',
  };
  return roleMap[role] || 'call_center';
};

const mapRoleToBackend = (role: User['role']): 'ADMIN' | 'DISPATCHER' | 'CALL_CENTER' | 'DRIVER' | 'ACCOUNTANT' => {
  switch (role) {
    case 'admin':
      return 'ADMIN';
    case 'dispatcher':
      return 'DISPATCHER';
    case 'accountant':
      return 'ACCOUNTANT';
    case 'driver':
      return 'DRIVER';
    case 'call_center':
    default:
      return 'CALL_CENTER';
  }
};

export const mapVietnameseStatusToBackend = (status: string): 'HOAT_DONG' | 'NGHI_PHEP' | 'NGUNG_HOAT_DONG' => {
  // This function would map Vietnamese status to backend enum values
  // Implementation depends on specific mapping requirements
  return 'HOAT_DONG';
};

// Legacy function for compatibility
export const setCurrentUser = (user: User) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export type { UserResponse };
