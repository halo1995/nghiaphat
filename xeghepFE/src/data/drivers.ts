// This file now serves as a compatibility layer for existing imports
// All actual API calls should use the hooks in hooks/useApi.ts

import { DriverRequest, DriverResponse } from '@/services/api';
import { apiService } from '@/services/apiService';

export interface Driver {
  id: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseExpiry: string;
  address: string;
  dateOfBirth: string;
  joinDate: string;
  statusCode: DriverResponse['status'];
  status: 'Hoạt động' | 'Nghỉ phép' | 'Ngừng hoạt động';
  avatar?: string;
  vehicleId?: string;
  totalTrips: number;
  rating: number;
  totalEarnings: number;
  outstandingBalance: number;
}

const STATUS_BACKEND_TO_FRONT: Record<DriverResponse['status'], Driver['status']> = {
  HOAT_DONG: 'Hoạt động',
  NGHI_PHEP: 'Nghỉ phép',
  NGUNG_HOAT_DONG: 'Ngừng hoạt động',
};

export const mapDriverResponseToDriver = (driver: DriverResponse): Driver => ({
  id: driver.id.toString(),
  username: driver.username,
  name: driver.name,
  phone: driver.phone,
  email: driver.email,
  licenseNumber: driver.licenseNumber,
  licenseExpiry: driver.licenseExpiry,
  address: driver.address,
  dateOfBirth: driver.dateOfBirth,
  joinDate: driver.joinDate,
  statusCode: driver.status,
  status: STATUS_BACKEND_TO_FRONT[driver.status],
  avatar: driver.avatar ?? undefined,
  vehicleId: driver.vehicleId != null ? driver.vehicleId.toString() : undefined,
  totalTrips: driver.totalTrips,
  rating: driver.rating,
  totalEarnings: driver.totalEarnings,
  outstandingBalance: driver.outstandingBalance,
});

// Legacy functions - use useDrivers hook instead
export const getDrivers = async (): Promise<Driver[]> => {
  const response = await apiService.getDrivers(undefined, 0, 1000); // Get up to 1000 drivers
  return response.content.map(mapDriverResponseToDriver);
};

export const getDriver = async (id: number): Promise<Driver> => {
  const driver = await apiService.getDriver(id);
  return mapDriverResponseToDriver(driver);
};

export const addDriver = async (driver: DriverRequest) => {
  return await apiService.createDriver(driver);
};

export const updateDriver = async (id: number, driver: DriverRequest) => {
  return await apiService.updateDriver(id, driver);
};

export const deleteDriver = async (id: number) => {
  return await apiService.deleteDriver(id);
};



