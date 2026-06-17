import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/apiService";
import { removeAccessToken } from "../services/authService";
import {
  login as loginService,
  logout as logoutService,
  isLoggedIn,
  forgotPassword as forgotPasswordService,
  setAccessToken,
  AUTH_SESSION_REVOKED_EVENT,
} from "../services/authService";
import { UserDTO } from "../types/userDTO";
import { tearDownChatSocket } from "../hooks/useWebSocket";
import FrozenAccountModal from "../components/FrozenAccountModal";

interface UserContextType {
  user: UserDTO | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<{ ok: boolean; frozen: boolean }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
  setUser: React.Dispatch<React.SetStateAction<UserDTO | null>>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  login: async () => ({ ok: false, frozen: false }),
  logout: async () => {},
  refreshUser: async () => {},
  forgotPassword: async () => false,
  setUser: () => {},
});

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    // Tokens live in memory only. On a hard reload isLoggedIn() is false even
    // when a valid HttpOnly refresh cookie exists — try refresh up front.
    if (!isLoggedIn()) {
      let refreshed = false;
      try {
        const r = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (r.ok) {
          const data = await r.json();
          const t = data.token || data.accessToken;
          if (t) {
            setAccessToken(t);
            refreshed = true;
          }
        }
      } catch {
        // Network blip: treat this boot as logged out.
      }

      if (!refreshed) {
        setUser(null);
        return;
      }
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
    const result = await loginService(email, password, rememberMe);
    if (result.ok) {
      await refreshUser();
    }
    return result;
  };

  const forgotPassword = async (email: string) => forgotPasswordService(email);

  const logout = async () => {
    tearDownChatSocket();
    try {
      await logoutService();
    } finally {
      setUser(null);
      removeAccessToken();
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onRevoked = () => { void logout(); };
    window.addEventListener(AUTH_SESSION_REVOKED_EVENT, onRevoked);
    return () => window.removeEventListener(AUTH_SESSION_REVOKED_EVENT, onRevoked);
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        login,
        logout,
        refreshUser,
        forgotPassword,
        setUser,
      }}
    >
      {children}
      <FrozenAccountModal />
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
