"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  CreditBalanceInfo,
  CreditTransaction,
  CreditTransactionType,
  TeachingSessionItem,
  SkillDemandIndexItem,
  Skill,
  ProfileSummary,
} from "@/lib/api";
import {
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  Calendar,
  Clock,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Search,
  Filter,
  GraduationCap,
  BookOpen,
  Send,
  Video,
  Star,
  ExternalLink,
  ChevronRight,
  Info,
  Copy,
  Check,
  Flame,
  Award,
  RefreshCw,
  PlusCircle,
} from "lucide-react";

export default function CreditsPage() {
  const { profile, refreshProfile, seedProfiles } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"ledger" | "teaching" | "learning" | "demand" | "sandbox">("ledger");

  // State
  const [balanceInfo, setBalanceInfo] = useState<CreditBalanceInfo | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [demandIndex, setDemandIndex] = useState<SkillDemandIndexItem[]>([]);
  const [teachingSessions, setTeachingSessions] = useState<TeachingSessionItem[]>([]);
  const [learningSessions, setLearningSessions] = useState<TeachingSessionItem[]>([]);
  const [skillsList, setSkillsList] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [txFilter, setTxFilter] = useState<string>("ALL");
  const [txSearch, setTxSearch] = useState<string>("");
  const [demandCategoryFilter, setDemandCategoryFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Action Modals State
  const [showBookModal, setShowBookModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState<TeachingSessionItem | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState<TeachingSessionItem | null>(null);
  const [showCancelModal, setShowCancelModal] = useState<TeachingSessionItem | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState<TeachingSessionItem | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState<CreditTransaction | null>(null);

  // Form States
  const [bookSkillId, setBookSkillId] = useState("");
  const [bookTeacherId, setBookTeacherId] = useState("");
  const [bookDateTime, setBookDateTime] = useState("");
  const [bookDuration, setBookDuration] = useState(60);
  const [bookCost, setBookCost] = useState(10);
  const [bookNotes, setBookNotes] = useState("");

  const [acceptLink, setAcceptLink] = useState("https://meet.jit.si/ai-skill-exchange-session");
  const [acceptNotes, setAcceptNotes] = useState("");

  const [completeNotes, setCompleteNotes] = useState("");
  const [completeDuration, setCompleteDuration] = useState(60);

  const [cancelReason, setCancelReason] = useState("");

  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSummary, setFeedbackSummary] = useState("");

  const [transferTargetId, setTransferTargetId] = useState("");
  const [transferAmount, setTransferAmount] = useState(10);
  const [transferReason, setTransferReason] = useState("");

  const [adminAmount, setAdminAmount] = useState(20);
  const [adminReason, setAdminReason] = useState("Activity bonus compensation");

  // Notifications
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Initial Load
  useEffect(() => {
    loadData();
  }, [profile?.id]);

  const loadData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const [bal, ledger, demandRes, teachSess, learnSess, allSkills] = await Promise.all([
        api.credits.getBalance(profile.id),
        api.credits.getLedger(profile.id, { limit: 50 }),
        api.credits.getDemandIndex(),
        api.sessions.listByStudent(profile.id, { role: "teacher" }),
        api.sessions.listByStudent(profile.id, { role: "learner" }),
        api.skills.list({ limit: 100 }),
      ]);

      setBalanceInfo(bal);
      setTransactions(ledger);
      setDemandIndex(demandRes.skills || []);
      setTeachingSessions(teachSess);
      setLearningSessions(learnSess);
      setSkillsList(allSkills);
    } catch (err: any) {
      console.error("Failed to load credit economy data:", err);
      setActionNotice({ type: "error", message: err.message || "Failed to load credit data." });
    } finally {
      setLoading(false);
    }
  };

  const notify = (message: string, type: "success" | "error" = "success") => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 6000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // --- Handlers ---

  // 1. Learner Books / Requests a Session
  const handleBookSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !bookSkillId || !bookTeacherId || !bookDateTime) {
      notify("Please fill in all required booking fields.", "error");
      return;
    }

    if (profile.credit_balance < bookCost) {
      notify(`Insufficient balance (${profile.credit_balance} available, ${bookCost} required). Negative balances are prohibited.`, "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.sessions.request(profile.id, {
        teacher_student_id: bookTeacherId,
        skill_id: bookSkillId,
        scheduled_at: new Date(bookDateTime).toISOString(),
        duration_minutes: bookDuration,
        credit_amount: bookCost,
        notes: bookNotes,
      });

      notify("Learning session request submitted! Teacher must accept before the session is confirmed.");
      setShowBookModal(false);
      setBookNotes("");
      await loadData();
      await refreshProfile();
      setActiveTab("learning");
    } catch (err: any) {
      notify(err.message || "Failed to submit session request.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Teacher Accepts Session
  const handleAcceptSession = async () => {
    if (!showAcceptModal) return;
    setSubmitting(true);
    try {
      await api.sessions.accept(showAcceptModal.id, {
        meeting_link: acceptLink,
        notes: acceptNotes,
      });

      notify("Session accepted! Meeting details shared with learner.");
      setShowAcceptModal(null);
      await loadData();
    } catch (err: any) {
      notify(err.message || "Failed to accept session.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Complete Session & Award Credits (Anti-Abuse Verified)
  const handleCompleteSession = async () => {
    if (!showCompleteModal) return;
    if (!completeNotes || completeNotes.trim().length < 5) {
      notify("Anti-abuse safeguard: Please provide verification notes summarizing the conducted lesson.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.sessions.complete(showCompleteModal.id, {
        verification_notes: completeNotes,
        actual_duration_minutes: completeDuration,
      });

      notify(`Session completed successfully! Awarded ${showCompleteModal.credit_amount} Skill Credits to your wallet.`);
      setShowCompleteModal(null);
      setCompleteNotes("");
      await loadData();
      await refreshProfile();
    } catch (err: any) {
      notify(err.message || "Failed to complete session.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Cancel Session
  const handleCancelSession = async () => {
    if (!showCancelModal) return;
    if (!cancelReason || cancelReason.trim().length < 3) {
      notify("Please provide a reason for cancelling.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.sessions.cancel(showCancelModal.id, cancelReason);
      notify("Session cancelled.");
      setShowCancelModal(null);
      setCancelReason("");
      await loadData();
    } catch (err: any) {
      notify(err.message || "Failed to cancel session.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 5. Learner Submits Feedback Log
  const handleSubmitFeedback = async () => {
    if (!showFeedbackModal) return;
    setSubmitting(true);
    try {
      await api.sessions.submitLearningLog(showFeedbackModal.id, {
        rating: feedbackRating,
        feedback: feedbackText,
        learned_summary: feedbackSummary,
      });

      notify("Learning reflection and rating submitted successfully!");
      setShowFeedbackModal(null);
      setFeedbackText("");
      setFeedbackSummary("");
      await loadData();
    } catch (err: any) {
      notify(err.message || "Failed to submit reflection log.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Transfer Credits
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !transferTargetId) return;

    if (profile.credit_balance < transferAmount) {
      notify(`Insufficient credit balance. You have ${profile.credit_balance} credits available.`, "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.credits.transfer(profile.id, {
        to_student_id: transferTargetId,
        amount: Number(transferAmount),
        reason: transferReason || "Peer peer credit exchange",
      });

      notify(`Successfully sent ${transferAmount} credits!`);
      setShowTransferModal(false);
      setTransferReason("");
      await loadData();
      await refreshProfile();
    } catch (err: any) {
      notify(err.message || "Transfer failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 7. Claim Bonus (Sandbox)
  const handleClaimBonus = async () => {
    if (!profile?.id) return;
    setSubmitting(true);
    try {
      await api.credits.awardBonus({
        student_id: profile.id,
        amount: 25,
        reason: "Milestone: Peer tutor engagement bonus",
      });
      notify("Awarded +25 Bonus Credits to your account!");
      await loadData();
      await refreshProfile();
    } catch (err: any) {
      notify(err.message || "Failed to award bonus.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // 8. Admin Adjustment (Sandbox)
  const handleAdminAdjust = async () => {
    if (!profile?.id) return;
    setSubmitting(true);
    try {
      await api.credits.adminAdjust({
        student_id: profile.id,
        amount: Number(adminAmount),
        reason: adminReason,
      });
      notify(`Admin adjustment of ${adminAmount > 0 ? "+" : ""}${adminAmount} credits applied!`);
      await loadData();
      await refreshProfile();
    } catch (err: any) {
      notify(err.message || "Admin adjustment failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesType =
        txFilter === "ALL" ||
        tx.type === txFilter ||
        tx.transaction_type === txFilter;

      const searchLower = txSearch.toLowerCase();
      const matchesSearch =
        !txSearch ||
        (tx.reason && tx.reason.toLowerCase().includes(searchLower)) ||
        (tx.description && tx.description.toLowerCase().includes(searchLower)) ||
        (tx.student_name && tx.student_name.toLowerCase().includes(searchLower)) ||
        (tx.from_student_name && tx.from_student_name.toLowerCase().includes(searchLower)) ||
        (tx.to_student_name && tx.to_student_name.toLowerCase().includes(searchLower)) ||
        tx.id.toLowerCase().includes(searchLower);

      return matchesType && matchesSearch;
    });
  }, [transactions, txFilter, txSearch]);

  // Filtered demand index
  const filteredDemand = useMemo(() => {
    if (demandCategoryFilter === "ALL") return demandIndex;
    if (demandCategoryFilter === "HIGH") return demandIndex.filter((s) => s.is_high_demand);
    return demandIndex.filter((s) => s.category === demandCategoryFilter);
  }, [demandIndex, demandCategoryFilter]);

  // Categories list
  const demandCategories = useMemo(() => {
    const cats = new Set(demandIndex.map((s) => s.category));
    return Array.from(cats).filter(Boolean);
  }, [demandIndex]);

  // Helper for badge color
  const getTxTypeBadge = (type: string) => {
    switch (type) {
      case "TEACHING_REWARD":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "LEARNING_COST":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "BONUS":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "ADMIN_ADJUSTMENT":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "REFUND":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-slate-500/10 text-slate-300 border-slate-700";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "ACCEPTED":
      case "SCHEDULED":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
      case "COMPLETED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "CANCELLED":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      default:
        return "bg-slate-700 text-slate-300 border-slate-600";
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner & Alert Notices */}
      {actionNotice && (
        <div
          className={`flex items-center justify-between rounded-xl border p-4 shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            actionNotice.type === "success"
              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200"
              : "border-rose-500/30 bg-rose-950/40 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {actionNotice.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
            )}
            <p className="text-sm font-medium">{actionNotice.message}</p>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-xs uppercase tracking-wider opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                <Coins className="h-3.5 w-3.5" /> Stage 7: Skill Credit Economy
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Anti-Abuse Protected
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Skill Credit <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">Ledger & Economy</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
              Transparent peer knowledge exchange. Earn credits by teaching your strongest skills, and spend credits to learn from verified peer mentors.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowBookModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-cyan-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <BookOpen className="h-4 w-4" /> Book Learning Session
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-all"
            >
              <Send className="h-4 w-4 text-amber-400" /> Transfer
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center justify-center h-10 w-10 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
              title="Refresh Balance & Ledger"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Anti-Abuse Integrity Guard Banner */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-indigo-400" />
            <span>
              Negative balance protection: <strong className="text-emerald-400">ACTIVE</strong> (Zero negative balances permitted)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <span>
              Credit payout rule: <strong className="text-slate-200">Awarded after verified session completion</strong> (No instant clicks)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            <span>
              High-Demand Skill index: <strong className="text-cyan-400">Live Campus Multipliers</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 4 Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Current Balance */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-950 p-6 shadow-lg group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Current Balance</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 group-hover:scale-110 transition-transform">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-baseline gap-2">
              {profile?.credit_balance ?? 0}
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/80">Credits</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Spendable on learning sessions and project mentorships
            </p>
          </div>
        </div>

        {/* Card 2: Total Earned */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-950 p-6 shadow-lg group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Earned</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 group-hover:scale-110 transition-transform">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-baseline gap-2">
              +{balanceInfo?.total_earned ?? 0}
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">Earned</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Teaching rewards, peer mentorships & platform bonuses
            </p>
          </div>
        </div>

        {/* Card 3: Total Spent */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-slate-900 to-slate-950 p-6 shadow-lg group hover:border-rose-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Total Spent</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 group-hover:scale-110 transition-transform">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-baseline gap-2">
              -{balanceInfo?.total_spent ?? 0}
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400/80">Spent</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Invested into learning new skills from peer experts
            </p>
          </div>
        </div>

        {/* Card 4: Active Sessions */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900 to-slate-950 p-6 shadow-lg group hover:border-indigo-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Active Sessions</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 group-hover:scale-110 transition-transform">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-baseline gap-2">
              {teachingSessions.filter((s) => s.status === "REQUESTED" || s.status === "ACCEPTED").length +
                learningSessions.filter((s) => s.status === "REQUESTED" || s.status === "ACCEPTED").length}
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400/80">In Flight</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {teachingSessions.filter((s) => s.status === "REQUESTED").length} incoming requests pending
            </p>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "ledger"
              ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          }`}
        >
          <Coins className="h-4 w-4" /> Credit Ledger
          <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            {transactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("teaching")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "teaching"
              ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          }`}
        >
          <GraduationCap className="h-4 w-4" /> Teaching Flow
          {teachingSessions.filter((s) => s.status === "REQUESTED").length > 0 && (
            <span className="ml-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-xs font-bold animate-pulse">
              {teachingSessions.filter((s) => s.status === "REQUESTED").length} New
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("learning")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "learning"
              ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          }`}
        >
          <BookOpen className="h-4 w-4" /> Learning Flow
          <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
            {learningSessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("demand")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "demand"
              ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          }`}
        >
          <Flame className="h-4 w-4 text-orange-400" /> Skill Demand Index
          <span className="ml-1 rounded-full bg-orange-500/20 text-orange-300 px-2 py-0.5 text-xs font-bold">
            {demandIndex.filter((s) => s.is_high_demand).length} Hot
          </span>
        </button>

        <button
          onClick={() => setActiveTab("sandbox")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === "sandbox"
              ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          }`}
        >
          <Sparkles className="h-4 w-4 text-purple-400" /> Test Sandbox
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CREDIT LEDGER & TRANSACTIONS                                       */}
      {/* ========================================================================= */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          {/* Filters & Search Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Type Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {["ALL", "TEACHING_REWARD", "LEARNING_COST", "BONUS", "ADMIN_ADJUSTMENT", "REFUND"].map((type) => (
                <button
                  key={type}
                  onClick={() => setTxFilter(type)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    txFilter === type
                      ? "bg-slate-200 text-slate-950 font-bold"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
                  }`}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search transactions, students..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 shadow-xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3.5">Transaction ID</th>
                    <th className="px-4 py-3.5">Type</th>
                    <th className="px-4 py-3.5">Counterparty / Student</th>
                    <th className="px-4 py-3.5">Reason / Description</th>
                    <th className="px-4 py-3.5 text-right">Amount</th>
                    <th className="px-4 py-3.5">Timestamp</th>
                    <th className="px-4 py-3.5 text-center">Session</th>
                    <th className="px-4 py-3.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                        <Coins className="mx-auto h-8 w-8 text-slate-600 mb-2 opacity-60" />
                        No credit transactions found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isEarn =
                        tx.type === "TEACHING_REWARD" ||
                        tx.type === "BONUS" ||
                        tx.type === "REFUND" ||
                        (tx.to_student_id === profile?.id && tx.type === "SESSION_TRANSFER");

                      return (
                        <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                          {/* ID with Copy */}
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <span>{tx.id.substring(0, 8)}...</span>
                              <button
                                onClick={() => copyToClipboard(tx.id)}
                                className="text-slate-500 hover:text-slate-300"
                                title="Copy Full ID"
                              >
                                {copiedId === tx.id ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold ${getTxTypeBadge(
                                tx.type
                              )}`}
                            >
                              {tx.type}
                            </span>
                          </td>

                          {/* Counterparty / Student */}
                          <td className="px-4 py-3 font-medium text-slate-200">
                            {tx.student_name || tx.student || tx.to_student_name || "Campus System"}
                          </td>

                          {/* Reason */}
                          <td className="px-4 py-3 text-slate-300 max-w-xs truncate" title={tx.reason || tx.description || ""}>
                            {tx.reason || tx.description || "N/A"}
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            <span className={isEarn ? "text-emerald-400" : "text-rose-400"}>
                              {isEarn ? "+" : "-"}
                              {tx.amount}
                            </span>
                          </td>

                          {/* Timestamp */}
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                            {new Date(tx.timestamp || tx.created_at || "").toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          {/* Related Session */}
                          <td className="px-4 py-3 text-center">
                            {tx.session_id ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                {tx.session_id.substring(0, 6)}...
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Action Receipt */}
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setShowReceiptModal(tx)}
                              className="text-indigo-400 hover:text-indigo-300 font-medium hover:underline text-[11px]"
                            >
                              View Receipt
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TEACHING FLOW (EARN CREDITS)                                       */}
      {/* ========================================================================= */}
      {activeTab === "teaching" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-indigo-400" /> Teaching Sessions Dashboard
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage lesson requests from peers, conduct sessions, and collect verified teaching rewards.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Total Teaching Sessions:</span>
              <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg text-xs">
                {teachingSessions.length}
              </span>
            </div>
          </div>

          {/* Section: Incoming Requests (REQUESTED) */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Incoming Learner Requests (Awaiting Your Acceptance)
            </h3>

            {teachingSessions.filter((s) => s.status === "REQUESTED").length === 0 ? (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 text-center text-slate-500 text-xs">
                No pending teaching requests at this moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teachingSessions
                  .filter((s) => s.status === "REQUESTED")
                  .map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-amber-500/30 bg-slate-900/80 p-5 shadow-lg space-y-4 hover:border-amber-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-block rounded-md bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-400 mb-1">
                            REQUESTED
                          </span>
                          <h4 className="text-base font-bold text-white">{session.skill_name || "Skill Session"}</h4>
                          <p className="text-xs text-slate-400">Learner: <strong className="text-slate-200">{session.learner_name}</strong></p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-amber-400">+{session.credit_amount}</span>
                          <span className="text-[10px] uppercase block text-slate-400 font-semibold">Credits</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Proposed Date:</span>
                          <span className="text-slate-200 font-medium">
                            {new Date(session.scheduled_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Duration:</span>
                          <span className="text-slate-200 font-medium">{session.duration_minutes} Mins</span>
                        </div>
                      </div>

                      {session.notes && (
                        <p className="text-xs text-slate-300 italic bg-slate-800/40 p-2.5 rounded-lg border border-slate-800">
                          "{session.notes}"
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setShowAcceptModal(session);
                            setAcceptNotes(session.notes || "");
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-all"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Accept Request
                        </button>
                        <button
                          onClick={() => setShowCancelModal(session)}
                          className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Section: Accepted / Scheduled Teaching Sessions */}
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Confirmed / Upcoming Teaching Sessions
            </h3>

            {teachingSessions.filter((s) => s.status === "ACCEPTED" || s.status === "SCHEDULED").length === 0 ? (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 text-center text-slate-500 text-xs">
                No active confirmed teaching sessions.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teachingSessions
                  .filter((s) => s.status === "ACCEPTED" || s.status === "SCHEDULED")
                  .map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-indigo-500/30 bg-slate-900/80 p-5 shadow-lg space-y-4 hover:border-indigo-500/50 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-block rounded-md bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-bold text-indigo-400 mb-1">
                            ACCEPTED & READY
                          </span>
                          <h4 className="text-base font-bold text-white">{session.skill_name || "Skill Lesson"}</h4>
                          <p className="text-xs text-slate-400">Learner: <strong className="text-slate-200">{session.learner_name}</strong></p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-emerald-400">+{session.credit_amount}</span>
                          <span className="text-[10px] uppercase block text-slate-400 font-semibold">Reward</span>
                        </div>
                      </div>

                      {session.meeting_link && (
                        <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs">
                          <div className="flex items-center gap-2 truncate text-slate-300">
                            <Video className="h-4 w-4 text-cyan-400 shrink-0" />
                            <span className="truncate">{session.meeting_link}</span>
                          </div>
                          <a
                            href={session.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 shrink-0"
                          >
                            Join <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                        {/* Complete Button Triggering Anti-Abuse Verification Modal */}
                        <button
                          onClick={() => {
                            setShowCompleteModal(session);
                            setCompleteDuration(session.duration_minutes);
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 transition-all"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verify & Complete Session
                        </button>
                        <button
                          onClick={() => setShowCancelModal(session)}
                          className="rounded-xl border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Section: Completed Teaching Sessions */}
          <div className="space-y-3 pt-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Completed Teaching History
            </h3>

            {teachingSessions.filter((s) => s.status === "COMPLETED").length === 0 ? (
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-6 text-center text-slate-500 text-xs">
                No completed teaching sessions yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teachingSessions
                  .filter((s) => s.status === "COMPLETED")
                  .map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-block rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 mb-1">
                            COMPLETED
                          </span>
                          <h4 className="text-sm font-bold text-white">{session.skill_name}</h4>
                          <p className="text-xs text-slate-400">Taught to: {session.learner_name}</p>
                        </div>
                        <span className="text-sm font-black text-emerald-400">+{session.credit_amount} Credits</span>
                      </div>

                      {session.verification_notes && (
                        <p className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
                          <strong className="text-slate-300">Verification:</strong> {session.verification_notes}
                        </p>
                      )}

                      {session.learning_log && (
                        <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800/60 space-y-1 text-xs">
                          <div className="flex items-center gap-1 text-amber-400">
                            {Array.from({ length: session.learning_log.rating || 5 }).map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 fill-current" />
                            ))}
                            <span className="text-[11px] text-slate-400 ml-1">Learner Review</span>
                          </div>
                          {session.learning_log.feedback && (
                            <p className="text-slate-300 italic text-[11px]">"{session.learning_log.feedback}"</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LEARNING FLOW (SPEND CREDITS)                                      */}
      {/* ========================================================================= */}
      {activeTab === "learning" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-cyan-400" /> My Learning Sessions
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Request 1-on-1 peer lessons, practice new skills, and review lessons to build campus intelligence.
              </p>
            </div>
            <button
              onClick={() => setShowBookModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg hover:from-cyan-500 hover:to-indigo-500 transition-all"
            >
              <PlusCircle className="h-4 w-4" /> Request New Lesson
            </button>
          </div>

          {learningSessions.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center space-y-3">
              <BookOpen className="mx-auto h-10 w-10 text-slate-600 opacity-60" />
              <h3 className="text-base font-bold text-slate-300">No Learning Sessions Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ready to level up your skillset? Find peer mentors across campus and book a lesson with your Skill Credits.
              </p>
              <button
                onClick={() => setShowBookModal(true)}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-all"
              >
                Browse Skills & Book
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {learningSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg space-y-4 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`inline-block rounded-md border px-2.5 py-0.5 text-[10px] font-bold mb-1 ${getStatusBadge(
                          session.status
                        )}`}
                      >
                        {session.status}
                      </span>
                      <h4 className="text-base font-bold text-white">{session.skill_name}</h4>
                      <p className="text-xs text-slate-400">Teacher: <strong className="text-slate-200">{session.teacher_name}</strong></p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-rose-400">-{session.credit_amount}</span>
                      <span className="text-[10px] uppercase block text-slate-500 font-semibold">Cost</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Scheduled For:</span>
                      <span className="text-slate-200 font-medium">
                        {new Date(session.scheduled_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Duration:</span>
                      <span className="text-slate-200 font-medium">{session.duration_minutes} Mins</span>
                    </div>
                  </div>

                  {session.meeting_link && (
                    <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs">
                      <div className="flex items-center gap-2 truncate text-slate-300">
                        <Video className="h-4 w-4 text-cyan-400 shrink-0" />
                        <span className="truncate">{session.meeting_link}</span>
                      </div>
                      <a
                        href={session.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 shrink-0"
                      >
                        Join <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    {session.status === "COMPLETED" ? (
                      session.learning_log ? (
                        <div className="flex-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2 text-center text-xs text-emerald-400">
                          Feedback & Rating Logged ★ {session.learning_log.rating}/5
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowFeedbackModal(session)}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-all"
                        >
                          <Star className="h-3.5 w-3.5" /> Submit Lesson Feedback
                        </button>
                      )
                    ) : session.status === "REQUESTED" ? (
                      <button
                        onClick={() => setShowCancelModal(session)}
                        className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-all"
                      >
                        Cancel Request
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Confirmed. Join meeting at scheduled time.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LIVE SKILL DEMAND INDEX                                            */}
      {/* ========================================================================= */}
      {activeTab === "demand" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-slate-900 to-slate-950 p-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-400">
                  <Flame className="h-3.5 w-3.5" /> Campus Skill Intelligence
                </span>
                <h3 className="text-xl font-black text-white">Campus Skill Demand Index</h3>
                <p className="text-xs text-slate-400 max-w-xl">
                  Calculated dynamically via <code className="bg-slate-800 px-1.5 py-0.5 rounded text-orange-300 font-mono">Demand = Learners Requesting Skill / Available Teachers</code>.
                  High demand skills trigger higher credit bounties and recognition for peer teachers.
                </p>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setDemandCategoryFilter("ALL")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    demandCategoryFilter === "ALL"
                      ? "bg-orange-500 text-white font-bold"
                      : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  All ({demandIndex.length})
                </button>
                <button
                  onClick={() => setDemandCategoryFilter("HIGH")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    demandCategoryFilter === "HIGH"
                      ? "bg-orange-500 text-white font-bold"
                      : "bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  High Demand Only
                </button>
              </div>
            </div>
          </div>

          {/* Demand Leaderboard Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3.5">Skill Name</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5 text-center">Learners Requesting</th>
                    <th className="px-4 py-3.5 text-center">Available Teachers</th>
                    <th className="px-4 py-3.5 text-center">Demand Ratio</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Incentive</th>
                    <th className="px-4 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDemand.map((item) => (
                    <tr key={item.skill_id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-100 flex items-center gap-2">
                        {item.is_high_demand && <Flame className="h-4 w-4 text-orange-400 shrink-0" />}
                        {item.skill_name}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">{item.category}</td>
                      <td className="px-4 py-3.5 text-center font-mono font-semibold text-slate-200">
                        {item.learners_count}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-semibold text-slate-200">
                        {item.teachers_count}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono font-bold">
                        <span
                          className={
                            item.demand_index >= 1.5
                              ? "text-orange-400"
                              : item.demand_index >= 0.8
                              ? "text-indigo-400"
                              : "text-slate-400"
                          }
                        >
                          {item.demand_index.toFixed(2)}x
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                            item.status === "HIGH_DEMAND"
                              ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                              : item.status === "CRITICAL_SHORTAGE"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse"
                              : item.status === "BALANCED"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                              : "bg-slate-500/10 text-slate-400 border-slate-700"
                          }`}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono font-bold text-emerald-400">
                        {item.recommended_reward_multiplier > 1.0
                          ? `${item.recommended_reward_multiplier}x Reward`
                          : "1.0x Standard"}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => {
                            setActiveTab("learning");
                            setBookSkillId(item.skill_id);
                            setShowBookModal(true);
                          }}
                          className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          Learn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: TEST SANDBOX (EDGE CASES & DEMONSTRATIONS)                         */}
      {/* ========================================================================= */}
      {activeTab === "sandbox" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 via-slate-900 to-slate-950 p-6 shadow-xl">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-400">
                <Sparkles className="h-3.5 w-3.5" /> Credit Economy Edge Case Sandbox
              </span>
              <h3 className="text-xl font-black text-white">Interactive Edge Case & Policy Testing</h3>
              <p className="text-xs text-slate-400 max-w-2xl">
                Test negative balance restrictions, trigger administrative adjustments, or award campus engagement bonuses.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Box 1: Bonus Award */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                  <Award className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Award Engagement Bonus</h4>
                  <p className="text-xs text-slate-400">Injects verified BONUS transaction into ledger.</p>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Tests the <code className="text-purple-300 font-mono">BONUS</code> transaction type with audit description.
              </p>
              <button
                onClick={handleClaimBonus}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-500 transition-all shadow-lg shadow-purple-500/20"
              >
                <Sparkles className="h-4 w-4" /> Claim +25 Milestone Bonus
              </button>
            </div>

            {/* Box 2: Admin Adjustment & Negative Balance Check */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Admin Balance Adjustment</h4>
                  <p className="text-xs text-slate-400">Test positive or negative adjustments.</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Amount (enter negative value to test anti-abuse balance check):
                  </label>
                  <input
                    type="number"
                    value={adminAmount}
                    onChange={(e) => setAdminAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Reason:</label>
                  <input
                    type="text"
                    value={adminReason}
                    onChange={(e) => setAdminReason(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleAdminAdjust}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
                >
                  <ShieldCheck className="h-4 w-4" /> Apply Admin Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BOOK LEARNING SESSION                                            */}
      {/* ========================================================================= */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-400" /> Book a Learning Session
              </h3>
              <button
                onClick={() => setShowBookModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookSession} className="space-y-4 text-xs">
              {/* Skill Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Skill to Learn *</label>
                <select
                  required
                  value={bookSkillId}
                  onChange={(e) => setBookSkillId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose from Campus Skills --</option>
                  {skillsList.map((sk) => (
                    <option key={sk.id} value={sk.id}>
                      {sk.name} ({sk.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Teacher Selector */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Choose Peer Teacher *</label>
                <select
                  required
                  value={bookTeacherId}
                  onChange={(e) => setBookTeacherId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Select Available Peer Mentor --</option>
                  {seedProfiles
                    .filter((p) => p.id !== profile?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.department} - {p.year_of_study})
                      </option>
                    ))}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={bookDateTime}
                    onChange={(e) => setBookDateTime(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duration (Minutes)</label>
                  <select
                    value={bookDuration}
                    onChange={(e) => setBookDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value={30}>30 Minutes</option>
                    <option value={45}>45 Minutes</option>
                    <option value={60}>60 Minutes</option>
                    <option value={90}>90 Minutes</option>
                  </select>
                </div>
              </div>

              {/* Credit Cost Preview & Balance Check */}
              <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-3.5 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-300">Session Credit Cost:</span>
                  <span className="text-amber-400 font-mono">{bookCost} Credits</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Your Current Balance:</span>
                  <span className="text-slate-200">{profile?.credit_balance ?? 0} Credits</span>
                </div>
                {profile && profile.credit_balance < bookCost && (
                  <p className="text-rose-400 font-semibold text-[11px] pt-1">
                    ⚠️ Insufficient credits! Earn credits by teaching before booking.
                  </p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Learning Goals / Topic Notes</label>
                <textarea
                  rows={2}
                  placeholder="What specific concepts would you like to cover?"
                  value={bookNotes}
                  onChange={(e) => setBookNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBookModal(false)}
                  className="rounded-xl border border-slate-800 px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (profile ? profile.credit_balance < bookCost : false)}
                  className="rounded-xl bg-indigo-600 px-5 py-2 font-bold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ACCEPT SESSION (TEACHER FLOW)                                    */}
      {/* ========================================================================= */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-indigo-400" /> Accept Teaching Session
            </h3>
            <p className="text-xs text-slate-400">
              Provide a meeting link so <strong className="text-slate-200">{showAcceptModal.learner_name}</strong> can join the lesson.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Meeting Link (Jitsi, Zoom, Meet) *</label>
                <input
                  type="url"
                  required
                  value={acceptLink}
                  onChange={(e) => setAcceptLink(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Preparation Note for Learner</label>
                <textarea
                  rows={2}
                  value={acceptNotes}
                  onChange={(e) => setAcceptNotes(e.target.value)}
                  placeholder="e.g. Please install prerequisites or bring code questions"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowAcceptModal(null)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAcceptSession}
                disabled={submitting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
              >
                Confirm & Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VERIFY & COMPLETE SESSION (ANTI-ABUSE VALIDATED)                 */}
      {/* ========================================================================= */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Anti-Abuse Integrity Verification
              </span>
              <h3 className="text-lg font-bold text-white">Complete Lesson & Award Credits</h3>
              <p className="text-xs text-slate-400">
                To prevent automated or fake claims, credits are awarded into the immutable ledger only upon submission of verified completion notes.
              </p>
            </div>

            <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Learner:</span>
                <span className="text-white font-medium">{showCompleteModal.learner_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Skill:</span>
                <span className="text-white font-medium">{showCompleteModal.skill_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Credits to Award:</span>
                <span className="text-emerald-400 font-bold">+{showCompleteModal.credit_amount} Credits</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Verification Notes (Summary of covered concepts) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Conducted live code walk-through and answered questions on async/await."
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Actual Duration (Minutes)</label>
                <input
                  type="number"
                  min={15}
                  max={240}
                  value={completeDuration}
                  onChange={(e) => setCompleteDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCompleteModal(null)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Back
              </button>
              <button
                onClick={handleCompleteSession}
                disabled={submitting || !completeNotes.trim()}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                {submitting ? "Verifying..." : "Verify & Transfer Credits"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: LEARNER FEEDBACK & RATING                                        */}
      {/* ========================================================================= */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-400" /> Lesson Reflection & Review
            </h3>
            <p className="text-xs text-slate-400">
              Rate your peer teacher <strong className="text-slate-200">{showFeedbackModal.teacher_name}</strong> for teaching{" "}
              <strong className="text-slate-200">{showFeedbackModal.skill_name}</strong>.
            </p>

            {/* Star Picker */}
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFeedbackRating(s)}
                  className="p-1 text-slate-600 hover:text-amber-400 transition-colors"
                >
                  <Star
                    className={`h-7 w-7 ${
                      s <= feedbackRating ? "fill-amber-400 text-amber-400" : "text-slate-600"
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Key Concepts Learned</label>
                <textarea
                  rows={2}
                  value={feedbackSummary}
                  onChange={(e) => setFeedbackSummary(e.target.value)}
                  placeholder="What was the most helpful takeaway?"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Feedback for Teacher</label>
                <textarea
                  rows={2}
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Leave words of encouragement or feedback..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowFeedbackModal(null)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Skip
              </button>
              <button
                onClick={handleSubmitFeedback}
                disabled={submitting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CANCEL SESSION                                                   */}
      {/* ========================================================================= */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
              <XCircle className="h-5 w-5" /> Cancel Session
            </h3>
            <p className="text-xs text-slate-400">
              Please provide a cancellation reason. The session status will be updated to CANCELLED.
            </p>

            <textarea
              rows={3}
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule conflict, academic exam, etc."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-slate-200 focus:border-rose-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowCancelModal(null)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Keep Session
              </button>
              <button
                onClick={handleCancelSession}
                disabled={submitting || !cancelReason.trim()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: DIRECT CREDIT TRANSFER                                           */}
      {/* ========================================================================= */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Send className="h-5 w-5 text-amber-400" /> Transfer Skill Credits
            </h3>
            <p className="text-xs text-slate-400">
              Direct peer transfer with negative-balance protection.
            </p>

            <form onSubmit={handleTransfer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Recipient Student *</label>
                <select
                  required
                  value={transferTargetId}
                  onChange={(e) => setTransferTargetId(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose Recipient --</option>
                  {seedProfiles
                    .filter((p) => p.id !== profile?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.department})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Amount to Transfer *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Reason / Description</label>
                <input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="e.g. Peer review consultation"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="rounded-xl border border-slate-800 px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-500"
                >
                  Send Credits
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: TRANSACTION RECEIPT / AUDIT DETAILS                              */}
      {/* ========================================================================= */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-400" /> Transaction Receipt
              </h3>
              <button
                onClick={() => setShowReceiptModal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono text-slate-200 select-all">{showReceiptModal.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Type:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTxTypeBadge(showReceiptModal.type)}`}>
                  {showReceiptModal.type}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Primary Student:</span>
                <span className="text-slate-200 font-medium">{showReceiptModal.student_name || "Campus System"}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Amount:</span>
                <span className="font-mono font-bold text-base text-amber-400">{showReceiptModal.amount} Credits</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Reason / Description:</span>
                <span className="text-slate-200 text-right max-w-xs">{showReceiptModal.reason || showReceiptModal.description}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/60 pb-2">
                <span className="text-slate-400">Timestamp:</span>
                <span className="text-slate-200">{new Date(showReceiptModal.timestamp || showReceiptModal.created_at || "").toLocaleString()}</span>
              </div>
              {showReceiptModal.session_id && (
                <div className="flex justify-between border-b border-slate-800/60 pb-2">
                  <span className="text-slate-400">Related Session ID:</span>
                  <span className="font-mono text-indigo-400">{showReceiptModal.session_id}</span>
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowReceiptModal(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
