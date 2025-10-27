import React, { createContext, useContext, useMemo, useState } from 'react';

export type UserRole = 'call_center' | 'dispatcher' | 'driver' | 'admin';

export interface AuthUser {
  phone: string;
  role: UserRole;
}

interface LoginPayload {
  phone: string;
  password: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
}

const AUTH_STORAGE_KEY = 'auth:user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const roleRedirectMap: Record<UserRole, string> = {
  call_center: '/call-center',
  dispatcher: '/dispatch',
  driver: '/driver',
  admin: '/',
};

export const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
  { value: 'call_center', label: 'Tổng đài viên' },
  { value: 'dispatcher', label: 'Điều phối viên' },
  { value: 'driver', label: 'Tài xế' },
  { value: 'admin', label: 'Admin' },
];

export const ROLE_LABELS = ROLE_OPTIONS.reduce<Record<UserRole, string>>((acc, role) => {
  acc[role.value] = role.label;
  return acc;
}, {
  call_center: 'Tổng đài viên',
  dispatcher: 'Điều phối viên',
  driver: 'Tài xế',
  admin: 'Admin',
});

export const getRoleDefaultRoute = (role: UserRole): string => roleRedirectMap[role];

const readStoredUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch (error) {
    console.warn('Failed to parse auth user from storage', error);
    return null;
  }
};

export const AuthProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());

  const login = async ({ phone, password, role }: LoginPayload) => {
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();

    if (!trimmedPhone || !trimmedPassword) {
      throw new Error('Số điện thoại và mật khẩu không được để trống.');
    }

    if (trimmedPassword.length < 4) {
      throw new Error('Mật khẩu phải có ít nhất 4 ký tự.');
    }

    // Fake async validation delay
    await new Promise((resolve) => setTimeout(resolve, 300));

    const authUser: AuthUser = { phone: trimmedPhone, role };
    setUser(authUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, login, logout }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
