import { VehicleResponse } from '../services/api';
import { DriverResponse } from '../services/api';
import { UserResponse } from '../services/api';

// Vehicle mapping functions for frontend
export const mapVehicleResponseToVehicleDTO = (response: VehicleResponse): any => {
  return {
    id: response.id.toString(),
    name: response.name,
    brand: response.brand,
    model: response.model,
    year: response.year,
    licensePlate: response.licensePlate,
    color: response.color,
    seats: response.seats,
    fuelType: response.fuelType,
    status: response.status,
    mileage: response.mileage,
    lastMaintenance: formatDate(response.lastMaintenance),
    nextMaintenance: formatDate(response.nextMaintenance),
    image: response.image,
    totalTrips: response.totalTrips,
    rating: response.rating,
  };
};

export const mapDriverResponseToDriverDTO = (response: DriverResponse): any => {
  return {
    id: response.id.toString(),
    name: response.name,
    phone: response.phone,
    email: response.email,
    licenseNumber: response.licenseNumber,
    licenseExpiry: response.licenseExpiry,
    address: response.address,
    dateOfBirth: response.dateOfBirth,
    joinDate: response.joinDate,
    status: mapVietnameseStatusToVietnamese(response.status),
    avatar: response.avatar,
    vehicleId: response.vehicleId?.toString(),
    totalTrips: response.totalTrips,
    rating: response.rating,
    totalEarnings: response.totalEarnings,
    outstandingBalance: response.outstandingBalance,
  };
};

// User mapping functions
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
  };
  return roleMap[role] || 'call_center';
};

export const mapVietnameseStatusToBackend = (status: string) => 'HOAT_DONG' | 'NGHI_PHEP' | 'NGUNG_HOAT_DONG' => {
  const statusMap = {
    'Hoạt động': 'HOAT_DONG',
    'Nghỉ phép': 'NGHI_PHEP',
    'Ngừng hoạt động': 'NGUNG_HOAT_DONG',
  };
  return statusMap[status] || 'HOAT_DONG';
};

export const mapVietnameseStatusToBackendDriver = (status: string): 'HOAT_DONG' | 'NGHI_PHEP' | 'NGUNG_HOAT_DONG' => {
  const statusMap = {
    'Hoạt động': 'HOAT_DONG',
    'Nghỉ phép': 'NGHI_PHEP',
    'Ngừng hoạt động': 'NGUNG_HOAT_DONG',
  };
  return statusMap[status] || 'HOAT_DONG';
};

export const mapDriverToRequest = (dto: any): any => {
  return {
    name: dto.name,
    phone: dto.phone,
    email: dto.email,
    licenseNumber: dto.licenseNumber,
    licenseExpiry: dto.licenseExpiry,
    address: dto.address,
    dateOfBirth: dto.dateOfBirth,
    status: mapVietnameseStatusToBackend(dto.status),
    avatar: dto.avatar,
    vehicleId: dto.vehicleId ? parseInt(dto.vehicleId) : null,
  };
};

export const getDrivers = async (): Promise<Driver[]> => {
  try {
    const response = await driverService.getDrivers();
    return response.content.map(mapDriverResponseToDTO);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    // Fallback to mock data
    return drivers;
  }
};

export const getDriverById = async (id: string): Promise<Driver | undefined> => {
  try {
    const response = await driverService.getDriverById(parseInt(id));
    return mapDriverResponseToDriverDTO(response);
  } catch (error) {
    console.error('Error fetching driver by ID:', error);
    // Fallback to mock data
    return drivers.find(d => d.id === id);
  }
};

export const searchDrivers = async (keyword?: string): Promise<Driver[]> => {
  try {
    const response = await driverService.searchDrivers(keyword);
    return response.content.map(mapDriverResponseToDriverDTO);
  } catch (error) {
    console.error('Error searching drivers:', error);
    // Fallback to filtered mock data
    return keyword 
      ? drivers.filter(d => d.name.toLowerCase().includes(keyword.toLowerCase()))
      : drivers;
  }
};

// Mock fallback authentication
const mockLogin = async (username: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const user = users.find(u => u.username === username && u.password === password);
      if (user) {
        const updatedUser = { ...user, lastLogin: new Date().toISOString() };
        const index = users.findIndex(u => u.id === user.id);
        users[index] = updatedUser;
        resolve(updatedUser);
      } else {
        reject(new Error('Tên đăng nhập hoặc mật khẩu không đúng'));
      }
    }, 500);
  });
};
