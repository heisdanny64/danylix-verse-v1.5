import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Local-only profile shim. The previous cloud backend is gone — this keeps the
 * app fully functional on-device until the new database is wired in.
 */

export interface Profile {
  name: string;
  avatarColor: string;
}

interface AuthContextType {
  profile: Profile;
  updateProfile: (updates: Partial<Profile>) => void;
}

const PROFILE_KEY = "dverse_profile";
const DEFAULT_PROFILE: Profile = { name: "Guest", avatarColor: "primary" };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? { ...DEFAULT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      /* noop */
    }
  }, [profile]);

  const updateProfile = useCallback((updates: Partial<Profile>) => {
    setProfile((p) => ({ ...p, ...updates }));
  }, []);

  return <AuthContext.Provider value={{ profile, updateProfile }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
