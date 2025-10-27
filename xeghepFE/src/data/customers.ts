import { apiService } from '@/services/apiService';
import type { CustomerResponse, CustomerRequest, CustomerStatus } from '@/services/api';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  joinDate: string;
  totalTrips: number;
  totalSpent: number;
  rating: number;
  avatar?: string;
  status: 'Hoạt động' | 'Ngừng hoạt động';
}

const STATUS_BACKEND_TO_FRONT: Record<CustomerStatus, Customer['status']> = {
  HOAT_DONG: 'Hoạt động',
  NGUNG_HOAT_DONG: 'Ngừng hoạt động',
};

const STATUS_FRONT_TO_BACK = Object.fromEntries(
  Object.entries(STATUS_BACKEND_TO_FRONT).map(([backend, frontend]) => [frontend, backend])
) as Record<Customer['status'], CustomerStatus>;

const toFrontendDate = (value?: string | null): string => {
  if (!value) return '';
  return value.includes('T') ? value : value.replace(' ', 'T');
};

const mapCustomer = (customer: CustomerResponse): Customer => ({
  id: customer.id.toString(),
  name: customer.name,
  phone: customer.phone ?? '',
  email: customer.email ?? '',
  address: customer.address ?? '',
  joinDate: toFrontendDate(customer.joinDate),
  totalTrips: customer.totalTrips ?? 0,
  totalSpent: customer.totalSpent ?? 0,
  rating: customer.rating ?? 0,
  avatar: customer.avatar ?? undefined,
  status: STATUS_BACKEND_TO_FRONT[customer.status],
});

export const getCustomers = async (): Promise<Customer[]> => {
  const response = await apiService.searchCustomers();
  return response.content.map(mapCustomer);
};

export const getCustomerById = async (id: string): Promise<Customer | undefined> => {
  const numericId = Number(id);
  if (Number.isNaN(numericId)) {
    return undefined;
  }
  const customer = await apiService.getCustomer(numericId);
  return mapCustomer(customer);
};

export type CustomerCreatePayload = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  status?: Customer['status'];
};

export const addCustomer = async (customer: CustomerCreatePayload): Promise<Customer> => {
  const request: CustomerRequest = {
    name: customer.name,
    phone: customer.phone?.trim() ? customer.phone : undefined,
    email: customer.email?.trim() ? customer.email : undefined,
    address: customer.address?.trim() ? customer.address : undefined,
    status: customer.status ? STATUS_FRONT_TO_BACK[customer.status] : undefined,
  };

  const created = await apiService.createCustomer(request);
  return mapCustomer(created);
};