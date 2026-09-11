"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  MatchRecommendation,
  DayOfWeek,
  ProficiencyLevel,
} from "@/lib/api";
import {
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Repeat2,
  Calendar,
  Clock,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Send,
  BookOpen,
  ArrowRightLeft,
  X,
} from "lucide-react";

export default function LearnPage() {
  const { profile } = useAuth();

  const [recommendations, setRecommendations] = useState<MatchRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [skillFilter, setSkillFilter] = useState<string>("");
  const [proficiencyFilter, setProficiencyFilter] = useState<string>("");
  const [dayFilter, setDayFilter] = useState<string>("");
  const [projectInterestFilter, setProjectInterestFilter] = useState<string>("");
  const [onlyReciprocal, setOnlyReciprocal] = useState<boolean>(false);

  // Accordion state for "Why you matched"
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Session Request Modal state
  const [selectedCandidate, setSelectedCandidate] = useState<MatchRecommendation | null>(null);
  const [sessionSkill, setSessionSkill] = useState<string>("");
  const [sessionNotes, setSessionNotes] = useState<string>("");
  const [sessionSubmitted, setSessionSubmitted] = useState<boolean>(false);

  const fetchMatches = async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.matches.listRecommendations({
        student_id: profile.id,
        skill: skillFilter || undefined,
        proficiency: proficiencyFilter || undefined,
        availability_day: dayFilter || undefined,
        project_interest: projectInterestFilter || undefined,
        min_score: 5,
        limit: 30,
      });
      setRecommendations(data);
    } catch (err: any) {
      console.error("Error fetching recommendations:", err);
      setError(err.message || "Failed to load peer recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchMatches();
    }
  }, [profile?.id, proficiencyFilter, dayFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMatches();
  };

  const handleResetFilters = () => {
    setSkillFilter("");
    setProficiencyFilter("");
    setDayFilter("");
    setProjectInterestFilter("");
    setOnlyReciprocal(false);
    if (profile?.id) {
      api.matches
        .listRecommendations({ student_id: profile.id, min_score: 5, limit: 30 })
        .then(setRecommendations)
        .catch(console.error);
    }
  };

  const filteredRecommendations = useMemo(() => {
    if (!onlyReciprocal) return recommendations;
    return recommendations.filter((r) => r.is_reciprocal);
  }, [recommendations, onlyReciprocal]);

  const reciprocalCount = useMemo(
    () => recommendations.filter((r) => r.is_reciprocal).length,
    [recommendations]
  );

  const avgScore = useMemo(() => {
    if (!recommendations.length) return 0;
    const sum = recommendations.reduce((acc, r) => acc + r.match_score, 0);
    return Math.round(sum / recommendations.length);
  }, [recommendations]);

  const toggleExpand = (id: string) => {
    setExpandedCardId(expandedCardId === id ? null : id);
  };

  const handleOpenSessionModal = (cand: MatchRecommendation) => {
    setSelectedCandidate(cand);
    setSessionSkill(cand.skills_offered[0] || cand.learning_opportunity.you_learn[0] || "");
    setSessionNotes("");
    setSessionSubmitted(false);
  };

  const handleSendSessionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setSessionSubmitted(true);
    setTimeout(() => {
      setSelectedCandidate(null);
      setSessionSubmitted(false);
    }, 1800);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/50 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Stage 4: Intelligent Hybrid Skill Matching
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Campus Peer Matcher
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Connect with campus peers using multi-factor hybrid intelligence: semantic similarity,
              skill hierarchy, proficiency gaps, reciprocity, schedule overlap, and shared project goals.
            </p>
          </div>

          {/* Persona Card */}
          {profile && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-lg">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-base font-black text-white uppercase">
                {profile.full_name.charAt(0)}
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-200">{profile.full_name}</p>
                <p className="text-slate-400">{profile.department}</p>
                <p className="text-[11px] text-indigo-400 font-mono mt-0.5">
                  Matching as Active Student
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats Bar */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-slate-800/80 text-xs">
          <div>
            <span className="text-slate-400">Total Matches</span>
            <p className="text-lg font-bold text-white mt-0.5">{recommendations.length}</p>
          </div>
          <div>
            <span className="text-slate-400">Reciprocal Exchanges</span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5">{reciprocalCount}</p>
          </div>
          <div>
            <span className="text-slate-400">Average Match Score</span>
            <p className="text-lg font-bold text-indigo-400 mt-0.5">{avgScore}%</p>
          </div>
          <div>
            <span className="text-slate-400">Skill Credit Economy</span>
            <p className="text-lg font-bold text-amber-400 mt-0.5">
              {profile?.credit_balance ?? 100} Credits
            </p>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Filter className="h-4 w-4 text-indigo-400" />
            <span>Filter Recommendations</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={onlyReciprocal}
                onChange={(e) => setOnlyReciprocal(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="flex items-center gap-1.5">
                <ArrowRightLeft className="h-3.5 w-3.5 text-emerald-400" />
                Only Reciprocal (2-Way) Trades
              </span>
            </label>

            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-400 hover:text-indigo-400 transition-colors underline underline-offset-4"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Inputs */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Skill Filter */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              placeholder="Search skill (e.g. React, Python)..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Proficiency Filter */}
          <div>
            <select
              value={proficiencyFilter}
              onChange={(e) => setProficiencyFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Teacher Proficiency (Any)</option>
              <option value="INTERMEDIATE">Intermediate or higher</option>
              <option value="ADVANCED">Advanced or higher</option>
              <option value="EXPERT">Expert only</option>
            </select>
          </div>

          {/* Availability Day Filter */}
          <div>
            <select
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Available Day (Any)</option>
              <option value="MONDAY">Monday</option>
              <option value="TUESDAY">Tuesday</option>
              <option value="WEDNESDAY">Wednesday</option>
              <option value="THURSDAY">Thursday</option>
              <option value="FRIDAY">Friday</option>
              <option value="SATURDAY">Saturday</option>
              <option value="SUNDAY">Sunday</option>
            </select>
          </div>

          {/* Project Interest Filter & Submit */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={projectInterestFilter}
              onChange={(e) => setProjectInterestFilter(e.target.value)}
              placeholder="Project interest keyword..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 px-3 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/20"
            >
              Filter
            </button>
          </div>
        </form>

        {/* Quick Skill Tags */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-slate-400">
          <span className="font-semibold text-slate-500 mr-1">Popular:</span>
          {["Deep Learning", "React", "Python", "SQL", "Cloud Computing", "UI/UX Design", "FastAPI"].map(
            (tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSkillFilter(tag);
                  if (profile?.id) {
                    api.matches
                      .listRecommendations({ student_id: profile.id, skill: tag, min_score: 5 })
                      .then(setRecommendations)
                      .catch(console.error);
                  }
                }}
                className={`rounded-lg px-2.5 py-1 border transition-all ${
                  skillFilter === tag
                    ? "border-indigo-500 bg-indigo-600/20 text-indigo-300 font-semibold"
                    : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {tag}
              </button>
            )
          )}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="text-sm font-medium">Computing hybrid match intelligence across campus...</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredRecommendations.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-200">No Matching Peers Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Try loosening your filters or adding more learning goals in your profile to discover complementary peers.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-all"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Recommendations Cards Grid */}
      {!loading && !error && filteredRecommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRecommendations.map((cand) => {
            const isExpanded = expandedCardId === cand.candidate_id;

            // Determine badge style based on match score
            let scoreBg = "from-emerald-600 to-teal-500 shadow-emerald-500/20";
            let scoreText = "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
            if (cand.match_score < 70) {
              scoreBg = "from-amber-600 to-orange-500 shadow-amber-500/20";
              scoreText = "text-amber-400 border-amber-500/30 bg-amber-500/10";
            } else if (cand.match_score < 85) {
              scoreBg = "from-indigo-600 to-blue-500 shadow-indigo-500/20";
              scoreText = "text-indigo-400 border-indigo-500/30 bg-indigo-500/10";
            }

            return (
              <div
                key={cand.candidate_id}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-md transition-all hover:border-slate-700 hover:shadow-xl hover:shadow-indigo-950/20"
              >
                <div>
                  {/* Top Row: Score + Reciprocity Badge */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr ${scoreBg} shadow-lg font-black text-white text-base`}
                      >
                        {cand.match_score}%
                      </div>
                      <div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${scoreText}`}>
                          {cand.match_score >= 85 ? "Top Match" : cand.match_score >= 70 ? "Strong Match" : "Good Fit"}
                        </span>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">Overall Compatibility</p>
                      </div>
                    </div>

                    {cand.is_reciprocal && (
                      <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 shadow-sm shadow-emerald-500/10">
                        <Repeat2 className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                        Reciprocal Trade
                      </span>
                    )}
                  </div>

                  {/* Candidate Info */}
                  <div className="flex items-start gap-3 pb-4 border-b border-slate-800/80">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-sm font-bold text-slate-200 uppercase">
                      {cand.candidate_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-white truncate group-hover:text-indigo-300 transition-colors">
                        {cand.candidate_name}
                      </h3>
                      <p className="text-xs text-slate-400 truncate">
                        {cand.candidate_department} • {cand.candidate_year}
                      </p>
                      {cand.candidate_bio && (
                        <p className="text-xs text-slate-300/80 mt-1 line-clamp-2 italic">
                          "{cand.candidate_bio}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Learning Exchange Opportunity */}
                  <div className="mt-4 space-y-3">
                    {/* What you can learn */}
                    <div>
                      <span className="text-[11px] uppercase font-mono tracking-wider text-indigo-400 font-bold flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        You Can Learn:
                      </span>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {cand.learning_opportunity.you_learn.length > 0 ? (
                          cand.learning_opportunity.you_learn.map((item, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-200"
                            >
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">
                            Offers: {cand.skills_offered.slice(0, 3).join(", ") || "General Mentorship"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* What they learn from you (if reciprocal) */}
                    {cand.is_reciprocal && cand.learning_opportunity.they_learn.length > 0 && (
                      <div>
                        <span className="text-[11px] uppercase font-mono tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                          <ArrowRightLeft className="h-3 w-3" />
                          They Want To Learn:
                        </span>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {cand.learning_opportunity.they_learn.map((item, idx) => (
                            <span
                              key={idx}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-200"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Availability Overlap */}
                  <div className="mt-4 pt-3 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-semibold text-slate-300">Shared Availability:</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {cand.common_availability.length > 0 ? (
                        cand.common_availability.map((slot, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300"
                          >
                            <Calendar className="h-3 w-3 text-indigo-400" />
                            {slot.day} {slot.start_time}-{slot.end_time}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-amber-400/90 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          No direct schedule overlap this week (Flexible)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expandable "Why you matched" Accordion */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => toggleExpand(cand.candidate_id)}
                      className="flex w-full items-center justify-between text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors py-1"
                    >
                      <span>Why You Matched (Factor Breakdown & AI Reasons)</span>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs">
                        {/* Granular Factor Progress Bars */}
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                              <span>Skill Compatibility</span>
                              <span className="font-bold text-slate-200">
                                {cand.matching_factors.skill_compatibility}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${cand.matching_factors.skill_compatibility}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                              <span>Reciprocity (2-Way Balance)</span>
                              <span className="font-bold text-slate-200">
                                {cand.matching_factors.reciprocity}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${cand.matching_factors.reciprocity}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                              <span>Semantic Similarity</span>
                              <span className="font-bold text-slate-200">
                                {cand.matching_factors.semantic_similarity}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-cyan-500 rounded-full"
                                style={{ width: `${cand.matching_factors.semantic_similarity}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                              <span>Experience Compatibility</span>
                              <span className="font-bold text-slate-200">
                                {cand.matching_factors.experience_compatibility}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full"
                                style={{ width: `${cand.matching_factors.experience_compatibility}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                              <span>Shared Interests</span>
                              <span className="font-bold text-slate-200">
                                {cand.matching_factors.interest_compatibility}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${cand.matching_factors.interest_compatibility}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                              <span>Schedule Overlap</span>
                              <span className="font-bold text-slate-200">
                                {cand.matching_factors.availability_compatibility}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-teal-500 rounded-full"
                                style={{ width: `${cand.matching_factors.availability_compatibility}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Bullet Explanations */}
                        <div className="pt-2 border-t border-slate-800 space-y-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Transparent Match Reasons:
                          </span>
                          {cand.explanation.map((reason, idx) => (
                            <p
                              key={idx}
                              className={`flex items-start gap-1.5 text-xs ${
                                reason.startsWith("✓")
                                  ? "text-slate-200"
                                  : reason.startsWith("⚠")
                                  ? "text-amber-400"
                                  : "text-slate-400"
                              }`}
                            >
                              <span>{reason}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Button */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Offers <span className="text-slate-200 font-semibold">{cand.skills_offered.length}</span> skill{cand.skills_offered.length === 1 ? "" : "s"}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenSessionModal(cand)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-indigo-400 transition-all"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Request Peer Session
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session Request Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Schedule Peer Session</h3>
                  <p className="text-xs text-slate-400">with {selectedCandidate.candidate_name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {sessionSubmitted ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-2">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400 animate-bounce" />
                <h4 className="text-sm font-bold text-emerald-300">Session Request Sent!</h4>
                <p className="text-xs text-slate-300">
                  {selectedCandidate.candidate_name} has received your invitation. 20 Skill Credits will be escrowed.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendSessionRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Skill Topic
                  </label>
                  <input
                    type="text"
                    value={sessionSkill}
                    onChange={(e) => setSessionSkill(e.target.value)}
                    required
                    placeholder="e.g. Deep Learning, React architecture..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preferred Time / Availability
                  </label>
                  <p className="text-[11px] text-slate-400 mb-2">
                    Shared slot:{" "}
                    {selectedCandidate.common_availability[0]
                      ? `${selectedCandidate.common_availability[0].day} ${selectedCandidate.common_availability[0].start_time} - ${selectedCandidate.common_availability[0].end_time}`
                      : "Suggest a flexible evening window"}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Topic Notes & Objectives
                  </label>
                  <textarea
                    rows={3}
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="What specific problem or concepts do you want to cover?"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-300">Skill Credit Escrow:</span>
                  <span className="font-bold text-amber-400">20 Credits</span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(null)}
                    className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
