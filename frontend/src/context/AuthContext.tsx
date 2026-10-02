import React, { createContext, useState, useEffect } from "react";
import api from "../services/api";

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
  phone?: string;
  driverProfile?: any;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (tokenValue: string, userData: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      api
        .get("/auth/me")
        .then((res) => {
          setUser(res.data.user);
          if (res.data.token) {
            localStorage.setItem("token", res.data.token);
            api.defaults.headers.common["Authorization"] = `Bearer ${res.data.token}`;
            setToken(res.data.token);
          }
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  function login(tokenValue: string, userData: User) {
    localStorage.setItem("token", tokenValue);
    api.defaults.headers.common["Authorization"] = `Bearer ${tokenValue}`;
    setToken(tokenValue);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
