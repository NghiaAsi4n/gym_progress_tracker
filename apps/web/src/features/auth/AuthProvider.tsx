/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { PublicUser } from "@gym-tracking/contracts";

import {
  clearAccessToken,
  getMe,
  login,
  logout,
  refreshAccessToken,
  register,
  type AuthResponse,
} from "../../services/api-auth.js";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: PublicUser | null;
  signIn: (email: string, password: string) => Promise<PublicUser>;
  signUp: (email: string, password: string) => Promise<PublicUser>;
  signOut: () => Promise<void>;
  setUser: (user: PublicUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function userFromResponse(response: AuthResponse): PublicUser {
  return response.data.user;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUserState] = useState<PublicUser | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const token = await refreshAccessToken();
      if (!token) {
        if (active) setStatus("anonymous");
        return;
      }

      try {
        const response = await getMe();
        if (active) {
          setUserState(response.data.user);
          setStatus("authenticated");
        }
      } catch {
        clearAccessToken();
        if (active) {
          setUserState(null);
          setStatus("anonymous");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const applyAuth = useCallback((response: AuthResponse): PublicUser => {
    const nextUser = userFromResponse(response);
    setUserState(nextUser);
    setStatus("authenticated");
    return nextUser;
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => applyAuth(await login({ email, password })),
    [applyAuth],
  );

  const signUp = useCallback(
    async (email: string, password: string) => applyAuth(await register({ email, password })),
    [applyAuth],
  );

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      clearAccessToken();
      setUserState(null);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, signUp, signOut, setUser: setUserState }),
    [status, user, signIn, signUp, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
