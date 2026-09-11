"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api, StudentProfile, ProfileSummary } from "@/lib/api";

interface AuthContextType {
  user: {
    id: string;
    email: string;
    role: string;
    full_name: string | null;
    profile_id: string | null;
  } | null;
  profile: StudentProfile | null;
  seedProfiles: ProfileSummary[];
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  switchStudent: (profileId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthContextType["user"]>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [seedProfiles, setSeedProfiles] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch available seed profiles for the switcher
  const loadSeedProfiles = async () => {
    try {
      const list = await api.profiles.list({ limit: 50 });
      setSeedProfiles(list);
    } catch (err) {
      console.error("Failed to load seed profiles:", err);
    }
  };

  const refreshProfile = async () => {
    if (!profile?.id) return;
    try {
      const refreshed = await api.profiles.get(profile.id);
      setProfile(refreshed);
    } catch (err) {
      console.error("Failed to refresh profile:", err);
    }
  };

  const login = async (email: string, password: string = "Password123!") => {
    setLoading(true);
    try {
      const authRes = await api.auth.login(email, password);
      localStorage.setItem("auth_token", authRes.access_token);
      localStorage.setItem("user_email", email);

      setUser({
        id: authRes.user_id,
        email: authRes.email,
        role: authRes.role,
        full_name: authRes.full_name,
        profile_id: authRes.profile_id,
      });

      if (authRes.profile_id) {
        const fullProfile = await api.profiles.get(authRes.profile_id);
        setProfile(fullProfile);
      }
    } catch (err) {
      console.error("Login failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_email");
    setUser(null);
    setProfile(null);
  };

  const switchStudent = async (profileId: string) => {
    setLoading(true);
    try {
      // Find matching profile from directory
      const target = await api.profiles.get(profileId);
      if (target && target.email) {
        await login(target.email, "Password123!");
      }
    } catch (err) {
      console.error("Error switching student:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadSeedProfiles();

      const savedToken = localStorage.getItem("auth_token");
      const savedEmail = localStorage.getItem("user_email");

      if (savedToken && savedEmail) {
        try {
          const me = await api.auth.me();
          setUser({
            id: me.id,
            email: me.email,
            role: me.role,
            full_name: me.profile?.full_name || null,
            profile_id: me.profile?.id || null,
          });
          setProfile(me.profile);
          setLoading(false);
          return;
        } catch {
          // Token expired or invalid, fallback below
          localStorage.removeItem("auth_token");
        }
      }

      // Default to Aarav Sharma for immediate offline/dev testing
      try {
        await login("aarav.sharma@university.edu", "Password123!");
      } catch (err) {
        console.warn("Could not auto-login Aarav Sharma:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        seedProfiles,
        loading,
        login,
        logout,
        refreshProfile,
        switchStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
