import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMe, login as apiLogin, register as apiRegister, linkWallet } from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    setError(null);
    const data = await apiLogin(email, password);
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (email, password) => {
    setError(null);
    const data = await apiRegister(email, password);
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  const bindWallet = useCallback(async (walletAddress) => {
    const data = await linkWallet(walletAddress);
    setUser(data.user);
    return data.user;
  }, []);

  const hasPermission = useCallback(
    (key) => {
      if (!user || user.isActive === false) return false;
      return Array.isArray(user.permissions) && user.permissions.includes(key);
    },
    [user]
  );

  const isAdmin = user?.role === "admin" || user?.role === "organizer";
  const isSuperAdmin = user?.role === "admin";
  const canManageUsers = hasPermission("users:write") || hasPermission("roles:manage");

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      setError,
      isAdmin,
      isSuperAdmin,
      canManageUsers,
      hasPermission,
      login,
      register,
      logout,
      refresh,
      bindWallet,
    }),
    [
      user,
      loading,
      error,
      isAdmin,
      isSuperAdmin,
      canManageUsers,
      hasPermission,
      login,
      register,
      logout,
      refresh,
      bindWallet,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
