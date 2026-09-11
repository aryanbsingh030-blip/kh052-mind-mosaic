"use client";

import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  WifiOff,
  RefreshCw,
  HelpCircle,
  LucideIcon,
} from "lucide-react";

export type StateCardType = "loading" | "empty" | "error" | "offline" | "syncing" | "success";

interface StateCardProps {
  type: StateCardType;
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  className?: string;
}

export const StateCard: React.FC<StateCardProps> = ({
  type,
  title,
  description,
  actionText,
  onAction,
  icon: CustomIcon,
  className = "",
}) => {
  if (type === "loading") {
    return (
      <div
        className={`rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center animate-pulse flex flex-col items-center justify-center min-h-[220px] ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="h-10 w-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 mb-3 animate-spin">
          <RefreshCw className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-slate-200">{title || "Loading intelligence data..."}</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          {description || "Retrieving local indexed records and synchronizing latest campus metrics."}
        </p>
      </div>
    );
  }

  if (type === "empty") {
    const Icon = CustomIcon || HelpCircle;
    return (
      <div
        className={`rounded-2xl border border-slate-800/80 bg-slate-900/30 p-8 text-center flex flex-col items-center justify-center min-h-[200px] ${className}`}
      >
        <div className="h-11 w-11 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-3">
          <Icon className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-bold text-slate-200">{title || "No items found"}</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          {description || "There are no records matching the current filter criteria."}
        </p>
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="mt-4 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
          >
            {actionText}
          </button>
        )}
      </div>
    );
  }

  if (type === "error") {
    return (
      <div
        className={`rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-center flex flex-col items-center justify-center min-h-[180px] ${className}`}
        role="alert"
      >
        <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
          <AlertCircle className="h-5 w-5" />
        </div>
        <h4 className="text-sm font-bold text-rose-200">{title || "Unable to load data"}</h4>
        <p className="text-xs text-rose-300/80 mt-1 max-w-sm">
          {description || "A network or validation error occurred. You can retry or continue in offline mode."}
        </p>
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="mt-4 px-4 py-1.5 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition-all"
          >
            {actionText}
          </button>
        )}
      </div>
    );
  }

  if (type === "offline") {
    return (
      <div
        className={`rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 flex items-center justify-between text-xs ${className}`}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <WifiOff className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-amber-300">{title || "Operating in Offline Mode"}</p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              {description || "Serving cached data from IndexedDB. All mutations will queue for auto-synchronization."}
            </p>
          </div>
        </div>
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-[11px] font-semibold transition-all shrink-0"
          >
            {actionText}
          </button>
        )}
      </div>
    );
  }

  if (type === "syncing") {
    return (
      <div
        className={`rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 flex items-center gap-3 text-xs ${className}`}
      >
        <RefreshCw className="h-4 w-4 text-sky-400 animate-spin shrink-0" />
        <div>
          <p className="font-semibold text-sky-300">{title || "Synchronizing with Server..."}</p>
          <p className="text-slate-400 text-[11px]">{description || "Applying offline mutations and resolving timestamps."}</p>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div
      className={`rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex items-center gap-3 text-xs ${className}`}
    >
      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
        <CheckCircle2 className="h-4 w-4" />
      </div>
      <div>
        <p className="font-semibold text-emerald-300">{title || "Action Successful"}</p>
        <p className="text-slate-400 text-[11px] mt-0.5">{description || "Changes have been confirmed and recorded."}</p>
      </div>
    </div>
  );
};
