import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, getRoleDefaultRoute, type UserRole } from '@/hooks/use-auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleDefaultRoute(user.role)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
