import {
  API_BASE_URL,
  ApiResponse,
  LoginRequest,
  LoginResponse,
  UserResponse,
  CreateUserRequest,
  ChangePasswordRequest,
  ChangePasswordResponse,
  DriverRequest,
  DriverResponse,
  VehicleRequest,
  VehicleResponse,
  TripResponse,
  TripRequest,
  TripGroupResponse,
  TripGroupRequest,
  CustomerResponse,
  CustomerRequest,
  TripPaymentResponse,
  TripPaymentRequest,
  DepositRecordResponse,
  DepositRecordRequest,
  AccountingSummaryResponse,
  CustomerAdvancePaymentResponse,
  CustomerAdvancePaymentRequest,
  CustomerAdvanceStatusUpdateRequest,
  DriverExpenseAdvanceResponse,
  DriverExpenseAdvanceRequest,
  DriverExpenseAdvanceStatusUpdateRequest,
  ExpenseVoucherResponse,
  ExpenseVoucherRequestPayload,
  ExpenseVoucherStatusUpdatePayload,
  ExpenseVoucherHistoryResponse,
  ExpenseSummaryResponse,
  DriverDailySummaryResponse,
} from './api';

class ApiService {
  private buildUrl(path: string): string {
    return API_BASE_URL + path;
  }

  private getAuthHeaders(mode: 'json' | 'multipart' = 'json'): HeadersInit {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (mode === 'json') {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  private normalizeDate(value?: string | null): string | undefined {
    if (!value) {
      return undefined;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (trimmed.includes('T')) {
      const [datePart, timePart] = trimmed.split('T');
      const time = (timePart || '00:00:00').replace('Z', '');
      return `${datePart} ${time.length === 5 ? `${time}:00` : time}`;
    }
    if (trimmed.includes(' ')) {
      return trimmed;
    }
    return `${trimmed} 00:00:00`;
  }

  private buildMultipartPayload<T>(payload: T, files: File[] = [], fileField: string = 'images'): FormData {
    const formData = new FormData();
    formData.append('payload', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    files.forEach((file) => {
      formData.append(fileField, file);
    });
    return formData;
  }

  // Authentication APIs
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(this.buildUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return this.handleResponse<LoginResponse>(response);
  }

  async changePassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const response = await fetch(this.buildUrl('/auth/change-password'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<ChangePasswordResponse>(response);
  }

  async getUsers(keyword?: string, page: number = 0, size: number = 10): Promise<ApiResponse<UserResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (keyword) params.append('q', keyword);

    const response = await fetch(`${this.buildUrl('/auth/users')}?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ApiResponse<UserResponse>>(response);
  }

  async createUser(request: CreateUserRequest): Promise<UserResponse> {
    const response = await fetch(this.buildUrl('/auth/users'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<UserResponse>(response);
  }

  async updateUser(id: number, request: CreateUserRequest): Promise<UserResponse> {
    const response = await fetch(this.buildUrl(`/auth/users/${id}`), {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<UserResponse>(response);
  }

  async deleteUser(id: number): Promise<void> {
    const response = await fetch(this.buildUrl(`/auth/users/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.status}`);
    }
  }

  // Driver APIs
  async getDrivers(keyword?: string, page: number = 0, size: number = 10): Promise<ApiResponse<DriverResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (keyword) params.append('q', keyword);

    const response = await fetch(`${this.buildUrl('/drivers')}?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ApiResponse<DriverResponse>>(response);
  }

  async getDriver(id: number): Promise<DriverResponse> {
    const response = await fetch(this.buildUrl(`/drivers/${id}`), {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<DriverResponse>(response);
  }

  async createDriver(request: DriverRequest): Promise<DriverResponse> {
    const payload = {
      ...request,
      licenseExpiry: this.normalizeDate(request.licenseExpiry),
      dateOfBirth: this.normalizeDate(request.dateOfBirth),
      joinDate: this.normalizeDate(request.joinDate),
    };
    const response = await fetch(this.buildUrl('/drivers'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<DriverResponse>(response);
  }

  async updateDriver(id: number, request: DriverRequest): Promise<DriverResponse> {
    const payload = {
      ...request,
      licenseExpiry: this.normalizeDate(request.licenseExpiry),
      dateOfBirth: this.normalizeDate(request.dateOfBirth),
      joinDate: this.normalizeDate(request.joinDate),
    };
    const response = await fetch(this.buildUrl(`/drivers/${id}`), {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<DriverResponse>(response);
  }

  async deleteDriver(id: number): Promise<void> {
    const response = await fetch(this.buildUrl(`/drivers/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete driver: ${response.status}`);
    }
  }

  // Vehicle APIs
  async getVehicles(keyword?: string, page: number = 0, size: number = 10): Promise<ApiResponse<VehicleResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    if (keyword) params.append('q', keyword);

    const response = await fetch(`${this.buildUrl('/vehicles')}?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ApiResponse<VehicleResponse>>(response);
  }

  async getVehicle(id: number): Promise<VehicleResponse> {
    const response = await fetch(this.buildUrl(`/vehicles/${id}`), {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<VehicleResponse>(response);
  }

  async createVehicle(request: VehicleRequest): Promise<VehicleResponse> {
    const response = await fetch(this.buildUrl('/vehicles'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<VehicleResponse>(response);
  }

  async updateVehicle(id: number, request: VehicleRequest): Promise<VehicleResponse> {
    const response = await fetch(this.buildUrl(`/vehicles/${id}`), {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<VehicleResponse>(response);
  }

  async deleteVehicle(id: number): Promise<void> {
    const response = await fetch(this.buildUrl(`/vehicles/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete vehicle: ${response.status}`);
    }
  }

  // Trip APIs
  async getTrips(status?: string, page: number = 0, size: number = 100): Promise<ApiResponse<TripResponse>> {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (status) params.append('status', status);

    const response = await fetch(`${this.buildUrl('/trips')}?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ApiResponse<TripResponse>>(response);
  }

  async getTrip(id: number): Promise<TripResponse> {
    const response = await fetch(this.buildUrl(`/trips/${id}`), {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<TripResponse>(response);
  }

  async createTrip(request: TripRequest): Promise<TripResponse> {
    const response = await fetch(this.buildUrl('/trips'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<TripResponse>(response);
  }

  async updateTrip(id: number, request: TripRequest): Promise<TripResponse> {
    const response = await fetch(this.buildUrl(`/trips/${id}`), {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<TripResponse>(response);
  }

  async deleteTrip(id: number): Promise<void> {
    const response = await fetch(this.buildUrl(`/trips/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete trip: ${response.status}`);
    }
  }

  // Payment APIs
  async getTripPayments(driverId?: number, page: number = 0, size: number = 100): Promise<ApiResponse<TripPaymentResponse>> {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (driverId != null) {
      params.append('driverId', driverId.toString());
    }
    const response = await fetch(`${this.buildUrl('/payments/trips')}?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ApiResponse<TripPaymentResponse>>(response);
  }

  async createTripPayment(request: TripPaymentRequest, attachments: File[] = []): Promise<TripPaymentResponse> {
    const payload = this.buildMultipartPayload(request, attachments);
    const response = await fetch(this.buildUrl('/payments/trips'), {
      method: 'POST',
      headers: this.getAuthHeaders('multipart'),
      body: payload,
    });
    return this.handleResponse<TripPaymentResponse>(response);
  }

  async deleteTripPayment(id: number): Promise<void> {
    const response = await fetch(this.buildUrl(`/payments/trips/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete payment: ${response.status}`);
    }
  }

  async getDepositRecords(driverId?: number, page: number = 0, size: number = 100): Promise<ApiResponse<DepositRecordResponse>> {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (driverId != null) {
      params.append('driverId', driverId.toString());
    }
    const response = await fetch(`${this.buildUrl('/payments/deposits')}?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ApiResponse<DepositRecordResponse>>(response);
  }

  async createDepositRecord(request: DepositRecordRequest, attachments: File[] = []): Promise<DepositRecordResponse> {
    const payload = this.buildMultipartPayload(request, attachments);
    const response = await fetch(this.buildUrl('/payments/deposits'), {
      method: 'POST',
      headers: this.getAuthHeaders('multipart'),
      body: payload,
    });
    return this.handleResponse<DepositRecordResponse>(response);
  }

  async deleteDepositRecord(id: number): Promise<void> {
    const response = await fetch(this.buildUrl(`/payments/deposits/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete deposit record: ${response.status}`);
    }
  }

  async getCustomerAdvancePayments(
    status?: string,
    tripId?: number,
    page: number = 0,
    size: number = 100,
  ): Promise<ApiResponse<CustomerAdvancePaymentResponse>> {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (status) params.append('status', status);
    if (tripId != null) params.append('tripId', tripId.toString());

    const response = await fetch(`${this.buildUrl('/payments/customer-advances')}?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ApiResponse<CustomerAdvancePaymentResponse>>(response);
  }

  async createCustomerAdvancePayment(
    request: CustomerAdvancePaymentRequest,
    attachments: File[] = [],
  ): Promise<CustomerAdvancePaymentResponse> {
    const payload = this.buildMultipartPayload(request, attachments);
    const response = await fetch(this.buildUrl('/payments/customer-advances'), {
      method: 'POST',
      headers: this.getAuthHeaders('multipart'),
      body: payload,
    });
    return this.handleResponse<CustomerAdvancePaymentResponse>(response);
  }

  async updateCustomerAdvanceStatus(
    id: number,
    request: CustomerAdvanceStatusUpdateRequest,
  ): Promise<CustomerAdvancePaymentResponse> {
    const response = await fetch(this.buildUrl(`/payments/customer-advances/${id}/status`), {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<CustomerAdvancePaymentResponse>(response);
  }

  async getDriverExpenseAdvances(
    driverId?: number,
    status?: string,
    page: number = 0,
    size: number = 100,
  ): Promise<ApiResponse<DriverExpenseAdvanceResponse>> {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (driverId != null) params.append('driverId', driverId.toString());
    if (status) params.append('status', status);

    const response = await fetch(`${this.buildUrl('/payments/driver-advances')}?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ApiResponse<DriverExpenseAdvanceResponse>>(response);
  }

  async createDriverExpenseAdvance(
    request: DriverExpenseAdvanceRequest,
    attachments: File[] = [],
  ): Promise<DriverExpenseAdvanceResponse> {
    const payload = this.buildMultipartPayload(request, attachments);
    const response = await fetch(this.buildUrl('/payments/driver-advances'), {
      method: 'POST',
      headers: this.getAuthHeaders('multipart'),
      body: payload,
    });
    return this.handleResponse<DriverExpenseAdvanceResponse>(response);
  }

  async updateDriverExpenseAdvanceStatus(
    id: number,
    request: DriverExpenseAdvanceStatusUpdateRequest,
  ): Promise<DriverExpenseAdvanceResponse> {
    const response = await fetch(this.buildUrl(`/payments/driver-advances/${id}/status`), {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<DriverExpenseAdvanceResponse>(response);
  }

  async getAccountingSummary(from?: string, to?: string): Promise<AccountingSummaryResponse> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const query = params.toString();
    const url = `${this.buildUrl('/payments/summary')}${query ? `?${query}` : ''}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<AccountingSummaryResponse>(response);
  }

  async getDriverDailySummary(driverId: number, date: string): Promise<DriverDailySummaryResponse> {
    const params = new URLSearchParams({ date });
    const response = await fetch(
      `${this.buildUrl(`/drivers/${driverId}/daily-summary`)}?${params}`,
      { headers: this.getAuthHeaders() }
    );
    return this.handleResponse<DriverDailySummaryResponse>(response);
  }

  // Expense voucher APIs
  async getExpenseVouchers(options: {
    status?: string;
    category?: string;
    from?: string;
    to?: string;
    createdBy?: number;
    walletId?: number;
    page?: number;
    size?: number;
  } = {}): Promise<ApiResponse<ExpenseVoucherResponse>> {
    const params = new URLSearchParams({
      page: String(options.page ?? 0),
      size: String(options.size ?? 20),
    });
    if (options.status) params.append('status', options.status);
    if (options.category) params.append('category', options.category);
    if (options.from) params.append('from', options.from);
    if (options.to) params.append('to', options.to);
    if (options.createdBy != null) params.append('createdBy', options.createdBy.toString());
    if (options.walletId != null) params.append('walletId', options.walletId.toString());

    const response = await fetch(`${this.buildUrl('/expenses/vouchers')}?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ApiResponse<ExpenseVoucherResponse>>(response);
  }

  async getExpenseVoucher(id: number): Promise<ExpenseVoucherResponse> {
    const response = await fetch(this.buildUrl(`/expenses/vouchers/${id}`), {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ExpenseVoucherResponse>(response);
  }

  async createExpenseVoucher(
    payload: ExpenseVoucherRequestPayload,
    attachments: File[] = [],
  ): Promise<ExpenseVoucherResponse> {
    if (attachments.length > 0) {
      const formData = this.buildMultipartPayload(payload, attachments);
      const response = await fetch(this.buildUrl('/expenses/vouchers'), {
        method: 'POST',
        headers: this.getAuthHeaders('multipart'),
        body: formData,
      });
      return this.handleResponse<ExpenseVoucherResponse>(response);
    }

    const response = await fetch(this.buildUrl('/expenses/vouchers'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<ExpenseVoucherResponse>(response);
  }

  async updateExpenseVoucher(
    id: number,
    payload: ExpenseVoucherRequestPayload,
    attachments: File[] = [],
  ): Promise<ExpenseVoucherResponse> {
    if (attachments.length > 0) {
      const formData = this.buildMultipartPayload(payload, attachments);
      const response = await fetch(this.buildUrl(`/expenses/vouchers/${id}`), {
        method: 'PUT',
        headers: this.getAuthHeaders('multipart'),
        body: formData,
      });
      return this.handleResponse<ExpenseVoucherResponse>(response);
    }

    const response = await fetch(this.buildUrl(`/expenses/vouchers/${id}`), {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<ExpenseVoucherResponse>(response);
  }

  async updateExpenseVoucherStatus(
    id: number,
    payload: ExpenseVoucherStatusUpdatePayload,
    attachments: File[] = [],
  ): Promise<ExpenseVoucherResponse> {
    if (attachments.length > 0) {
      const formData = this.buildMultipartPayload(payload, attachments);
      const response = await fetch(this.buildUrl(`/expenses/vouchers/${id}/status`), {
        method: 'PATCH',
        headers: this.getAuthHeaders('multipart'),
        body: formData,
      });
      return this.handleResponse<ExpenseVoucherResponse>(response);
    }

    const response = await fetch(this.buildUrl(`/expenses/vouchers/${id}/status`), {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<ExpenseVoucherResponse>(response);
  }

  async getExpenseVoucherHistory(id: number): Promise<ExpenseVoucherHistoryResponse[]> {
    const response = await fetch(this.buildUrl(`/expenses/vouchers/${id}/history`), {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ExpenseVoucherHistoryResponse[]>(response);
  }

  async exportAccountingReport(from?: string, to?: string): Promise<Blob> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);

    const url = this.buildUrl(`/reports/accounting/export${params.toString() ? '?' + params.toString() : ''}`);
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Lỗi khi tải báo cáo' }));
      throw new Error(error.message || 'Lỗi khi tải báo cáo');
    }

    return response.blob();
  }

  async getExpenseSummary(from?: string, to?: string): Promise<ExpenseSummaryResponse> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const url = `${this.buildUrl('/expenses/summary')}${params.toString() ? `?${params}` : ''}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ExpenseSummaryResponse>(response);
  }

  // Trip group APIs
  async getTripGroups(status?: string, page: number = 0, size: number = 100): Promise<ApiResponse<TripGroupResponse>> {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (status) params.append('status', status);

    const response = await fetch(`${this.buildUrl('/trip-groups')}?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ApiResponse<TripGroupResponse>>(response);
  }

  async getTripGroup(id: number): Promise<TripGroupResponse> {
    const response = await fetch(this.buildUrl(`/trip-groups/${id}`), {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<TripGroupResponse>(response);
  }

  async createTripGroup(request: TripGroupRequest): Promise<TripGroupResponse> {
    const response = await fetch(this.buildUrl('/trip-groups'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<TripGroupResponse>(response);
  }

  async updateTripGroup(id: number, request: TripGroupRequest): Promise<TripGroupResponse> {
    const response = await fetch(this.buildUrl(`/trip-groups/${id}`), {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<TripGroupResponse>(response);
  }

  async deleteTripGroup(id: number): Promise<void> {
    const response = await fetch(this.buildUrl(`/trip-groups/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete trip group: ${response.status}`);
    }
  }

  // Customer APIs
  async searchCustomers(query?: string, page: number = 0, size: number = 100): Promise<ApiResponse<CustomerResponse>> {
    const params = new URLSearchParams({ page: page.toString(), size: size.toString() });
    if (query) params.append('q', query);

    const response = await fetch(`${this.buildUrl('/customers')}?${params}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<ApiResponse<CustomerResponse>>(response);
  }

  async getCustomer(id: number): Promise<CustomerResponse> {
    const response = await fetch(this.buildUrl(`/customers/${id}`), {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse<CustomerResponse>(response);
  }

  async createCustomer(request: CustomerRequest): Promise<CustomerResponse> {
    const response = await fetch(this.buildUrl('/customers'), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<CustomerResponse>(response);
  }

  async updateCustomer(id: number, request: CustomerRequest): Promise<CustomerResponse> {
    const response = await fetch(this.buildUrl(`/customers/${id}`), {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<CustomerResponse>(response);
  }

  async deleteCustomer(id: number): Promise<void> {
    const response = await fetch(this.buildUrl(`/customers/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete customer: ${response.status}`);
    }
  }
}

export const apiService = new ApiService();
