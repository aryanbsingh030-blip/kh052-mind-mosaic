"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, TeachingSessionItem } from "@/lib/api";
import { StateCard } from "@/components/ui/StateCard";
import {
  GraduationCap,
  Calendar,
  Coins,
  CheckCircle2,
  Clock,
  XCircle,
  Star,
  Users2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function TeachPage() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<TeachingSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"REQUESTED" | "ACCEPTED" | "COMPLETED">("REQUESTED");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const data = await api.sessions.listByStudent(profile.id, { role: "teacher" });
      setSessions(data || []);
    } catch (err) {
      console.warn("Sessions fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleAccept = async (sessionId: string) => {
    try {
      await api.sessions.accept(sessionId, { meeting_link: "https://meet.google.com/campus-peer-tutoring" });
      setActionMessage("Session accepted! Video link shared with learner.");
      await loadSessions();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage(`Error accepting session: ${err?.message || err}`);
    }
  };

  const handleComplete = async (sessionId: string) => {
    try {
      await api.sessions.complete(sessionId, { actual_duration_minutes: 60 });
      setActionMessage("Session completed! 10 Skill Credits transferred to your account.");
      await loadSessions();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage(`Error completing session: ${err?.message || err}`);
    }
  };

  const handleCancel = async (sessionId: string) => {
    try {
      await api.sessions.cancel(sessionId, "Schedule conflict");
      setActionMessage("Session cancelled.");
      await loadSessions();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err: any) {
      setActionMessage(`Error cancelling session: ${err?.message || err}`);
    }
  };

  const filteredSessions = sessions.filter((s) => {
    if (activeTab === "REQUESTED") return s.status === "REQUESTED";
    if (activeTab === "ACCEPTED") return s.status === "ACCEPTED";
    if (activeTab === "COMPLETED") return s.status === "COMPLETED";
    return true;
  });

  const teachSkills = profile?.skills?.filter((s) => s.direction === "TEACH") || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Teaching Hub
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Peer Tutoring
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage incoming session requests, conduct tutoring sessions, and earn Skill Credits
            </p>
          </div>
        </div>

        <Link
          href="/settings"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 transition-all"
        >
          <Calendar className="h-4 w-4 text-indigo-400" />
          <span>Edit Availability</span>
        </Link>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs">
          {actionMessage}
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <span className="text-xs font-semibold text-slate-400">Active Teaching Skills</span>
          <div className="mt-2 text-2xl font-black text-white font-mono">{teachSkills.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Skills campus learners can request</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <span className="text-xs font-semibold text-slate-400">Completed Sessions</span>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
            {sessions.filter((s) => s.status === "COMPLETED").length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Verified peer tutoring exchanges</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <span className="text-xs font-semibold text-slate-400">Total Credits Earned</span>
          <div className="mt-2 text-2xl font-black text-amber-400 font-mono">
            {sessions.filter((s) => s.status === "COMPLETED").length * 10}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">10 credits awarded per verified hour</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 max-w-fit text-xs">
        <button
          onClick={() => setActiveTab("REQUESTED")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
            activeTab === "REQUESTED"
              ? "bg-amber-950/80 text-amber-300 border border-amber-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Incoming Requests ({sessions.filter((s) => s.status === "REQUESTED").length})
        </button>
        <button
          onClick={() => setActiveTab("ACCEPTED")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
            activeTab === "ACCEPTED"
              ? "bg-indigo-950/80 text-indigo-300 border border-indigo-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Scheduled Sessions ({sessions.filter((s) => s.status === "ACCEPTED").length})
        </button>
        <button
          onClick={() => setActiveTab("COMPLETED")}
          className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
            activeTab === "COMPLETED"
              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Past Sessions ({sessions.filter((s) => s.status === "COMPLETED").length})
        </button>
      </div>

      {/* Session Cards */}
      {loading ? (
        <StateCard type="loading" title="Loading Tutoring Sessions..." />
      ) : filteredSessions.length === 0 ? (
        <StateCard
          type="empty"
          title={`No ${activeTab.toLowerCase()} sessions`}
          description={
            activeTab === "REQUESTED"
              ? "Learners will request sessions based on your declared teaching skills."
              : "No sessions currently found in this stage."
          }
          actionText="Add More Skills to Teach"
          onAction={() => (window.location.href = "/skills")}
        />
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Learner: {session.learner_name || "Campus Peer"}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    Skill: {session.skill_name || "Programming"}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Scheduled: {new Date(session.scheduled_at).toLocaleString()} &bull; Duration:{" "}
                  {session.duration_minutes || 60} mins
                </p>
                {session.notes && <p className="text-[11px] text-slate-500 italic">&quot;{session.notes}&quot;</p>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {session.status === "REQUESTED" && (
                  <>
                    <button
                      onClick={() => handleAccept(session.id)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                    >
                      Accept Session
                    </button>
                    <button
                      onClick={() => handleCancel(session.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                    >
                      Decline
                    </button>
                  </>
                )}

                {session.status === "ACCEPTED" && (
                  <button
                    onClick={() => handleComplete(session.id)}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Complete &amp; Earn Credits</span>
                  </button>
                )}

                {session.status === "COMPLETED" && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>+10 Credits Earned</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
