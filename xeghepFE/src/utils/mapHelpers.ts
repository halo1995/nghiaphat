import { UserResponse, User } from '../data/auth';

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

export const mapRoleToFrontend = (role: string): User['role'] => {
  const roleMap = {
    'ADMIN': 'admin',
    'DISPATCHER': "dispatcher", 
    'CALL_CENTER': 'call_center',
    'DRIVER': 'driver',
    'ACCOUNTANT': 'accountant',
  };
  return roleMap[role] || 'call_center';
};

export const mapVietnameseStatusToBackend = (status: string): 'HOAT_DONG' | 'NGHI_PHEP' | 'NGUNG_HOAT_DONG' => {
  const statusMap = {
    'Hoạt động': 'HOAT_DONG',
    'Nghỉ phép': 'NGHI_PHEP',
    'Ngừng hoạt động': 'NGUNG_HOAT_DONG',
  };
  return statusMap[status] || 'HOAT_DONG';
};
