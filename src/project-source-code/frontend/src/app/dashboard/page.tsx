"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { api, LearningGoal, ActivityEventItem, MatchRecommendation } from "@/lib/api";
import { ProjectItem } from "@/lib/repositories/ProjectRepository";
import { CompletenessMeter } from "@/components/ui/CompletenessMeter";
import { ProficiencyBadge } from "@/components/ui/ProficiencyBadge";
import { StateCard } from "@/components/ui/StateCard";
import {
  Coins,
  Award,
  Target,
  Users2,
  FolderGit2,
  GitMerge,
  BarChart3,
  Sparkles,
  ArrowRight,
  TrendingUp,
  PlusCircle,
  ExternalLink,
  Calendar,
  Layers,
} from "lucide-react";

export default function DashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const { isOffline, syncStatus, syncQueueCount, triggerSync } = useOffline();

  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [matches, setMatches] = useState<MatchRecommendation[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [activities, setActivities] = useState<ActivityEventItem[]>([]);
  const [campusShortages, setCampusShortages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Quick Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState(10);
  const [transferRecipient, setTransferRecipient] = useState("student-2");
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [goalRes, matchRes, projRes, actRes, shortageRes] = await Promise.all([
        api.goals.list(profile.id).catch(() => []),
        api.matches.listRecommendations({ student_id: profile.id, limit: 4 }).catch(() => []),
        api.projects.list({ limit: 3 }).catch(() => []),
        api.activities.getCampus(4).catch(() => []),
        api.campusInsights.getShortages({ limit: 4 }).catch(() => []),
      ]);

      setGoals(goalRes);
      setMatches(matchRes);
      setProjects(projRes);
      setActivities(actRes);
      setCampusShortages(shortageRes);
    } catch (err: any) {
      console.warn("Dashboard data fetch note:", err);
      setError("Failed to load some dashboard sections. Offline cache will be used.");
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleQuickTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setTransferError(null);
    setTransferSuccess(false);

    try {
      await api.credits.transfer(profile.id, {
        to_student_id: transferRecipient,
        amount: transferAmount,
        description: "Peer tutoring credit exchange",
      });
      setTransferSuccess(true);
      profile.credit_balance = Math.max(0, profile.credit_balance - transferAmount);
      setTimeout(() => setTransferModalOpen(false), 1500);
    } catch (err: any) {
      setTransferError(err?.message || "Transfer failed. Please check credit balance.");
    }
  };

  if (authLoading) {
    return <StateCard type="loading" title="Loading Student Workspace..." />;
  }

  if (!profile) {
    return (
      <StateCard
        type="empty"
        title="No Student Profile Selected"
        description="Please choose a campus persona from the top navigation to view your personal dashboard."
        actionText="Return to Landing"
        onAction={() => (window.location.href = "/")}
      />
    );
  }

  const teachSkills = profile.skills?.filter((s) => s.direction === "TEACH") || [];
  const learnSkills = profile.skills?.filter((s) => s.direction === "LEARN") || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Offline / Syncing State Banner */}
      {isOffline && (
        <StateCard
          type="offline"
          title="Offline Mode Active"
          description={`Operating from local IndexedDB cache. You have ${syncQueueCount} pending mutations that will sync when connection returns.`}
          actionText="Sync Workbench"
          onAction={() => (window.location.href = "/sync-debug")}
        />
      )}

      {syncStatus === "SYNCING" && (
        <StateCard
          type="syncing"
          title="Synchronizing Campus Graph..."
          description="Batch reconciling offline updates with cloud database."
        />
      )}

      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Autonomous Peer Learning Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Welcome back, {profile.full_name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
            {profile.department} &bull; {profile.year_of_study} &bull; Active in campus peer exchange
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/team-builder"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
          >
            <Users2 className="h-4 w-4" />
            <span>Team Builder Demo</span>
          </Link>
          <button
            onClick={() => setTransferModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 transition-all"
          >
            <Coins className="h-4 w-4 text-amber-400" />
            <span>Transfer Credits</span>
          </button>
        </div>
      </div>

      {/* Core Metrics Bar (Section 6: Skill Credits + Capacities) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Skill Credits</span>
            <Coins className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white flex items-baseline gap-1.5">
            {profile.credit_balance}
            <span className="text-xs font-normal text-amber-400">Credits</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Authoritative balance</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Skills I Teach</span>
            <Award className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white flex items-baseline gap-1.5">
            {teachSkills.length}
            <span className="text-xs font-normal text-emerald-400">Approved</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Earning capacity</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Skills I Learn</span>
            <Target className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white flex items-baseline gap-1.5">
            {learnSkills.length + goals.length}
            <span className="text-xs font-normal text-cyan-400">Goals</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Active curriculum</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold">Peer Matches</span>
            <GitMerge className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-white flex items-baseline gap-1.5">
            {matches.length}
            <span className="text-xs font-normal text-indigo-400">Candidates</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">High reciprocity</p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 spans): Skills I Teach, Skills I Learn, Recommended Matches, Active Projects */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 2: Skills I Can Teach */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-400" />
                  Skills I Can Teach
                </h2>
                <p className="text-xs text-slate-400">Skills approved to mentor campus peers and earn credits</p>
              </div>
              <Link href="/skills" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                Manage Skills →
              </Link>
            </div>

            {teachSkills.length === 0 ? (
              <StateCard
                type="empty"
                title="No Teaching Skills Added"
                description="Declare skills you can teach to start earning Skill Credits."
                actionText="Add Teaching Skill"
                onAction={() => (window.location.href = "/skills")}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teachSkills.map((s) => (
                  <div key={s.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{s.skill_name || "Specialized Skill"}</span>
                      <ProficiencyBadge level={s.proficiency_level} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {s.description || `${s.years_experience || 1} year(s) hands-on experience`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Skills I Want to Learn */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Target className="h-5 w-5 text-cyan-400" />
                  Skills I Want to Learn
                </h2>
                <p className="text-xs text-slate-400">Active learning targets and milestones</p>
              </div>
              <Link href="/learning-goals" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                Set New Goal →
              </Link>
            </div>

            {goals.length === 0 && learnSkills.length === 0 ? (
              <StateCard
                type="empty"
                title="No Learning Goals Yet"
                description="Pick target skills you wish to learn from campus peers."
                actionText="Explore Skills"
                onAction={() => (window.location.href = "/skills")}
              />
            ) : (
              <div className="space-y-2.5">
                {goals.slice(0, 3).map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{g.skill_name || "Target Skill"}</span>
                        <ProficiencyBadge level={g.target_proficiency} size="sm" />
                      </div>
                      {g.description && <p className="text-[11px] text-slate-400 mt-0.5">{g.description}</p>}
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {g.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Recommended Matches */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <GitMerge className="h-5 w-5 text-indigo-400" />
                  Recommended Peer Matches
                </h2>
                <p className="text-xs text-slate-400">Students with mutual teaching &amp; learning complementarity</p>
              </div>
              <Link href="/learn" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                View All Matches →
              </Link>
            </div>

            {matches.length === 0 ? (
              <StateCard
                type="empty"
                title="Finding Complementary Matches..."
                description="Add more skills to your profile to unlock reciprocal matching."
                actionText="Add Skills"
                onAction={() => (window.location.href = "/skills")}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matches.slice(0, 4).map((m) => (
                  <div key={m.candidate_id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-bold text-white">{m.candidate_name}</p>
                        <p className="text-[10px] text-slate-400">{m.candidate_department}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-mono text-[10px] font-bold">
                        {Math.round(m.match_score * 100)}% Fit
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg">
                      <span className="text-emerald-400 font-semibold">Teaches: </span>
                      {m.skills_offered?.slice(0, 2).join(", ") || "Technical Skills"}
                    </div>

                    <Link
                      href="/learn"
                      className="block text-center py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white text-[11px] font-semibold transition-all border border-slate-800"
                    >
                      Connect &amp; Schedule
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Active Projects */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FolderGit2 className="h-5 w-5 text-indigo-400" />
                  Active Campus Projects
                </h2>
                <p className="text-xs text-slate-400">Multidisciplinary projects looking for team members</p>
              </div>
              <Link href="/projects" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                Explore Projects →
              </Link>
            </div>

            {projects.length === 0 ? (
              <StateCard
                type="empty"
                title="No Projects Available"
                description="Create a project to assemble an AI-optimized multidisciplinary team."
                actionText="Create Project"
                onAction={() => (window.location.href = "/projects")}
              />
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white">{p.title}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                          {p.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{p.description}</p>
                    </div>

                    <Link
                      href={`/team-builder?projectId=${p.id}`}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 shrink-0"
                    >
                      <Users2 className="h-3.5 w-3.5" />
                      <span>Assemble Team</span>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1 span): Section 1 Completeness Meter + Section 7 Campus Shortages */}
        <div className="space-y-8">
          {/* Section 1: Skill Profile Completion */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Skill Profile Completion
            </h3>
            <CompletenessMeter profile={profile} />
          </div>

          {/* Section 7: Campus Skill Opportunities */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Campus Skill Shortages
              </h3>
              <Link href="/campus-insights" className="text-[11px] text-indigo-400 hover:text-indigo-300">
                Insights →
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              Skills with high demand but low teacher supply. Great opportunities to teach and earn credits!
            </p>

            <div className="space-y-2.5">
              {campusShortages.slice(0, 4).map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">{s.skill_name || s.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {s.demand_count || 12} learners requesting &bull; {s.supply_count || 2} teachers
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                    Gap +{s.gap_score || 10}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick AI Skill Extraction Promo */}
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Instant Skill Analyzer
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Have an updated resume or GitHub bio? Let our local AI extract skills and proficiency ratings in seconds.
            </p>
            <Link
              href="/skill-analyzer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm"
            >
              <span>Analyze Bio</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Transfer Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-400" />
                Transfer Skill Credits
              </h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-500 hover:text-white">
                &times;
              </button>
            </div>

            {transferSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs">
                ✓ Transfer completed authoritatively!
              </div>
            )}

            {transferError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                {transferError}
              </div>
            )}

            <form onSubmit={handleQuickTransfer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Recipient Student ID</label>
                <input
                  type="text"
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Credit Amount</label>
                <input
                  type="number"
                  min="1"
                  max={profile.credit_balance}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
