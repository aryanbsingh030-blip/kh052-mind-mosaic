import React from "react";

export const LoadingSkeleton: React.FC<{ rows?: number; className?: string }> = ({
  rows = 3,
  className = "",
}) => {
  return (
    <div className={`space-y-4 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 w-full rounded-xl bg-slate-800/50 border border-slate-800/40" />
      ))}
    </div>
  );
};
