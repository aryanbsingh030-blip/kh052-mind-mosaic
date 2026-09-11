import React from "react";
import { StudentSkill } from "@/lib/api";
import { ProficiencyBadge } from "./ProficiencyBadge";
import { Award, Clock, Trash2, CheckCircle, Sparkles } from "lucide-react";

interface Props {
  skill: StudentSkill;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export const SkillCard: React.FC<Props> = ({ skill, onDelete, isDeleting }) => {
  const isTeach = skill.direction === "TEACH";

  return (
    <div className="group relative rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-indigo-500/5">
      {/* Top row: Category & Proficiency */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300">
          {skill.skill_category || "General"}
        </span>
        <div className="flex items-center gap-2">
          <ProficiencyBadge level={skill.proficiency_level} size="sm" />
          {skill.verified && (
            <span title="Verified by campus assessment" className="text-emerald-400">
              <CheckCircle className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="mb-2">
        <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
          {skill.skill_name || "Untitled Skill"}
        </h3>
      </div>

      {/* Direction & Experience */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mb-3">
        <span
          className={`inline-flex items-center gap-1 font-medium ${
            isTeach ? "text-emerald-400" : "text-sky-400"
          }`}
        >
          {isTeach ? (
            <>
              <Award className="h-3.5 w-3.5" /> Can Teach
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" /> Wants to Learn
            </>
          )}
        </span>

        {skill.years_experience > 0 && (
          <span className="inline-flex items-center gap-1 text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            {skill.years_experience} {skill.years_experience === 1 ? "yr" : "yrs"} exp
          </span>
        )}
      </div>

      {/* Description / Story */}
      {skill.description && (
        <div className="mt-2 rounded-lg bg-slate-950/60 p-3 border border-slate-800/60 text-xs text-slate-300 italic line-clamp-3">
          &quot;{skill.description}&quot;
        </div>
      )}

      {/* Delete button */}
      {onDelete && (
        <div className="mt-4 flex items-center justify-end border-t border-slate-800/60 pt-3">
          <button
            onClick={() => onDelete(skill.id)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1 text-xs font-medium text-rose-400 hover:text-rose-300 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isDeleting ? "Removing..." : "Remove"}
          </button>
        </div>
      )}
    </div>
  );
};
