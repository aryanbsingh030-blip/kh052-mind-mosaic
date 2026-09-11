/**
 * Client-Side Synchronization Engine (Stage 10)
 * Manages the offline operation queue, submits batches to /api/v1/sync/batch,
 * handles progressive retries, and reconciles authoritative server states.
 */

import { api, SyncBatchRequest, SyncBatchResponse, SyncOperationRequest, SyncOperationAck } from "@/lib/api";
import { offlineStorage, SyncOperationItem } from "@/lib/offline/indexedDb";

export type SyncEngineStatus = "OFFLINE" | "SYNCING" | "SYNCED" | "SYNC_FAILED";

type SyncListener = (status: SyncEngineStatus, counts: { pending: number; success: number; failed: number }) => void;

class SyncEngine {
  private currentStatus: SyncEngineStatus = "SYNCED";
  private isSyncing: boolean = false;
  private listeners: Set<SyncListener> = new Set();
  private clientId: string = "web-client";

  constructor() {
    if (typeof window !== "undefined") {
      let storedId = localStorage.getItem("sync_client_id");
      if (!storedId) {
        storedId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem("sync_client_id", storedId);
      }
      this.clientId = storedId;
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notifyListeners();
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners() {
    const counts = await this.getCounts();
    for (const l of this.listeners) {
      try {
        l(this.currentStatus, counts);
      } catch (err) {
        console.warn("[SyncEngine] Listener error:", err);
      }
    }
  }

  public async getCounts(): Promise<{ pending: number; success: number; failed: number }> {
    try {
      const all = await offlineStorage.getAll<SyncOperationItem>("sync_operations");
      const pending = all.filter((op) => op.status === "PENDING" || op.status === "SYNCING").length;
      const success = all.filter((op) => op.status === "SUCCESS" || op.status === "CONFLICT_RESOLVED").length;
      const failed = all.filter((op) => op.status === "REJECTED" || op.status === "ERROR" || op.status === "FAILED").length;
      return { pending, success, failed };
    } catch {
      return { pending: 0, success: 0, failed: 0 };
    }
  }

  /**
   * Enqueue an offline mutation in IndexedDB
   */
  public async enqueueOperation(
    type: string,
    entityId: string | null,
    payload: any
  ): Promise<SyncOperationItem> {
    const operation_id = `op-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const opItem: SyncOperationItem = {
      operation_id,
      type,
      client_timestamp: new Date().toISOString(),
      entity_id: entityId,
      payload,
      status: "PENDING",
      retry_count: 0,
    };

    await offlineStorage.put("sync_operations", opItem);
    console.log(`[SyncEngine] Enqueued operation ${opItem.operation_id} (${type})`);

    // Notify listeners of new pending operation
    await this.notifyListeners();

    // If online, trigger background sync attempt
    if (typeof window !== "undefined" && window.navigator.onLine && !this.isSyncing) {
      setTimeout(() => this.syncAll(), 300);
    }

    return opItem;
  }

  /**
   * Execute batch synchronization against backend
   */
  public async syncAll(): Promise<SyncBatchResponse | null> {
    if (this.isSyncing) {
      console.log("[SyncEngine] Sync already in progress, skipping duplicate call.");
      return null;
    }

    // Check online status
    if (typeof window !== "undefined" && !window.navigator.onLine) {
      this.currentStatus = "OFFLINE";
      await this.notifyListeners();
      return null;
    }

    this.isSyncing = true;
    this.currentStatus = "SYNCING";
    await this.notifyListeners();

    try {
      const allOps = await offlineStorage.getAll<SyncOperationItem>("sync_operations");
      const pendingOps = allOps.filter(
        (op) => (op.status === "PENDING" || op.status === "ERROR" || op.status === "FAILED") && op.retry_count < 5
      );

      if (pendingOps.length === 0) {
        this.currentStatus = "SYNCED";
        this.isSyncing = false;
        await this.notifyListeners();
        return null;
      }

      console.log(`[SyncEngine] Syncing batch of ${pendingOps.length} pending operations...`);

      // Mark as syncing in local store
      for (const op of pendingOps) {
        op.status = "SYNCING";
        await offlineStorage.put("sync_operations", op);
      }

      // Build batch request
      const batchRequest: SyncBatchRequest = {
        client_id: this.clientId,
        operations: pendingOps.map((op) => ({
          operation_id: op.operation_id,
          type: op.type as any,
          client_timestamp: op.client_timestamp,
          entity_id: op.entity_id || undefined,
          payload: op.payload,
          client_version: 1,
        })),
      };

      // Submit to backend
      const response = await api.sync.batch(batchRequest);

      // Process acknowledgements
      for (const ack of response.acknowledgements) {
        const targetOp = pendingOps.find((op) => op.operation_id === ack.operation_id);
        if (!targetOp) continue;

        targetOp.server_ack = ack;
        targetOp.status = ack.status as any;

        if (ack.status === "SUCCESS") {
          console.log(`[SyncEngine] Operation ${ack.operation_id} acknowledged SUCCESS: ${ack.message}`);
          // If project was created, update permanent ID
          if (ack.type === "CREATE_PROJECT" && ack.entity_id) {
            const tempProj = await offlineStorage.get<any>("projects", targetOp.entity_id || "");
            if (tempProj) {
              await offlineStorage.delete("projects", tempProj.id);
              tempProj.id = ack.entity_id;
              await offlineStorage.put("projects", tempProj);
            }
          }
        } else if (ack.status === "CONFLICT_RESOLVED") {
          console.log(`[SyncEngine] Operation ${ack.operation_id} CONFLICT RESOLVED: ${ack.message}`);
          // Apply authoritative server state locally
          if (ack.authoritative_state && targetOp.entity_id) {
            const localProfile = await offlineStorage.get<any>("profiles", targetOp.entity_id);
            if (localProfile) {
              Object.assign(localProfile, ack.authoritative_state);
              await offlineStorage.put("profiles", localProfile);
            }
          }
        } else if (ack.status === "REJECTED") {
          console.warn(`[SyncEngine] Operation ${ack.operation_id} REJECTED: ${ack.message}`);
          // Reconcile authoritative credit balance if returned
          if (ack.authoritative_state?.credit_balance !== undefined && targetOp.payload?.from_student_id) {
            const studentId = targetOp.payload.from_student_id;
            const bal = await offlineStorage.get<any>("credits", studentId);
            if (bal) {
              bal.credit_balance = ack.authoritative_state.credit_balance;
              await offlineStorage.put("credits", bal);
            }
          }
        } else {
          // Error
          targetOp.retry_count += 1;
          targetOp.error_message = ack.message;
          targetOp.status = "FAILED";
        }

        await offlineStorage.put("sync_operations", targetOp);
      }

      // Reconcile all authoritative balances returned by server
      if (response.authoritative_balances) {
        for (const [studentId, serverBal] of Object.entries(response.authoritative_balances)) {
          const bal = await offlineStorage.get<any>("credits", studentId);
          if (bal) {
            bal.credit_balance = serverBal;
            await offlineStorage.put("credits", bal);
          }
        }
      }

      this.currentStatus = response.error_count > 0 || response.rejected_count > 0 ? "SYNC_FAILED" : "SYNCED";
      return response;
    } catch (err: any) {
      console.warn("[SyncEngine] Batch sync failure (offline or network error):", err);
      this.currentStatus = typeof window !== "undefined" && !window.navigator.onLine ? "OFFLINE" : "SYNC_FAILED";
      return null;
    } finally {
      this.isSyncing = false;
      await this.notifyListeners();
    }
  }

  /**
   * Reset or clear completed sync operations from log
   */
  public async clearCompleted(): Promise<void> {
    const all = await offlineStorage.getAll<SyncOperationItem>("sync_operations");
    for (const op of all) {
      if (op.status === "SUCCESS" || op.status === "CONFLICT_RESOLVED") {
        await offlineStorage.delete("sync_operations", op.operation_id);
      }
    }
    await this.notifyListeners();
  }
}

export const syncEngine = new SyncEngine();
