// This file now serves as a compatibility layer for existing imports
// All actual API calls should use the hooks in hooks/useApi.ts

import { VehicleRequest, VehicleResponse } from '@/services/api';
import { apiService } from '@/services/apiService';

// Legacy functions - use useVehicles hook instead
const STATUS_BACKEND_TO_FRONT: Record<VehicleResponse['status'], Vehicle['status']> = {
  SAN_SANG: 'Sẵn sàng',
  DANG_CHAY: 'Đang chạy',
  BAO_TRI: 'Bảo trì',
  NGUNG_HOAT_DONG: 'Ngừng hoạt động',
};

const STATUS_FRONT_TO_BACK: Record<Vehicle['status'], VehicleResponse['status']> = {
  'Sẵn sàng': 'SAN_SANG',
  'Đang chạy': 'DANG_CHAY',
  'Bảo trì': 'BAO_TRI',
  'Ngừng hoạt động': 'NGUNG_HOAT_DONG',
};

const FUEL_BACKEND_TO_FRONT: Record<VehicleResponse['fuelType'], Vehicle['fuelType']> = {
  XANG: 'Xăng',
  DAU: 'Dầu',
  DIEN: 'Điện',
  HYBRID: 'Hybrid',
};

const FUEL_FRONT_TO_BACK: Record<Vehicle['fuelType'], VehicleResponse['fuelType']> = {
  Xăng: 'XANG',
  Dầu: 'DAU',
  Điện: 'DIEN',
  Hybrid: 'HYBRID',
};

const normalizeDateForBackend = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.includes('T')) {
    const [datePart, timePart = '00:00:00'] = trimmed.split('T');
    const sanitizedTime = timePart.replace('Z', '');
    const normalizedTime = sanitizedTime.length === 5 ? `${sanitizedTime}:00` : sanitizedTime;
    return `${datePart} ${normalizedTime}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed} 00:00:00`;
  }
  return trimmed;
};

const mapVehicleResponse = (vehicle: VehicleResponse): Vehicle => ({
  id: vehicle.id.toString(),
  name: vehicle.name,
  brand: vehicle.brand,
  model: vehicle.model,
  year: vehicle.year,
  licensePlate: vehicle.licensePlate,
  color: vehicle.color,
  seats: vehicle.seats,
  fuelType: FUEL_BACKEND_TO_FRONT[vehicle.fuelType],
  status: STATUS_BACKEND_TO_FRONT[vehicle.status],
  mileage: vehicle.mileage,
  lastMaintenance: vehicle.lastMaintenance,
  nextMaintenance: vehicle.nextMaintenance,
  image: vehicle.image,
  totalTrips: vehicle.totalTrips,
  rating: vehicle.rating,
});

export const getVehicles = async (): Promise<Vehicle[]> => {
  const response = await apiService.getVehicles(undefined, 0, 1000); // Get up to 1000 vehicles
  return response.content.map(mapVehicleResponse);
};

export const getVehicleById = async (id: string): Promise<Vehicle> => {
  const vehicle = await apiService.getVehicle(parseInt(id));
  return mapVehicleResponse(vehicle);
};

export type VehiclePayload = {
  name: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  color: string;
  seats: number;
  fuelType: Vehicle['fuelType'];
  status: Vehicle['status'];
  mileage: number;
  lastMaintenance?: string;
  nextMaintenance?: string;
  image: string;
};

const toBackendRequest = (payload: VehiclePayload): VehicleRequest => ({
  name: payload.name,
  brand: payload.brand,
  model: payload.model,
  year: payload.year,
  licensePlate: payload.licensePlate,
  color: payload.color,
  seats: payload.seats,
  fuelType: FUEL_FRONT_TO_BACK[payload.fuelType],
  status: STATUS_FRONT_TO_BACK[payload.status],
  mileage: payload.mileage,
  lastMaintenance: normalizeDateForBackend(payload.lastMaintenance),
  nextMaintenance: normalizeDateForBackend(payload.nextMaintenance),
  image: payload.image,
});

export const addVehicle = async (payload: VehiclePayload) => {
  const request = toBackendRequest(payload);
  return apiService.createVehicle(request);
};

export const updateVehicle = async (id: string, payload: VehiclePayload) => {
  const request = toBackendRequest(payload);
  return apiService.updateVehicle(parseInt(id), request);
};

export const deleteVehicle = async (id: string) => {
  return await apiService.deleteVehicle(parseInt(id));
};

// Legacy interface for compatibility
export interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  color: string;
  seats: number;
  fuelType: 'Xăng' | 'Dầu' | 'Điện' | 'Hybrid';
  status: 'Sẵn sàng' | 'Đang chạy' | 'Bảo trì' | 'Ngừng hoạt động';
  mileage: number;
  lastMaintenance: string;
  nextMaintenance: string;
  image: string;
  totalTrips: number;
  rating: number;
}
