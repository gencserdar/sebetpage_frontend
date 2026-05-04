import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/apiService";
import { removeAccessToken } from "../services/authService"; // ekstra güvence
import {
  login as loginService,
  logout as logoutService,
  isLoggedIn,
  forgotPassword as forgotPasswordService,
  setAccessToken
} from "../services/authService";
import { useAuth } from "./AuthContext";
import { tearDownChatSocket } from "../hooks/useWebSocket";

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
    // Tokens live in memory now (see authService comment), so on a hard
    // reload `isLoggedIn()` is always false even when the user has a
    // valid HttpOnly refresh cookie. Try the refresh endpoint up front
    // to recover a fresh access token; if it succeeds, /api/user/me
    // works as before. If it fails, the user really is logged out.
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
        // Network blip: treat this boot as logged out and avoid a redirect loop.
      }

      if (!refreshed) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
    }
    try {
      const res = await api("/api/user/me");
      if (res.ok) {
        setUser(await res.json());
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
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
    // Tear the WS down BEFORE the auth call returns. Two reasons:
    //   1) The STOMP DISCONNECT propagates to the gateway → cancels the
    //      gRPC subscribe → chat-service's onCancelHandler broadcasts
    //      offline-presence to all friends. Doing this synchronously in
    //      logout (rather than waiting for React to re-render with
    //      user=null and the hook's useEffect to notice) closes the window
    //      where the user still appears online to friends.
    //   2) Even if the auth call fails, we still want the socket gone so
    //      the next user can log in cleanly on the same tab.
    tearDownChatSocket();
    try {
      await logoutService();
    } finally {
      // UI'ı kesin olarak çıkış durumuna al
      setIsAuthenticated(false);
      setUser(null);
      removeAccessToken(); // ekstra güvence
    }
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
