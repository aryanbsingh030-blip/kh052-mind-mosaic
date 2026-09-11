import React from "react";
import { ProficiencyLevel } from "@/lib/api";

interface Props {
  level: ProficiencyLevel;
  size?: "sm" | "md";
}

export const ProficiencyBadge: React.FC<Props> = ({ level, size = "md" }) => {
  const getStyles = () => {
    switch (level) {
      case "EXPERT":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "ADVANCED":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "INTERMEDIATE":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      case "BEGINNER":
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
  };

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-semibold";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border uppercase tracking-wider font-mono ${getStyles()} ${sizeClasses}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
      {level}
    </span>
  );
};
