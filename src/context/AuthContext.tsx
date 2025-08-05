import React, { createContext, useContext, useEffect, useState } from "react";
import { isLoggedIn } from "../services/authService";

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  setIsAuthenticated: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  loading: true,
  setIsAuthenticated: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setIsAuthenticated(isLoggedIn());
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
