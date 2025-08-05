import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/apiService";
import {
  login as loginService,
  logout as logoutService,
  isLoggedIn,
  forgotPassword as forgotPasswordService
} from "../services/authService";
import { useAuth } from "./AuthContext";

export interface UserDTO {
  id: number;
  email: string;
  name: string;
  surname: string;
  activated: boolean;
  role: string;
  nickname: string;
  profileImageUrl: string;
}

interface UserContextType {
  user: UserDTO | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  setUser: React.Dispatch<React.SetStateAction<UserDTO | null>>; // ✅ eklendi
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  login: async () => false,
  logout: async () => {},
  refreshUser: async () => {},
  forgotPassword: async () => false,
  setUser: () => {} // boş default
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    if (!isLoggedIn()) {
      setUser(null);
      return;
    }
    try {
      const res = await api("/api/user/me");
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean) => {
    const success = await loginService(email, password, rememberMe);
    if (success) {
      setIsAuthenticated(true);
      await refreshUser();
    }
    return success;
  };

  const forgotPassword = async (email: string) => {
    return await forgotPasswordService(email);
  };

  const logout = async () => {
    await logoutService();
    setIsAuthenticated(false);
    setUser(null);
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [isAuthenticated]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        forgotPassword,
        setUser // ✅ ekledik
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
