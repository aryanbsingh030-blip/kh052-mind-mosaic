import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<Props> = ({ message, onRetry }) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/30 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
};
