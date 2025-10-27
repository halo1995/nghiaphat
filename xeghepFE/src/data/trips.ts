import { apiService } from '@/services/apiService';
import type {
  TripRequest,
  TripResponse,
  TripGroupRequest,
  TripGroupResponse,
} from '@/services/api';

export interface Trip {
  id: string;
  vehicleId?: string;
  vehicleName?: string;
  driverId?: string;
  driverName?: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  pickupProvinceCode?: string;
  pickupWardCode?: string;
  dropoffLocation: string;
  dropoffProvinceCode?: string;
  dropoffWardCode?: string;
  pickupTime: string;
  dropoffTime?: string;
  distance: number;
  price: number;
  status: 'Chờ xác nhận' | 'Đã xác nhận' | 'Đã ghép chuyến' | 'Đã phân xe' | 'Đang đón' | 'Đang đi' | 'Hoàn thành' | 'Đã hủy';
  passengers: number;
  notes?: string;
  rating?: number;
  createdAt: string;
  confirmedAt?: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  pickupConfirmed?: boolean;
  dropoffConfirmed?: boolean;
  groupId?: string;
}

export interface TripGroup {
  id: string;
  name: string;
  tripIds: string[];
  vehicleId?: string;
  vehicleName?: string;
  driverId?: string;
  driverName?: string;
  status: 'Đang ghép' | 'Đã phân xe' | 'Đang chạy' | 'Hoàn thành';
  createdAt: string;
  totalPassengers: number;
  totalRevenue: number;
}

const STATUS_BACKEND_TO_FRONT: Record<TripResponse['status'], Trip['status']> = {
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DA_XAC_NHAN: 'Đã xác nhận',
  DA_GHEP_CHUYEN: 'Đã ghép chuyến',
  DA_PHAN_XE: 'Đã phân xe',
  DANG_DON: 'Đang đón',
  DANG_DI: 'Đang đi',
  HOAN_THANH: 'Hoàn thành',
  DA_HUY: 'Đã hủy',
};

const STATUS_FRONT_TO_BACK = Object.fromEntries(
  Object.entries(STATUS_BACKEND_TO_FRONT).map(([backend, frontend]) => [frontend, backend])
) as Record<Trip['status'], TripResponse['status']>;

const GROUP_STATUS_BACKEND_TO_FRONT: Record<TripGroupResponse['status'], TripGroup['status']> = {
  DANG_GHEP: 'Đang ghép',
  DA_PHAN_XE: 'Đã phân xe',
  DANG_CHAY: 'Đang chạy',
  HOAN_THANH: 'Hoàn thành',
};

const GROUP_STATUS_FRONT_TO_BACK = Object.fromEntries(
  Object.entries(GROUP_STATUS_BACKEND_TO_FRONT).map(([backend, frontend]) => [frontend, backend])
) as Record<TripGroup['status'], TripGroupResponse['status']>;

const toFrontendDate = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  return value.includes('T') ? value : value.replace(' ', 'T');
};

const pad = (num: number) => num.toString().padStart(2, '0');

const toBackendDate = (value?: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    // Assume already in correct format but ensure seconds exist
    return value.replace('T', ' ').split('.')[0];
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const mapTripResponse = (trip: TripResponse): Trip => ({
  id: trip.id.toString(),
  vehicleId: trip.vehicleId != null ? trip.vehicleId.toString() : undefined,
  vehicleName: trip.vehicleName ?? undefined,
  driverId: trip.driverId != null ? trip.driverId.toString() : undefined,
  driverName: trip.driverName ?? undefined,
  customerName: trip.customerName,
  customerPhone: trip.customerPhone,
  pickupLocation: trip.pickupLocation,
  pickupProvinceCode: trip.pickupProvinceCode ?? undefined,
  pickupWardCode: trip.pickupWardCode ?? undefined,
  dropoffLocation: trip.dropoffLocation,
  dropoffProvinceCode: trip.dropoffProvinceCode ?? undefined,
  dropoffWardCode: trip.dropoffWardCode ?? undefined,
  pickupTime: toFrontendDate(trip.pickupTime) ?? '',
  dropoffTime: toFrontendDate(trip.dropoffTime) ?? undefined,
  distance: trip.distance ?? 0,
  price: Number(trip.price ?? 0),
  status: STATUS_BACKEND_TO_FRONT[trip.status],
  passengers: trip.passengers,
  notes: trip.notes ?? undefined,
  rating: trip.rating ?? undefined,
  createdAt: toFrontendDate(trip.createdAt) ?? '',
  confirmedAt: toFrontendDate(trip.confirmedAt) ?? undefined,
  assignedAt: toFrontendDate(trip.assignedAt) ?? undefined,
  startedAt: toFrontendDate(trip.startedAt) ?? undefined,
  completedAt: toFrontendDate(trip.completedAt) ?? undefined,
  pickupConfirmed: trip.pickupConfirmed ?? undefined,
  dropoffConfirmed: trip.dropoffConfirmed ?? undefined,
  groupId: trip.groupId ?? undefined,
});

const mapTripGroupResponse = (group: TripGroupResponse): TripGroup => ({
  id: group.id.toString(),
  name: group.name,
  tripIds: group.tripIds ? group.tripIds.split(',').map(id => id.trim()).filter(Boolean) : [],
  vehicleId: group.vehicleId != null ? group.vehicleId.toString() : undefined,
  vehicleName: group.vehicleName ?? undefined,
  driverId: group.driverId != null ? group.driverId.toString() : undefined,
  driverName: group.driverName ?? undefined,
  status: GROUP_STATUS_BACKEND_TO_FRONT[group.status],
  createdAt: toFrontendDate(group.createdAt) ?? '',
  totalPassengers: group.totalPassengers ?? 0,
  totalRevenue: group.totalRevenue ?? 0,
});

type TripForRequest = {
  vehicleId?: string | null;
  vehicleName?: string | null;
  driverId?: string | null;
  driverName?: string | null;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  pickupLocation: string;
  pickupProvinceCode?: string;
  pickupWardCode?: string;
  dropoffLocation: string;
  dropoffProvinceCode?: string;
  dropoffWardCode?: string;
  pickupTime: string;
  dropoffTime?: string;
  distance: number;
  price: number;
  passengers: number;
  notes?: string;
  status?: Trip['status'];
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  pickupConfirmed?: boolean;
  dropoffConfirmed?: boolean;
  groupId?: string;
};

const buildTripRequest = (trip: TripForRequest, overrideStatus?: Trip['status']): TripRequest => {
  
  const statusLabel = overrideStatus ?? trip.status ?? 'Chờ xác nhận';

  return {
    vehicleId: trip.vehicleId ? Number(trip.vehicleId) : null,
    vehicleName: trip.vehicleName ?? null,
    driverId: trip.driverId ? Number(trip.driverId) : null,
    driverName: trip.driverName ?? null,
    customerName: trip.customerName,
    customerPhone: trip.customerPhone,
    pickupLocation: trip.pickupLocation,
    pickupProvinceCode: trip.pickupProvinceCode ?? null,
    pickupWardCode: trip.pickupWardCode ?? null,
    dropoffLocation: trip.dropoffLocation,
    dropoffProvinceCode: trip.dropoffProvinceCode ?? null,
    dropoffWardCode: trip.dropoffWardCode ?? null,
    pickupTime: toBackendDate(trip.pickupTime) ?? '',
    dropoffTime: toBackendDate(trip.dropoffTime),
    distance: trip.distance,
    price: trip.price,
    passengers: trip.passengers,
    notes: trip.notes,
    status: STATUS_FRONT_TO_BACK[statusLabel],
    assignedAt: toBackendDate(trip.assignedAt),
    startedAt: toBackendDate(trip.startedAt),
    completedAt: toBackendDate(trip.completedAt),
    pickupConfirmed: typeof trip.pickupConfirmed === 'boolean' ? trip.pickupConfirmed : undefined,
    dropoffConfirmed: typeof trip.dropoffConfirmed === 'boolean' ? trip.dropoffConfirmed : undefined,
    groupId: trip.groupId ?? null,
  };
};

type TripGroupForRequest = Pick<TripGroup,
  'name' | 'tripIds' | 'vehicleId' | 'vehicleName' | 'driverId' | 'driverName' | 'status' | 'totalPassengers' | 'totalRevenue'
>;

const buildTripGroupRequest = (group: TripGroupForRequest): TripGroupRequest => ({
  name: group.name,
  tripIds: group.tripIds.length ? group.tripIds.join(',') : '',
  vehicleId: group.vehicleId ? Number(group.vehicleId) : undefined,
  vehicleName: group.vehicleName,
  driverId: group.driverId ? Number(group.driverId) : undefined,
  driverName: group.driverName,
  status: GROUP_STATUS_FRONT_TO_BACK[group.status],
  totalPassengers: group.totalPassengers,
  totalRevenue: group.totalRevenue,
});

export const getTrips = async (): Promise<Trip[]> => {
  const response = await apiService.getTrips();
  return response.content.map(mapTripResponse);
};

export const getTripById = async (id: string): Promise<Trip | undefined> => {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return undefined;
  }
  const trip = await apiService.getTrip(numericId);
  return mapTripResponse(trip);
};

export const createTrip = async (
  trip: TripForRequest
): Promise<Trip> => {
  const request = buildTripRequest(trip, 'Chờ xác nhận');
  const created = await apiService.createTrip(request);
  return mapTripResponse(created);
};

export const updateTrip = async (id: string, updates: Partial<Trip>): Promise<Trip> => {
  const current = await getTripById(id);
  if (!current) {
    throw new Error('Không tìm thấy chuyến đi để cập nhật');
  }
  const merged: Trip = {
    ...current,
    ...updates,
    status: updates.status ?? current.status,
  };
  const request = buildTripRequest(merged);
  const updated = await apiService.updateTrip(Number(id), request);
  const mapped = mapTripResponse(updated);
  return {
    ...mapped,
    vehicleId: merged.vehicleId ?? mapped.vehicleId,
    vehicleName: merged.vehicleName ?? mapped.vehicleName,
    driverId: merged.driverId ?? mapped.driverId,
    driverName: merged.driverName ?? mapped.driverName,
    groupId: merged.groupId ?? mapped.groupId,
    status: merged.status,
  };
};

export const deleteTrip = async (id: string): Promise<void> => {
  await apiService.deleteTrip(Number(id));
};

export const getTripGroups = async (): Promise<TripGroup[]> => {
  const response = await apiService.getTripGroups();
  return response.content.map(mapTripGroupResponse);
};

export const getTripGroupById = async (id: string): Promise<TripGroup | undefined> => {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return undefined;
  }
  const group = await apiService.getTripGroup(numericId);
  return mapTripGroupResponse(group);
};

export const createTripGroup = async (
  group: Omit<TripGroup, 'id' | 'createdAt'>
): Promise<TripGroup> => {
  const request = buildTripGroupRequest(group);
  const created = await apiService.createTripGroup(request);
  return mapTripGroupResponse(created);
};

export const updateTripGroup = async (
  id: string,
  updates: Partial<TripGroup>
): Promise<TripGroup> => {
  const current = await getTripGroupById(id);
  if (!current) {
    throw new Error('Không tìm thấy nhóm chuyến');
  }
  const merged: TripGroup = {
    ...current,
    ...updates,
  };
  const request = buildTripGroupRequest(merged);
  const updated = await apiService.updateTripGroup(Number(id), request);
  return mapTripGroupResponse(updated);
};

export const deleteTripGroup = async (id: string): Promise<void> => {
  await apiService.deleteTripGroup(Number(id));
};