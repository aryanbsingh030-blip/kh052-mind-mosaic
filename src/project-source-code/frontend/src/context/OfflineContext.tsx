"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { syncEngine, SyncEngineStatus } from "@/lib/sync/syncEngine";

export type SyncStatus = "OFFLINE" | "SYNCING" | "SYNCED" | "SYNC_FAILED";

interface OfflineContextType {
  isOffline: boolean;
  syncStatus: SyncStatus;
  syncQueueCount: number;
  pendingCount: number;
  successCount: number;
  failedCount: number;
  triggerSync: () => Promise<any>;
  clearCompletedSync: () => Promise<void>;
  isServiceWorkerReady: boolean;
  isSimulatedOffline: boolean;
  toggleSimulatedOffline: (val: boolean) => void;
}

const OfflineContext = createContext<OfflineContextType>({
  isOffline: false,
  syncStatus: "SYNCED",
  syncQueueCount: 0,
  pendingCount: 0,
  successCount: 0,
  failedCount: 0,
  triggerSync: async () => {},
  clearCompletedSync: async () => {},
  isServiceWorkerReady: false,
  isSimulatedOffline: false,
  toggleSimulatedOffline: () => {},
});

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("SYNCED");
  const [counts, setCounts] = useState<{ pending: number; success: number; failed: number }>({
    pending: 0,
    success: 0,
    failed: 0,
  });
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState<boolean>(false);

  // Subscribe to SyncEngine
  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((engineStatus, engineCounts) => {
      setCounts(engineCounts);
      if (isOffline || isSimulatedOffline) {
        setSyncStatus("OFFLINE");
      } else {
        setSyncStatus(engineStatus as SyncStatus);
      }
    });

    // Initial counts
    syncEngine.getCounts().then(setCounts);

    return () => unsubscribe();
  }, [isOffline, isSimulatedOffline]);

  const triggerSync = useCallback(async () => {
    if (isOffline || isSimulatedOffline) {
      console.warn("[OfflineProvider] Cannot trigger sync while offline");
      return null;
    }
    return syncEngine.syncAll();
  }, [isOffline, isSimulatedOffline]);

  const clearCompletedSync = useCallback(async () => {
    await syncEngine.clearCompleted();
  }, []);

  const toggleSimulatedOffline = useCallback((val: boolean) => {
    setIsSimulatedOffline(val);
    if (val) {
      setSyncStatus("OFFLINE");
    } else {
      setSyncStatus(window.navigator.onLine ? "SYNCED" : "OFFLINE");
      if (window.navigator.onLine) {
        syncEngine.syncAll();
      }
    }
  }, []);

  // Listen for browser online/offline events & active ping check
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initial state check
    const initialOffline = !window.navigator.onLine;
    setIsOffline(initialOffline);
    if (initialOffline) setSyncStatus("OFFLINE");

    // Register Service Worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV !== "development") {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => setIsServiceWorkerReady(true))
        .catch((err) => console.log("[SW] Registration note:", err));
    }

    const handleOnline = () => {
      console.log("[Network] Browser transitioned to ONLINE");
      setIsOffline(false);
      if (!isSimulatedOffline) {
        syncEngine.syncAll();
      }
    };

    const handleOffline = () => {
      console.log("[Network] Browser transitioned to OFFLINE");
      setIsOffline(true);
      setSyncStatus("OFFLINE");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Active heartbeat check every 15s to detect offline when navigator.onLine is stale
    const pingInterval = setInterval(async () => {
      if (isSimulatedOffline) return;

      if (!window.navigator.onLine) {
        setIsOffline(true);
        setSyncStatus("OFFLINE");
        return;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch("/api/health", { method: "GET", signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          if (isOffline) {
            setIsOffline(false);
            syncEngine.syncAll();
          }
        } else {
          setIsOffline(true);
          setSyncStatus("OFFLINE");
        }
      } catch {
        setIsOffline(true);
        setSyncStatus("OFFLINE");
      }
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(pingInterval);
    };
  }, [isOffline, isSimulatedOffline]);

  const effectiveOffline = isOffline || isSimulatedOffline;

  return (
    <OfflineContext.Provider
      value={{
        isOffline: effectiveOffline,
        syncStatus: effectiveOffline ? "OFFLINE" : syncStatus,
        syncQueueCount: counts.pending,
        pendingCount: counts.pending,
        successCount: counts.success,
        failedCount: counts.failed,
        triggerSync,
        clearCompletedSync,
        isServiceWorkerReady,
        isSimulatedOffline,
        toggleSimulatedOffline,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => useContext(OfflineContext);

