import React from "react";
import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<Props> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center">
      <div className="rounded-full bg-slate-800/80 p-4 text-slate-400 mb-4 ring-1 ring-slate-700/50">
        <Icon className="h-8 w-8 text-indigo-400" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="max-w-sm text-sm text-slate-400 mb-6">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
