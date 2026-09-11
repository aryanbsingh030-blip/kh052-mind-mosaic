/**
 * IndexedDB Local Storage Layer (Stage 9)
 * Abstracts browser IndexedDB with Promise-based API and localStorage fallback.
 */

import { OFFLINE_SEED_DATA } from "./seedData";

const DB_NAME = "AISkillExchangeOfflineDB";
const DB_VERSION = 2;

export interface SyncQueueItem {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "TRANSFER";
  resource: "profile" | "skill" | "project" | "team" | "credit_transfer";
  payload: any;
  timestamp: string;
  retryCount: number;
}

export interface SyncOperationItem {
  operation_id: string;
  type: string;
  client_timestamp: string;
  entity_id?: string | null;
  payload: any;
  status: "PENDING" | "SYNCING" | "SUCCESS" | "CONFLICT_RESOLVED" | "REJECTED" | "ERROR" | "FAILED";
  retry_count: number;
  error_message?: string | null;
  server_ack?: any | null;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private isSupported: boolean = typeof window !== "undefined" && "indexedDB" in window;
  private initPromise: Promise<IDBDatabase | null> | null = null;

  public async init(): Promise<IDBDatabase | null> {
    if (!this.isSupported) {
      return null;
    }
    if (this.db) {
      return this.db;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Object stores
          if (!db.objectStoreNames.contains("profiles")) {
            db.createObjectStore("profiles", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("skills")) {
            db.createObjectStore("skills", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("student_skills")) {
            const ssStore = db.createObjectStore("student_skills", { keyPath: "id" });
            ssStore.createIndex("student_id", "student_id", { unique: false });
            ssStore.createIndex("skill_id", "skill_id", { unique: false });
          }
          if (!db.objectStoreNames.contains("projects")) {
            db.createObjectStore("projects", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("teams")) {
            db.createObjectStore("teams", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("matches")) {
            db.createObjectStore("matches", { keyPath: "candidate_id" });
          }
          if (!db.objectStoreNames.contains("credits")) {
            db.createObjectStore("credits", { keyPath: "student_id" });
          }
          if (!db.objectStoreNames.contains("transactions")) {
            const txStore = db.createObjectStore("transactions", { keyPath: "id" });
            txStore.createIndex("student_id", "student_id", { unique: false });
          }
          if (!db.objectStoreNames.contains("learning_goals")) {
            const lgStore = db.createObjectStore("learning_goals", { keyPath: "id" });
            lgStore.createIndex("student_id", "student_id", { unique: false });
          }
          if (!db.objectStoreNames.contains("sync_queue")) {
            db.createObjectStore("sync_queue", { keyPath: "id" });
          }
          if (!db.objectStoreNames.contains("sync_operations")) {
            const syncStore = db.createObjectStore("sync_operations", { keyPath: "operation_id" });
            syncStore.createIndex("status", "status", { unique: false });
            syncStore.createIndex("type", "type", { unique: false });
          }
        };

        request.onsuccess = async (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          await this.primeSeedDataIfNeeded();
          resolve(this.db);
        };

        request.onerror = (err) => {
          console.warn("[IndexedDB] Failed to open database, falling back to memory/local storage:", err);
          resolve(null);
        };
      } catch (err) {
        console.warn("[IndexedDB] Exception opening database:", err);
        resolve(null);
      }
    });

    return this.initPromise;
  }

  /**
   * Prime IndexedDB with pre-bundled seed data if empty
   */
  private async primeSeedDataIfNeeded() {
    try {
      const existingProfiles = await this.getAll<any>("profiles");
      if (existingProfiles.length === 0) {
        console.log("[IndexedDB] Priming offline storage with bundled seed data...");
        for (const p of OFFLINE_SEED_DATA.profiles) {
          await this.put("profiles", p);
          // Initial credit record
          await this.put("credits", {
            student_id: p.id,
            credit_balance: p.credit_balance,
            total_earned: 40,
            total_spent: 0,
            allow_negative_balance: false,
          });
        }
        for (const s of OFFLINE_SEED_DATA.skills) {
          await this.put("skills", s);
        }
        for (const ss of OFFLINE_SEED_DATA.student_skills) {
          await this.put("student_skills", ss);
        }
        for (const pr of OFFLINE_SEED_DATA.projects) {
          await this.put("projects", pr);
        }
      }
    } catch (err) {
      console.warn("[IndexedDB] Failed priming seed data:", err);
    }
  }

  public async get<T>(storeName: string, key: string): Promise<T | null> {
    const db = await this.init();
    if (!db) {
      return this.fallbackGet<T>(storeName, key);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as T) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  public async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.init();
    if (!db) {
      return this.fallbackGetAll<T>(storeName);
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as T[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }

  public async put<T>(storeName: string, value: T): Promise<void> {
    const db = await this.init();
    if (!db) {
      this.fallbackPut(storeName, value);
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.put(value);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  public async delete(storeName: string, key: string): Promise<void> {
    const db = await this.init();
    if (!db) {
      this.fallbackDelete(storeName, key);
      return;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  // Fallback localStorage implementation if IndexedDB is blocked
  private fallbackGet<T>(storeName: string, key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(`${storeName}_${key}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private fallbackGetAll<T>(storeName: string): T[] {
    if (typeof window === "undefined") return [];
    try {
      const items: T[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`${storeName}_`)) {
          const v = localStorage.getItem(k);
          if (v) items.push(JSON.parse(v));
        }
      }
      return items;
    } catch {
      return [];
    }
  }

  private fallbackPut<T>(storeName: string, value: any): void {
    if (typeof window === "undefined") return;
    try {
      const key = value.id || value.student_id || value.candidate_id;
      if (key) {
        localStorage.setItem(`${storeName}_${key}`, JSON.stringify(value));
      }
    } catch {
      // ignore
    }
  }

  private fallbackDelete(storeName: string, key: string): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(`${storeName}_${key}`);
    } catch {
      // ignore
    }
  }
}

export const offlineStorage = new IndexedDBManager();
