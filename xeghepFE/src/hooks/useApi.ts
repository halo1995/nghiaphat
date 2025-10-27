import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { apiService } from '../services/apiService';
import { LoginRequest, CreateUserRequest, ChangePasswordRequest, DriverRequest, VehicleRequest } from '../services/api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Auth hooks
export const useLogin = () => {
  return useMutation({
    mutationFn: (credentials: LoginRequest) => apiService.login(credentials),
  });
};

export const useChangePassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ChangePasswordRequest) => apiService.changePassword(request),
  });
};

export const useUsers = (keyword?: string, page: number = 0, size: number = 10) => {
  return useQuery({
    queryKey: ['users', keyword, page, size],
    queryFn: () => apiService.getUsers(keyword, page, size),
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateUserRequest) => apiService.createUser(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: CreateUserRequest }) => 
      apiService.updateUser(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// Driver hooks
export const useDrivers = (keyword?: string, page: number = 0, size: number = 10) => {
  return useQuery({
    queryKey: ['drivers', keyword, page, size],
    queryFn: () => apiService.getDrivers(keyword, page, size),
  });
};

export const useDriver = (id: number) => {
  return useQuery({
    queryKey: ['driver', id],
    queryFn: () => apiService.getDriver(id),
    enabled: !!id,
  });
};

export const useCreateDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: DriverRequest) => apiService.createDriver(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
};

export const useUpdateDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: DriverRequest }) => 
      apiService.updateDriver(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
};

export const useDeleteDriver = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiService.deleteDriver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
  });
};

// Vehicle hooks
export const useVehicles = (keyword?: string, page: number = 0, size: number = 10) => {
  return useQuery({
    queryKey: ['vehicles', keyword, page, size],
    queryFn: () => apiService.getVehicles(keyword, page, size),
  });
};

export const useVehicle = (id: number) => {
  return useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => apiService.getVehicle(id),
    enabled: !!id,
  });
};

export const useCreateVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: VehicleRequest) => apiService.createVehicle(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
};

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: number; request: VehicleRequest }) => 
      apiService.updateVehicle(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
};

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiService.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
};
