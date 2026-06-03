import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import {
  loginUser as requestLogin,
  logoutUser as requestLogout,
  refreshAccessToken as requestRefresh,
  registerUser as requestRegister,
} from "@/api";
import type { LoginRequest, RegisterRequest } from "@/features/auth/types";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
  saveAuthTokens,
} from "@/features/auth/tokenStorage";

interface AuthContextValue {
  isAuthenticated: boolean;
  accessToken: string | null;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  refresh: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(() => getAccessToken());

  const login = useCallback(async (payload: LoginRequest) => {
    const tokens = await requestLogin(payload);
    saveAuthTokens(tokens);
    setAccessToken(tokens.access_token);
  }, []);

  const register = useCallback(
    async (payload: RegisterRequest) => {
      await requestRegister(payload);
      await login(payload);
    },
    [login],
  );

  const refresh = useCallback(async () => {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAuthTokens();
      setAccessToken(null);
      return null;
    }

    try {
      const tokens = await requestRefresh(refreshToken);
      saveAccessToken(tokens.access_token);
      setAccessToken(tokens.access_token);
      return tokens.access_token;
    } catch {
      clearAuthTokens();
      setAccessToken(null);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();

    try {
      if (refreshToken) {
        await requestLogout(refreshToken);
      }
    } finally {
      clearAuthTokens();
      setAccessToken(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(accessToken),
      accessToken,
      login,
      register,
      refresh,
      logout,
    }),
    [accessToken, login, logout, refresh, register],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
