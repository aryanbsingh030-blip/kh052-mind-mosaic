"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  Skill,
  LearningGoal,
  ProficiencyLevel,
  GoalStatus,
} from "@/lib/api";
import { ProficiencyBadge } from "@/components/ui/ProficiencyBadge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import {
  Target,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  X,
  Flag,
  Sparkles,
} from "lucide-react";

const PROFICIENCIES: ProficiencyLevel[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
];

const STATUS_FILTERS: (GoalStatus | "ALL")[] = [
  "ALL",
  "NOT_STARTED",
  "IN_PROGRESS",
  "ACHIEVED",
];

export default function LearningGoalsPage() {
  const { profile, loading: authLoading } = useAuth();

  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [canonicalSkills, setCanonicalSkills] = useState<Skill[]>([]);
  const [activeFilter, setActiveFilter] = useState<GoalStatus | "ALL">("ALL");

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [targetProficiency, setTargetProficiency] = useState<ProficiencyLevel>("ADVANCED");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");

  // Loading & action states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadGoals = async (studentId: string) => {
    setLoading(true);
    try {
      const list = await api.goals.list(studentId);
      setGoals(list);
    } catch (err) {
      console.error("Failed to load learning goals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!profile?.id) return;
      await loadGoals(profile.id);

      try {
        const skillsList = await api.skills.list({ limit: 100 });
        setCanonicalSkills(skillsList);
        if (skillsList.length > 0) {
          setSelectedSkillId(skillsList[0].id);
        }
      } catch (err) {
        console.error("Failed to load skills taxonomy:", err);
      }
    };

    init();
  }, [profile?.id]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !selectedSkillId) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await api.goals.create(profile.id, {
        skill_id: selectedSkillId,
        target_proficiency: targetProficiency,
        target_date: targetDate || undefined,
        description: description.trim() || undefined,
      });

      await loadGoals(profile.id);
      setIsModalOpen(false);
      setDescription("");
      setTargetDate("");
      setSuccessMsg("Learning goal created successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create learning goal.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (goal: LearningGoal, newStatus: GoalStatus) => {
    setUpdatingId(goal.id);
    try {
      await api.goals.update(goal.id, { status: newStatus });
      setGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, status: newStatus } : g))
      );
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update goal status.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    setDeletingId(goalId);
    try {
      await api.goals.delete(goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete learning goal.");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || (!profile && loading)) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  const filteredGoals = goals.filter((g) => {
    if (activeFilter === "ALL") return true;
    return g.status === activeFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Target className="h-6 w-6 text-cyan-400" />
            Learning Goals & Milestones
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Define target proficiencies and deadlines. The matching engine connects you with peer tutors to help you reach them.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Set New Goal
        </button>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} />}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          {successMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`border-b-2 px-4 py-2.5 text-xs font-bold transition-all ${
              activeFilter === f
                ? "border-cyan-500 text-cyan-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {f.replace("_", " ")}
            <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              {f === "ALL" ? goals.length : goals.filter((g) => g.status === f).length}
            </span>
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {filteredGoals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.map((goal) => {
            const isAchieved = goal.status === "ACHIEVED";
            const isInProgress = goal.status === "IN_PROGRESS";

            return (
              <div
                key={goal.id}
                className="group relative rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm transition-all hover:border-slate-700 hover:bg-slate-900/90 flex flex-col justify-between"
              >
                <div>
                  {/* Category & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="rounded-md bg-slate-800/80 px-2.5 py-1 text-xs font-medium text-slate-300">
                      {goal.skill_category || "Technology"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                        isAchieved
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : isInProgress
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {goal.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Skill & Target Proficiency */}
                  <div className="mb-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {goal.skill_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <span className="text-slate-400">Target:</span>
                    <ProficiencyBadge level={goal.target_proficiency} size="sm" />
                  </div>

                  {/* Deadline */}
                  {goal.target_date && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>Target Date: {goal.target_date}</span>
                    </div>
                  )}

                  {/* Notes */}
                  {goal.description && (
                    <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60 mb-4 line-clamp-3">
                      {goal.description}
                    </p>
                  )}
                </div>

                {/* Status Switcher & Delete Footer */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {goal.status !== "ACHIEVED" && (
                      <button
                        onClick={() => handleUpdateStatus(goal, "ACHIEVED")}
                        disabled={updatingId === goal.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark Done
                      </button>
                    )}

                    {goal.status === "NOT_STARTED" && (
                      <button
                        onClick={() => handleUpdateStatus(goal, "IN_PROGRESS")}
                        disabled={updatingId === goal.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-all"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Start
                      </button>
                    )}

                    {goal.status === "ACHIEVED" && (
                      <button
                        onClick={() => handleUpdateStatus(goal, "IN_PROGRESS")}
                        disabled={updatingId === goal.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-400 hover:text-slate-200"
                      >
                        Reopen
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    disabled={deletingId === goal.id}
                    className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    title="Delete goal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Target}
          title="No Learning Goals Found"
          description="Set a target skill and proficiency milestone to track your academic and technical growth."
          actionText="Set New Learning Goal"
          onAction={() => setIsModalOpen(true)}
        />
      )}

      {/* Create Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-cyan-400" />
                Set New Learning Goal
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              {/* Select Skill */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Target Skill from Campus Taxonomy
                </label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {canonicalSkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Proficiency */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Target Proficiency Benchmark
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PROFICIENCIES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setTargetProficiency(p)}
                      className={`rounded-lg py-2 px-1 text-[11px] font-mono font-bold uppercase transition-all ${
                        targetProficiency === p
                          ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Target Completion Date (Optional)
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Description / Milestone plan */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Milestone Plan & Context (Optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none placeholder-slate-600"
                  placeholder="e.g. Prepare for technical interviews or build a production API."
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 hover:bg-cyan-500 transition-all disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {submitting ? "Creating..." : "Save Learning Goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
