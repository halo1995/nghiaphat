import { API_BASE_URL, ApiResponse, DriverResponse, DriverRequest } from './api';

class DriverService {
  private getHeaders(): Record<string, string> {
    const currentUser = localStorage.getItem('currentUser');
    const user = currentUser ? JSON.parse(currentUser) : null;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth header if user is logged in
    if (user && user.lastLogin) {
      // For now, we'll use basic auth. In production, use JWT
      const token = btoa(`${user.username}:user_password`);
      headers['Authorization'] = `Basic ${token}`;
    }
    
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }
    
    try {
      return await response.json();
    } catch (error) {
      throw new Error('Invalid JSON response');
    }
  }

  async getDrivers(page = 0, size = 20): Promise<ApiResponse<DriverResponse>> {
    const response = await fetch(`${API_BASE_URL}/drivers?page=${page}&size=${size}`, {
      headers: this.getHeaders(),
    });
    
    return this.handleResponse<ApiResponse<DriverResponse>>(response);
  }

  async getDriverById(id: number): Promise<DriverResponse> {
    const response = await fetch(`${API_BASE_URL}/drivers/${id}`, {
      headers: this.getHeaders(),
    });
    
    return this.handleResponse<DriverResponse>(response);
  }

  async searchDrivers(keyword?: string, page = 0, size = 20): Promise<ApiResponse<DriverResponse>> {
    const url = keyword 
      ? `${API_BASE_URL}/drivers?q=${encodeURIComponent(keyword)}&page=${page}&size=${size}`
      : `${API_BASE_URL}/drivers?page=${page}&size=${size}`;
    
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    
    return this.handleResponse<ApiResponse<DriverResponse>>(response);
  }

  async createDriver(driverData: DriverRequest): Promise<DriverResponse> {
    const response = await fetch(`${API_BASE_URL}/drivers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(driverData),
    });
    
    return this.handleResponse<DriverResponse>(response);
  }

  async updateDriver(id: number, driverData: DriverRequest): Promise<DriverResponse> {
    const response = await fetch(`${API_BASE_URL}/drivers/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(driverData),
    });
    
    return this.handleResponse<DriverResponse>(response);
  }

  async deleteDriver(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/drivers/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to delete driver. Status: ${response.status}`);
    }
  }
}

export default new DriverService();
