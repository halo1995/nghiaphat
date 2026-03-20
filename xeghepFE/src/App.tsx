import React, { Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { Routes, Route, BrowserRouter, Navigate, Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/AppSidebar";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";

// Static imports — small/essential pages
import Login from "@/pages/Login";
import ChangePassword from "@/pages/ChangePassword";
import NotFound from "@/pages/NotFound";

// Lazy-loaded pages — heavy components loaded on demand
const Index = React.lazy(() => import("@/pages/Index"));
const CallCenter = React.lazy(() => import("@/pages/CallCenter"));
const CreateBooking = React.lazy(() => import("@/pages/CreateBooking"));
const Dispatch = React.lazy(() => import("@/pages/Dispatch"));
const GroupTrips = React.lazy(() => import("@/pages/GroupTrips"));
const AssignVehicle = React.lazy(() => import("@/pages/AssignVehicle"));
const DriverDashboard = React.lazy(() => import("@/pages/DriverDashboard"));
const DriverAdvances = React.lazy(() => import("@/pages/DriverAdvances"));
const DriverTrips = React.lazy(() => import("@/pages/DriverTrips"));
const TripExecution = React.lazy(() => import("@/pages/TripExecution"));
const VehicleList = React.lazy(() => import("@/pages/VehicleList"));
const VehicleDetail = React.lazy(() => import("@/pages/VehicleDetail"));
const AddVehicle = React.lazy(() => import("@/pages/AddVehicle"));
const EditVehicle = React.lazy(() => import("@/pages/EditVehicle"));
const Drivers = React.lazy(() => import("@/pages/Drivers"));
const Customers = React.lazy(() => import("@/pages/Customers"));
const AddDriver = React.lazy(() => import("@/pages/AddDriver"));
const EditDriver = React.lazy(() => import("@/pages/EditDriver"));
const AddCustomer = React.lazy(() => import("@/pages/AddCustomer"));
const Accounting = React.lazy(() => import("@/pages/Accounting"));
const ExpenseVouchers = React.lazy(() => import("@/pages/ExpenseVouchers"));
const DriverLedger = React.lazy(() => import("@/pages/DriverLedger"));
const Users = React.lazy(() => import("@/pages/Users"));
const ApiTest = React.lazy(() => import("@/components/ApiTest"));

// Loading spinner for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
      <p className="text-sm text-muted-foreground">Đang tải...</p>
    </div>
  </div>
);



// Layout Component - force remount on every location change
const LayoutWithSidebar = () => {
  const location = useLocation();
  
  React.useEffect(() => {
    console.log('Layout mounting for:', location.pathname);
    window.scrollTo(0, 0);
  }, [location.pathname]);
  
  // Force complete remount by using location as key on the entire layout
  return (
    <SidebarProvider key={location.pathname}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1 w-full min-w-0">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

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
const RoleRoute = ({ children, allowed }: { children: React.ReactNode; allowed: Array<'admin' | 'dispatcher' | 'call_center' | 'driver' | 'accountant'> }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  
  const role = user.role.toLowerCase() as 'admin' | 'dispatcher' | 'call_center' | 'driver' | 'accountant';

  if (!allowed.includes(role)) {
    // Redirect to a sensible default per role
    const fallback = role === 'admin'
      ? '/'
      : role === 'dispatcher'
        ? '/dispatch'
        : role === 'call_center'
          ? '/call-center'
          : role === 'accountant'
            ? '/accounting'
            : '/driver';
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="xeghep-theme">
    <AuthProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Toaster />
          <Sonner />
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/api-test" element={<ApiTest />} />

            {/* Protected Routes with Layout */}
            <Route element={
              <ProtectedRoute>
                <LayoutWithSidebar />
              </ProtectedRoute>
            }>
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
              <Route path="/driver" element={<RoleRoute allowed={["driver"]}><DriverDashboard /></RoleRoute>} />
              <Route path="/driver/advances" element={<RoleRoute allowed={["driver"]}><DriverAdvances /></RoleRoute>} />
              <Route path="/driver-trips" element={<RoleRoute allowed={["admin", "driver"]}><DriverTrips /></RoleRoute>} />
              <Route path="/trip-execution/:tripId" element={<RoleRoute allowed={["admin", "driver"]}><TripExecution /></RoleRoute>} />
              
              {/* Quản lý */}
              <Route path="/vehicles" element={<RoleRoute allowed={["admin"]}><VehicleList /></RoleRoute>} />
              <Route path="/vehicle/:id" element={<RoleRoute allowed={["admin"]}><VehicleDetail /></RoleRoute>} />
              <Route path="/add-vehicle" element={<RoleRoute allowed={["admin"]}><AddVehicle /></RoleRoute>} />
              <Route path="/edit-vehicle/:id" element={<RoleRoute allowed={["admin"]}><EditVehicle /></RoleRoute>} />
              <Route path="/drivers" element={<RoleRoute allowed={["admin"]}><Drivers /></RoleRoute>} />
              <Route path="/drivers/add" element={<RoleRoute allowed={["admin"]}><AddDriver /></RoleRoute>} />
              <Route path="/drivers/:id/edit" element={<RoleRoute allowed={["admin"]}><EditDriver /></RoleRoute>} />
              <Route path="/customers" element={<RoleRoute allowed={["admin"]}><Customers /></RoleRoute>} />
              <Route path="/customers/add" element={<RoleRoute allowed={["admin"]}><AddCustomer /></RoleRoute>} />
              {/* Quản trị người dùng */}
              <Route path="/users" element={<RoleRoute allowed={["admin"]}><Users /></RoleRoute>} />
              {/* Kế toán */}
              <Route path="/accounting" element={<RoleRoute allowed={["admin", "accountant"]}><Accounting /></RoleRoute>} />
              <Route path="/accounting/expenses" element={<RoleRoute allowed={["admin", "accountant"]}><ExpenseVouchers /></RoleRoute>} />
              <Route path="/accounting/driver-ledger" element={<RoleRoute allowed={["admin", "accountant"]}><DriverLedger /></RoleRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;