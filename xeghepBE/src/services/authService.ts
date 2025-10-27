import { API_BASE_URL, LoginRequest, LoginResponse, UserResponse, CreateUserRequest, ChangePasswordRequest, ChangePasswordResponse } from './api';

class AuthService {
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
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

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(credentials),
    });
    
    return this.handleResponse<LoginResponse>(response);
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string): Promise<ChangePasswordResponse> {
    const response = await fetch(`${API_URL}/auth/change-password/${userId}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, oldPassword, newPassword }),
    });
    
    return this.handleResponse<ChangePasswordResponse>(response);
  }

  async getUsers(): Promise<UserResponse[]> {
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    const data = await this.handleResponse<{ content: UserResponse[] }>(response);
    return data.content;
  }

  async createUser(userData: CreateUserRequest): Promise<UserResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    
    return this.handleResponse<UserResponse>(response);
  }

  async getUserById(id: number): Promise<UserResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/users/${id}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    
    return this.handleResponse<UserResponse>(response);
  }

  async updateUser(id: number, userData: Partial<CreateUserRequest>): Promise<UserResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/users/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(userData),
    });
    
    return this.handleResponse<UserResponse>(response);
  }

  async deleteUser(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/users/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Failed to delete user. Status: ${response.status}`);
    }
  }
}

export default new AuthService();
