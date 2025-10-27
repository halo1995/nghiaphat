import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { Routes, Route, BrowserRouter, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { queryClient } from "./hooks/useApi";

// Auth
import Login from "@/pages/Login";
import ChangePassword from "@/pages/ChangePassword";

// Pages
import Index from "@/pages/Index";
import CallCenter from "@/pages/CallCenter";
import CreateBooking from "@/pages/CreateBooking";
import Dispatch from "@/pages/Dispatch";
import GroupTrips from "@/pages/GroupTrips";
import AssignVehicle from "@/pages/AssignVehicle";
import DriverDashboard from "@/pages/DriverDashboard";
import DriverTrips from "@/pages/DriverTrips";
import TripExecution from "@/pages/TripExecution";
import VehicleList from "@/pages/VehicleList";
import VehicleDetail from "@/pages/VehicleDetail";
import AddVehicle from "@/pages/AddVehicle";
import EditVehicle from "@/pages/EditVehicle";
import Drivers from "@/pages/Drivers";
import Customers from "@/pages/Customers";
import NotFound from "@/pages/NotFound";
import AddDriver from "@/pages/AddDriver";
import AddCustomer from "@/pages/AddCustomer";
import Accounting from "@/pages/Accounting";
import Users from "@/pages/Users";
import ApiTest from "@/components/ApiTest";



// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Role-based Route Component
const RoleRoute = ({ children, allowed }: { children: React.ReactNode; allowed: Array<'admin' | 'dispatcher' | 'call_center' | 'driver'> }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!allowed.includes(user.role.toLowerCase() as any)) {
    // Redirect to a sensible default per role
    const fallback = user.role.toLowerCase() === 'admin' ? '/' : user.role.toLowerCase() === 'dispatcher' ? '/dispatch' : user.role.toLowerCase() === 'call_center' ? '/call-center' : '/driver';
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/api-test" element={<ApiTest />} />

            {/* Protected Routes */}
            <Route path="/*" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="flex min-h-screen w-full">
                    <AppSidebar />
                    <SidebarInset className="flex-1 w-full min-w-0">
                      <Routes>
                        <Route path="/" element={<Index />} />
                        
                        {/* Auth */}
                        <Route path="/change-password" element={<ChangePassword />} />
                        
                        {/* Tổng đài */}
                        <Route path="/call-center" element={<RoleRoute allowed={["admin", "call_center"]}><CallCenter /></RoleRoute>} />
                        <Route path="/create-booking" element={<RoleRoute allowed={["admin", "call_center"]}><CreateBooking /></RoleRoute>} />
                        
                        {/* Điều phối */}
                        <Route path="/dispatch" element={<RoleRoute allowed={["admin", "dispatcher"]}><Dispatch /></RoleRoute>} />
                        <Route path="/group-trips" element={<RoleRoute allowed={["admin", "dispatcher"]}><GroupTrips /></RoleRoute>} />
                        <Route path="/assign-vehicle/:groupId" element={<RoleRoute allowed={["admin", "dispatcher"]}><AssignVehicle /></RoleRoute>} />
                        
                        {/* Tài xế */}
                        <Route path="/driver" element={<RoleRoute allowed={["admin", "driver"]}><DriverDashboard /></RoleRoute>} />
                        <Route path="/driver-trips" element={<RoleRoute allowed={["admin", "driver"]}><DriverTrips /></RoleRoute>} />
                        <Route path="/trip-execution/:tripId" element={<RoleRoute allowed={["admin", "driver"]}><TripExecution /></RoleRoute>} />
                        
                        {/* Quản lý */}
                        <Route path="/vehicles" element={<RoleRoute allowed={["admin"]}><VehicleList /></RoleRoute>} />
                        <Route path="/vehicle/:id" element={<RoleRoute allowed={["admin"]}><VehicleDetail /></RoleRoute>} />
                        <Route path="/add-vehicle" element={<RoleRoute allowed={["admin"]}><AddVehicle /></RoleRoute>} />
                        <Route path="/edit-vehicle/:id" element={<RoleRoute allowed={["admin"]}><EditVehicle /></RoleRoute>} />
                        <Route path="/drivers" element={<RoleRoute allowed={["admin"]}><Drivers /></RoleRoute>} />
                        <Route path="/drivers/add" element={<RoleRoute allowed={["admin"]}><AddDriver /></RoleRoute>} />
                        <Route path="/customers" element={<RoleRoute allowed={["admin"]}><Customers /></RoleRoute>} />
                        <Route path="/customers/add" element={<RoleRoute allowed={["admin"]}><AddCustomer /></RoleRoute>} />
                        {/* Quản trị người dùng */}
                        <Route path="/users" element={<RoleRoute allowed={["admin"]}><Users /></RoleRoute>} />
                        {/* Kế toán */}
                        <Route path="/accounting" element={<RoleRoute allowed={["admin"]}><Accounting /></RoleRoute>} />
                        
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </SidebarInset>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;