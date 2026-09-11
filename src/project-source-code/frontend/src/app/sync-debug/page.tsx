"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { offlineStorage, SyncOperationItem } from "@/lib/offline/indexedDb";
import { syncEngine } from "@/lib/sync/syncEngine";
import { api } from "@/lib/api";
import {
  RefreshCw,
  WifiOff,
  Wifi,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  ShieldCheck,
  Zap,
  Play,
  Trash2,
  Database,
  ArrowRight,
  Sparkles,
  Coins,
  FileCode,
} from "lucide-react";

export default function SyncDebugPage() {
  const { profile } = useAuth();
  const {
    isOffline,
    syncStatus,
    pendingCount,
    successCount,
    failedCount,
    triggerSync,
    clearCompletedSync,
    isSimulatedOffline,
    toggleSimulatedOffline,
  } = useOffline();

  const [operations, setOperations] = useState<SyncOperationItem[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "SUCCESS" | "FAILED">("ALL");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [serverBalance, setServerBalance] = useState<number | null>(null);
  const [localBalance, setLocalBalance] = useState<number | null>(null);
  const [syncResultMsg, setSyncResultMsg] = useState<string | null>(null);

  // Reload operations from IndexedDB
  const reloadOperations = useCallback(async () => {
    try {
      const items = await offlineStorage.getAll<SyncOperationItem>("sync_operations");
      // Sort newest first
      items.sort((a, b) => new Date(b.client_timestamp).getTime() - new Date(a.client_timestamp).getTime());
      setOperations(items);
    } catch (err) {
      console.warn("[SyncDebug] Error fetching operations:", err);
    }
  }, []);

  // Reload balances (Authoritative Reconciler)
  const reloadBalances = useCallback(async () => {
    if (!profile?.id) return;
    try {
      // Local balance from IndexedDB
      const local = await offlineStorage.get<any>("credits", profile.id);
      setLocalBalance(local?.credit_balance ?? profile.credit_balance ?? 100);

      // Server balance via API (if online)
      if (!isOffline && !isSimulatedOffline) {
        const remote = await api.credits.getBalance(profile.id);
        setServerBalance(remote.credit_balance);
      } else {
        setServerBalance(null);
      }
    } catch {
      setServerBalance(null);
    }
  }, [profile?.id, profile?.credit_balance, isOffline, isSimulatedOffline]);

  useEffect(() => {
    reloadOperations();
    reloadBalances();
    const interval = setInterval(() => {
      reloadOperations();
      reloadBalances();
    }, 3000);
    return () => clearInterval(interval);
  }, [reloadOperations, reloadBalances]);

  // Handle manual sync trigger
  const handleManualSync = async () => {
    setIsProcessing(true);
    setSyncResultMsg(null);
    try {
      const res = await triggerSync();
      if (res) {
        setSyncResultMsg(
          `Sync complete: ${res.success_count} succeeded, ${res.conflict_count} resolved, ${res.rejected_count} rejected, ${res.error_count} errors.`
        );
      } else {
        setSyncResultMsg("Sync finished with no pending items or client is offline.");
      }
      await reloadOperations();
      await reloadBalances();
    } catch (err: any) {
      setSyncResultMsg(`Sync failed: ${err.message || err}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Enqueue test operations
  const enqueueSampleMutation = async (type: "UPDATE_PROFILE" | "CREATE_PROJECT" | "VALID_CREDIT" | "ROGUE_CREDIT") => {
    if (!profile?.id) return;
    const studentId = profile.id;

    if (type === "UPDATE_PROFILE") {
      const bioOptions = [
        "Passionate AI learner and open-source contributor.",
        "Deep Learning practitioner exploring graph neural networks.",
        "Full-stack student engineer focusing on offline-first architectures.",
      ];
      const newBio = bioOptions[Math.floor(Math.random() * bioOptions.length)];
      await syncEngine.enqueueOperation("UPDATE_PROFILE", studentId, {
        bio: newBio,
        interests: "Offline Sync, Distributed Systems, FastAPI, Next.js",
      });
    } else if (type === "CREATE_PROJECT") {
      const tempId = `proj-mock-${Date.now()}`;
      await syncEngine.enqueueOperation("CREATE_PROJECT", tempId, {
        owner_id: studentId,
        title: `AI Offline Engine (${Math.floor(Math.random() * 1000)})`,
        description: "Autonomous synchronization engine built for low-connectivity campus networks.",
        category: "Artificial Intelligence",
        max_members: 4,
        requirements: [
          { skill_name: "Python", required_proficiency: "INTERMEDIATE", importance: "MANDATORY" },
          { skill_name: "Next.js", required_proficiency: "INTERMEDIATE", importance: "PREFERRED" },
        ],
      });
    } else if (type === "VALID_CREDIT") {
      // Transfer small credit amount
      const targetStudent = "student-2";
      await syncEngine.enqueueOperation("CREDIT_TRANSACTION", `tx-mock-${Date.now()}`, {
        from_student_id: studentId,
        to_student_id: targetStudent,
        amount: 5,
        description: "Peer tutoring credit exchange test",
      });
    } else if (type === "ROGUE_CREDIT") {
      // Attempting to spend 999,999 credits offline (Should be REJECTED by server authority!)
      const targetStudent = "student-2";
      await syncEngine.enqueueOperation("CREDIT_TRANSACTION", `tx-rogue-${Date.now()}`, {
        from_student_id: studentId,
        to_student_id: targetStudent,
        amount: 999999,
        description: "Forged offline transaction simulating malicious credit inflation",
      });
    }

    await reloadOperations();
    await reloadBalances();
  };

  // Filter operations based on active tab
  const filteredOperations = operations.filter((op) => {
    if (activeTab === "PENDING") return op.status === "PENDING" || op.status === "SYNCING";
    if (activeTab === "SUCCESS") return op.status === "SUCCESS" || op.status === "CONFLICT_RESOLVED";
    if (activeTab === "FAILED") return op.status === "REJECTED" || op.status === "FAILED" || op.status === "ERROR";
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Sync Engine Developer Workbench
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  Stage 10
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect operation queues, simulate offline mutations, observe conflict resolution &amp; server authority
              </p>
            </div>
          </div>
        </div>

        {/* Sync Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Simulated Offline Toggle */}
          <button
            onClick={() => toggleSimulatedOffline(!isSimulatedOffline)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              isSimulatedOffline
                ? "bg-amber-950/60 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/20"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            {isSimulatedOffline ? <WifiOff className="h-4 w-4 text-amber-400" /> : <Wifi className="h-4 w-4" />}
            <span>{isSimulatedOffline ? "Simulated Offline: ON" : "Simulate Offline"}</span>
          </button>

          {/* Trigger Sync Button */}
          <button
            onClick={handleManualSync}
            disabled={isProcessing || isOffline || isSimulatedOffline}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw className={`h-4 w-4 ${isProcessing ? "animate-spin" : ""}`} />
            <span>Sync All Now</span>
          </button>

          {/* Clear Completed */}
          <button
            onClick={async () => {
              await clearCompletedSync();
              await reloadOperations();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-all"
            title="Remove completed items from view"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Done</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncResultMsg && (
        <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 text-xs flex items-center justify-between">
          <span className="font-mono">{syncResultMsg}</span>
          <button onClick={() => setSyncResultMsg(null)} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Network State */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sync Status</span>
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                isOffline || isSimulatedOffline
                  ? "bg-amber-400 animate-pulse"
                  : syncStatus === "SYNCING"
                  ? "bg-sky-400 animate-spin"
                  : syncStatus === "SYNC_FAILED"
                  ? "bg-rose-400"
                  : "bg-emerald-400"
              }`}
            />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {isOffline || isSimulatedOffline ? "Offline" : syncStatus === "SYNC_FAILED" ? "Sync Failed" : syncStatus === "SYNCING" ? "Syncing" : "Synced"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {isSimulatedOffline
              ? "Manual offline mode enabled"
              : isOffline
              ? "Browser network disconnected"
              : "Connected to FastAPI server"}
          </p>
        </div>

        {/* Pending Operations */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Queue</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-amber-400">{pendingCount}</span>
            <span className="text-xs text-slate-400">operations</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Stored in IndexedDB sync_operations</p>
        </div>

        {/* Successful Operations */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Acknowledged</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-emerald-400">{successCount}</span>
            <span className="text-xs text-slate-400">applied</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Merged via LWW or server rules</p>
        </div>

        {/* Failed / Rejected */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Rejected / Failed</span>
            <XCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-400">{failedCount}</span>
            <span className="text-xs text-slate-400">blocked</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Server-authoritative protection</p>
        </div>
      </div>

      {/* Authoritative Balance Reconciler & Conflict Engine Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Authoritative Reconciler Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <ShieldCheck className="h-5 w-5" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Authoritative Balance Reconciler
            </h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Credits and financial transactions are strictly server-authoritative. Offline clients cannot arbitrarily
            modify or forge credit balances.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-medium text-slate-400">Local IndexedDB Balance:</span>
              <span className="text-sm font-bold font-mono text-amber-400">
                {localBalance !== null ? `${localBalance} credits` : "Loading..."}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-medium text-slate-400">Server Database Balance:</span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                {serverBalance !== null ? `${serverBalance} credits` : isOffline || isSimulatedOffline ? "Offline (Unreachable)" : "Querying..."}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-indigo-500/20 text-[11px] text-slate-400">
              <span>Status:</span>
              <span className="font-semibold text-indigo-300">
                {serverBalance !== null && localBalance !== null && serverBalance === localBalance
                  ? "✓ Perfectly Reconciled"
                  : isOffline || isSimulatedOffline
                  ? "Offline (Local Only)"
                  : "Syncing / Reconciling"}
              </span>
            </div>
          </div>
        </div>

        {/* Mutation Generator Workbench */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400">
              <Zap className="h-5 w-5" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Interactive Offline Mutation Injector
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Click to enqueue test mutations offline</span>
          </div>

          <p className="text-xs text-slate-400">
            Simulate operations while disconnected. When you toggle offline mode off or click Sync, observe how each
            operation behaves against Last-Write-Wins (LWW) and Server-Authoritative rules.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {/* Inject Profile Update */}
            <button
              onClick={() => enqueueSampleMutation("UPDATE_PROFILE")}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-850 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-indigo-600/10 text-indigo-400 group-hover:bg-indigo-600/20">
                <FileCode className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-indigo-300">1. Update Profile (LWW)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Modifies bio &amp; skills. Merged via Last-Write-Wins timestamps.
                </p>
              </div>
            </button>

            {/* Inject Project Creation */}
            <button
              onClick={() => enqueueSampleMutation("CREATE_PROJECT")}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-850 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-cyan-600/10 text-cyan-400 group-hover:bg-cyan-600/20">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-cyan-300">2. Create Project</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Generates project offline. Server creates cloud project &amp; assigns ID.
                </p>
              </div>
            </button>

            {/* Inject Valid Credit Transfer */}
            <button
              onClick={() => enqueueSampleMutation("VALID_CREDIT")}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-850 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-400 group-hover:bg-emerald-600/20">
                <Coins className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-emerald-300">3. Valid Credit (5 credits)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Valid transfer checked against sender balance. Server debits &amp; records ledger.
                </p>
              </div>
            </button>

            {/* Inject Rogue Credit Transfer */}
            <button
              onClick={() => enqueueSampleMutation("ROGUE_CREDIT")}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900 border border-rose-500/30 hover:border-rose-500 hover:bg-rose-950/20 text-left transition-all group"
            >
              <div className="p-2 rounded-lg bg-rose-600/10 text-rose-400 group-hover:bg-rose-600/20">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-rose-300 group-hover:text-rose-200">4. Rogue Credit (999,999)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Malicious transaction simulation. Must be REJECTED &amp; balance reset!
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Operations Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-hidden">
        {/* Table Header & Tabs */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-white">IndexedDB Operations Queue</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live inspection of <code className="text-indigo-400">sync_operations</code> storage
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "ALL" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"
              }`}
            >
              All ({operations.length})
            </button>
            <button
              onClick={() => setActiveTab("PENDING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "PENDING"
                  ? "bg-amber-950/80 text-amber-300 border border-amber-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setActiveTab("SUCCESS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "SUCCESS"
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Successful ({successCount})
            </button>
            <button
              onClick={() => setActiveTab("FAILED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "FAILED"
                  ? "bg-rose-950/80 text-rose-300 border border-rose-500/30 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Rejected/Failed ({failedCount})
            </button>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          {filteredOperations.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No operations found for the current filter.
            </div>
          ) : (
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Operation Type</th>
                  <th className="py-3 px-4 font-semibold">Operation ID</th>
                  <th className="py-3 px-4 font-semibold">Client Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Payload Summary</th>
                  <th className="py-3 px-4 font-semibold">Server Acknowledgement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredOperations.map((op) => (
                  <tr key={op.operation_id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Status badge */}
                    <td className="py-3 px-4">
                      {op.status === "PENDING" ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          PENDING
                        </span>
                      ) : op.status === "SYNCING" ? (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-bold animate-pulse">
                          SYNCING
                        </span>
                      ) : op.status === "SUCCESS" ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          SUCCESS
                        </span>
                      ) : op.status === "CONFLICT_RESOLVED" ? (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold">
                          RESOLVED (LWW)
                        </span>
                      ) : op.status === "REJECTED" ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                          REJECTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                          FAILED
                        </span>
                      )}
                    </td>

                    {/* Operation Type */}
                    <td className="py-3 px-4 font-sans font-semibold text-white">
                      {op.type}
                    </td>

                    {/* Operation ID */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {op.operation_id}
                    </td>

                    {/* Client Timestamp */}
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {new Date(op.client_timestamp).toLocaleTimeString()}
                    </td>

                    {/* Payload summary */}
                    <td className="py-3 px-4 max-w-xs truncate text-[11px] text-slate-300" title={JSON.stringify(op.payload)}>
                      {JSON.stringify(op.payload)}
                    </td>

                    {/* Server Ack details */}
                    <td className="py-3 px-4 text-[11px]">
                      {op.server_ack ? (
                        <div className="space-y-0.5">
                          <p className="text-slate-200">{op.server_ack.message}</p>
                          {op.server_ack.authoritative_state && (
                            <p className="text-indigo-400 text-[10px]">
                              Auth state: {JSON.stringify(op.server_ack.authoritative_state)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Awaiting server acknowledgement...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
