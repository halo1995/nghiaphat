import React, { useState } from 'react';
import { useDrivers, useVehicles, useLogin } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const ApiTest = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const { toast } = useToast();
  
  const loginMutation = useLogin();
  const { data: driversData, isLoading: driversLoading, error: driversError } = useDrivers();
  const { data: vehiclesData, isLoading: vehiclesLoading, error: vehiclesError } = useVehicles();
  
  const drivers = driversData?.content || [];
  const vehicles = vehiclesData?.content || [];

  const handleLogin = async () => {
    try {
      const response = await loginMutation.mutateAsync({ username, password });
      toast({
        title: "Login successful",
        description: `Logged in as ${response.user.name}`,
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">API Integration Test</h1>
      
      {/* Login Test */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleLogin} disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'Logging in...' : 'Test Login'}
          </Button>
        </CardContent>
      </Card>

      {/* Drivers Test */}
      <Card>
        <CardHeader>
          <CardTitle>Drivers API Test</CardTitle>
        </CardHeader>
        <CardContent>
          {driversLoading && <p>Loading drivers...</p>}
          {driversError && <p className="text-red-500">Error loading drivers: {driversError.message}</p>}
          {!driversLoading && !driversError && (
            <div>
              <p>Found {drivers.length} drivers</p>
              <div className="mt-2 space-y-2">
                {drivers.slice(0, 3).map((driver) => (
                  <div key={driver.id} className="p-2 border rounded">
                    <p className="font-medium">{driver.name}</p>
                    <p className="text-sm text-gray-600">{driver.phone} - {driver.email}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vehicles Test */}
      <Card>
        <CardHeader>
          <CardTitle>Vehicles API Test</CardTitle>
        </CardHeader>
        <CardContent>
          {vehiclesLoading && <p>Loading vehicles...</p>}
          {vehiclesError && <p className="text-red-500">Error loading vehicles: {vehiclesError.message}</p>}
          {!vehiclesLoading && !vehiclesError && (
            <div>
              <p>Found {vehicles.length} vehicles</p>
              <div className="mt-2 space-y-2">
                {vehicles.slice(0, 3).map((vehicle) => (
                  <div key={vehicle.id} className="p-2 border rounded">
                    <p className="font-medium">{vehicle.name}</p>
                    <p className="text-sm text-gray-600">{vehicle.licensePlate} - {vehicle.status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiTest;
