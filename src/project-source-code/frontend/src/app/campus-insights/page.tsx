"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  GraduationCap,
  BookOpen,
  AlertTriangle,
  Flame,
  Clock,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Info,
  ShieldCheck,
  ChevronRight,
  Layers,
  Network,
  PieChart,
  ArrowUpDown,
  CheckCircle2,
  ExternalLink,
  Target,
  Award,
  Zap,
} from "lucide-react";
import {
  api,
  CampusOverviewMetrics,
  SkillDemandSupplyItem,
  CategoryDistributionItem,
  SkillNetworkNode,
  SkillNetworkEdge,
  SkillNetworkResponse,
  NarrativeInsightItem,
  CampusFilterOptions,
} from "@/lib/api";

type RolePerspective = "STUDENT" | "FACULTY" | "ADMINISTRATOR";
type VisualTab = "DEMAND_SUPPLY" | "GAP_ANALYSIS" | "CATEGORIES" | "NETWORK" | "ALL_SKILLS";

export default function CampusInsightsPage() {
  // Role lens state
  const [role, setRole] = useState<RolePerspective>("STUDENT");

  // Visual sub-tab
  const [activeTab, setActiveTab] = useState<VisualTab>("DEMAND_SUPPLY");

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all_time");

  // Search & sorting state for the skill table
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"gap" | "demand" | "supply" | "learners" | "teachers">("gap");

  // Selected skill modal state
  const [selectedSkill, setSelectedSkill] = useState<SkillDemandSupplyItem | null>(null);

  // Network node hover state
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<CampusOverviewMetrics | null>(null);
  const [skillsList, setSkillsList] = useState<SkillDemandSupplyItem[]>([]);
  const [shortages, setShortages] = useState<SkillDemandSupplyItem[]>([]);
  const [emergingSkills, setEmergingSkills] = useState<SkillDemandSupplyItem[]>([]);
  const [categories, setCategories] = useState<CategoryDistributionItem[]>([]);
  const [network, setNetwork] = useState<SkillNetworkResponse | null>(null);
  const [narratives, setNarratives] = useState<NarrativeInsightItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<CampusFilterOptions>({
    categories: [],
    departments: [],
    years_of_study: [],
    time_periods: ["all_time", "past_30_days", "past_semester", "past_year"],
  });

  // Fetch filter options once
  useEffect(() => {
    async function loadFilters() {
      try {
        const opts = await api.campusInsights.getFilters();
        setFilterOptions(opts);
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    }
    loadFilters();
  }, []);

  // Fetch campus intelligence data whenever filters change
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        category: selectedCategory || undefined,
        department: selectedDept || undefined,
        year_of_study: selectedYear || undefined,
        time_period: selectedPeriod !== "all_time" ? selectedPeriod : undefined,
      };

      const [bundle, netRes] = await Promise.all([
        api.campusInsights.getFull(params),
        api.campusInsights.getNetwork({ category: selectedCategory || undefined, limit: 32 }),
      ]);

      setOverview(bundle.overview);
      setShortages(bundle.skill_shortages);
      setEmergingSkills(bundle.emerging_skills);
      setCategories(bundle.category_distribution);
      setNarratives(bundle.narrative_insights);
      setNetwork(netRes);

      // Fetch demand-supply with sort for the table
      const dsList = await api.campusInsights.getDemandSupply({ ...params, sort_by: sortBy, limit: 80 });
      setSkillsList(dsList);
    } catch (err: any) {
      console.error("Failed to load campus intelligence", err);
      setError(err?.message || "Failed to load campus intelligence data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, selectedDept, selectedYear, selectedPeriod, sortBy]);

  // Reset all filters
  const resetFilters = () => {
    setSelectedCategory("");
    setSelectedDept("");
    setSelectedYear("");
    setSelectedPeriod("all_time");
    setSearchQuery("");
  };

  const hasActiveFilters = Boolean(selectedCategory || selectedDept || selectedYear || (selectedPeriod && selectedPeriod !== "all_time"));

  // Filter skills for the table
  const filteredSkills = useMemo(() => {
    if (!searchQuery.trim()) return skillsList;
    const q = searchQuery.toLowerCase();
    return skillsList.filter(
      (s) => s.skill_name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    );
  }, [skillsList, searchQuery]);

  // Filter narrative insights based on current role perspective
  const roleNarratives = useMemo(() => {
    return narratives.filter((n) => n.target_audience === role || n.target_audience === "ALL");
  }, [narratives, role]);

  // Helper colors for status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CRITICAL_SHORTAGE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Critical Shortage
          </span>
        );
      case "HIGH_DEMAND":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Flame className="w-3 h-3 text-amber-400" />
            High Demand
          </span>
        );
      case "OVERSUPPLIED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            High Supply
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Balanced
          </span>
        );
    }
  };

  // Helper color for categories
  const getCategoryColor = (index: number) => {
    const colors = [
      "from-indigo-500 to-indigo-600 border-indigo-400 text-indigo-300",
      "from-emerald-500 to-emerald-600 border-emerald-400 text-emerald-300",
      "from-cyan-500 to-cyan-600 border-cyan-400 text-cyan-300",
      "from-amber-500 to-amber-600 border-amber-400 text-amber-300",
      "from-purple-500 to-purple-600 border-purple-400 text-purple-300",
      "from-pink-500 to-pink-600 border-pink-400 text-pink-300",
      "from-blue-500 to-blue-600 border-blue-400 text-blue-300",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      {/* 1. Header & Strict Anonymization Guarantee */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-800/50">Stage 8</span>
              <span>Campus Skill Intelligence & Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Campus Skill Intelligence
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-medium">
                Live Data
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Real-time aggregated campus analytics revealing skill demand, peer teaching capacity,
              curriculum shortages, and interdisciplinary network clusters.
            </p>
          </div>

          {/* Role Perspective Switcher */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-1 rounded-xl flex items-center shadow-lg">
              <button
                onClick={() => setRole("STUDENT")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  role === "STUDENT"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Student
              </button>
              <button
                onClick={() => setRole("FACULTY")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  role === "FACULTY"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Faculty
              </button>
              <button
                onClick={() => setRole("ADMINISTRATOR")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  role === "ADMINISTRATOR"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrator
              </button>
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Anonymization Guarantee Banner */}
        <div className="bg-slate-900/60 border border-indigo-900/40 rounded-2xl p-3.5 sm:p-4 flex items-start sm:items-center justify-between gap-3 text-xs backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-indigo-300">Strict Campus Privacy Preservation: </span>
              <span className="text-slate-400">
                All analytics are calculated from aggregated, fully anonymized metrics. No student names, emails,
                student IDs, or private details are ever stored or exposed in campus intelligence.
              </span>
            </div>
          </div>
          <div className="hidden lg:flex items-center gap-2 text-slate-400 font-mono text-[11px] bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
            <span>21 Campus Depts</span>
            <span>•</span>
            <span>66 Tracked Skills</span>
          </div>
        </div>

        {/* Role Lens Highlights */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Active Perspective: {role} Mode
              </span>
            </div>
            <p className="text-sm text-slate-300">
              {role === "STUDENT" &&
                "Targeting high-credit teaching opportunities (1.5x rewards) and popular peer skills to accelerate your learning goals."}
              {role === "FACULTY" &&
                "Analyzing curriculum demand gaps, unfulfilled elective topics, and planning targeted departmental workshops."}
              {role === "ADMINISTRATOR" &&
                "Monitoring campus-wide peer teaching capacity vs. learning demand and cross-department skill health."}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
            {role === "STUDENT" && (
              <span className="px-3 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                🔥 1.5x Credit Bonus for Teaching Shortage Skills
              </span>
            )}
            {role === "FACULTY" && (
              <span className="px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                📚 3 Curriculum Recommendations Generated
              </span>
            )}
            {role === "ADMINISTRATOR" && (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                🏛️ Multi-Department Capability Healthy
              </span>
            )}
          </div>
        </div>

        {/* 2. Interactive Filter Bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Filter className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Dimensional Filters</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                Reset All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Skill Category Filter */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Skill Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">All Categories ({filterOptions.categories.length})</option>
                {filterOptions.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Department</label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">All Departments ({filterOptions.departments.length})</option>
                {filterOptions.departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Year of Study Filter */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Year of Study</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">All Academic Years</option>
                {filterOptions.years_of_study.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Period Filter */}
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Time Period</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="all_time">All Time</option>
                <option value="past_30_days">Past 30 Days</option>
                <option value="past_semester">Past Semester (120 Days)</option>
                <option value="past_year">Past Academic Year</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Campus Vital Metrics Cards */}
        {overview && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {/* Total Students */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Students</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-white">{overview.total_students}</div>
              <div className="text-[11px] text-slate-400">Evaluated in sample</div>
            </div>

            {/* Total Skills */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Skills</span>
                <Layers className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-white">{overview.total_skills}</div>
              <div className="text-[11px] text-slate-400">Taxonomy coverage</div>
            </div>

            {/* Learning Demand */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Learning Demand</span>
                <Target className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-white">{overview.total_learning_demand}</div>
              <div className="text-[11px] text-slate-400">Goals & requests</div>
            </div>

            {/* Teaching Capacity */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Teaching Capacity</span>
                <GraduationCap className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white">{overview.total_teaching_capacity}</div>
              <div className="text-[11px] text-slate-400">
                ~{overview.campus_teaching_capacity_hours} hrs/wk capacity
              </div>
            </div>

            {/* Average Demand Index */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Avg Demand Index</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white">{overview.average_demand_index}x</div>
              <div className="text-[11px] text-slate-400">Campus ratio</div>
            </div>

            {/* Critical Shortages */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Skill Shortages</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400">{overview.critical_shortages_count}</div>
              <div className="text-[11px] text-slate-400">
                {overview.high_demand_count} in high demand
              </div>
            </div>
          </div>
        )}

        {/* 4. Concrete Narrative Insights Callouts */}
        {roleNarratives.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Campus Intelligence Callouts & Insights</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roleNarratives.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all shadow-lg"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {item.type.replace("_", " ")}
                      </span>
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-md">
                        {item.target_audience}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{item.headline}</h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/60">
                      "{item.description}"
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{item.metric_label}:</span>
                      <span className="font-semibold text-indigo-300">{item.metric_value}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold shrink-0">Action:</span>
                      <span>{item.action_recommendation}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Visualization Mode Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab("DEMAND_SUPPLY")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "DEMAND_SUPPLY"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Skill Demand & Supply Charts
          </button>
          <button
            onClick={() => setActiveTab("GAP_ANALYSIS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "GAP_ANALYSIS"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Skill Shortages & Gap Score
          </button>
          <button
            onClick={() => setActiveTab("CATEGORIES")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "CATEGORIES"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800"
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            Category Distribution
          </button>
          <button
            onClick={() => setActiveTab("NETWORK")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "NETWORK"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800"
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            Cross-Department Skill Network
          </button>
          <button
            onClick={() => setActiveTab("ALL_SKILLS")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === "ALL_SKILLS"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                : "text-slate-400 hover:text-white bg-slate-900/60 border border-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Detailed Skill Intelligence Matrix
          </button>
        </div>

        {/* 6. Visualization Panels */}
        {activeTab === "DEMAND_SUPPLY" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Demanded Skills Chart */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    Top Requested Skills (Demand Index)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Skills with highest learner-to-teacher demand pressure
                  </p>
                </div>
                <span className="text-xs font-mono text-indigo-400">Demand Ratio</span>
              </div>

              <div className="space-y-3 pt-2">
                {skillsList
                  .slice()
                  .sort((a, b) => b.demand_index - a.demand_index)
                  .slice(0, 8)
                  .map((item) => {
                    const maxDemand = 20;
                    const pct = Math.min((item.demand_index / maxDemand) * 100, 100);
                    return (
                      <div
                        key={item.skill_id}
                        onClick={() => setSelectedSkill(item)}
                        className="cursor-pointer group p-2.5 rounded-xl hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-700/60"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                            {item.skill_name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">
                              {item.learners_count} learners / {item.teachers_count} teachers
                            </span>
                            <span className="font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded">
                              {item.demand_index}x
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Top Supplied Skills Chart */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-emerald-400" />
                    Top Offered Skills (Supply Index)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Skills with highest campus peer teaching depth
                  </p>
                </div>
                <span className="text-xs font-mono text-emerald-400">Campus Penetration</span>
              </div>

              <div className="space-y-3 pt-2">
                {skillsList
                  .slice()
                  .sort((a, b) => b.supply_index - a.supply_index)
                  .slice(0, 8)
                  .map((item) => {
                    const maxSupply = 25;
                    const pct = Math.min((item.supply_index / maxSupply) * 100, 100);
                    return (
                      <div
                        key={item.skill_id}
                        onClick={() => setSelectedSkill(item)}
                        className="cursor-pointer group p-2.5 rounded-xl hover:bg-slate-800/60 transition-all border border-transparent hover:border-slate-700/60"
                      >
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-white group-hover:text-emerald-300 transition-colors">
                            {item.skill_name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">
                              {item.teachers_count} student mentors
                            </span>
                            <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                              {item.supply_index}%
                            </span>
                          </div>
                        </div>

                        <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden flex">
                          <div
                            className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* GAP ANALYSIS PANEL */}
        {activeTab === "GAP_ANALYSIS" && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    Critical Campus Skill Shortages & Deficit Gaps
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Skills with the highest absolute student deficit: max(0, learners - teachers)
                  </p>
                </div>
                <span className="text-xs font-medium text-rose-400 bg-rose-950/60 border border-rose-800/40 px-3 py-1 rounded-full">
                  {shortages.length} Priority Bottlenecks Detected
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {shortages.slice(0, 10).map((s) => (
                  <div
                    key={s.skill_id}
                    onClick={() => setSelectedSkill(s)}
                    className="cursor-pointer bg-slate-950/70 border border-slate-800/90 hover:border-rose-500/40 rounded-xl p-4 transition-all space-y-3 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {s.category}
                        </span>
                        <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                          {s.skill_name}
                        </h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/50">
                          +{s.skill_gap_score} Deficit
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 italic bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/60 font-medium">
                      "{s.callout_text}"
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400">
                        {s.learners_count} Want to Learn • {s.teachers_count} Available
                      </span>
                      <span className="font-mono font-bold text-indigo-400">
                        Index: {s.demand_index}x
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CATEGORY DISTRIBUTION PANEL */}
        {activeTab === "CATEGORIES" && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-indigo-400" />
                  Campus Skill Interest Breakdown by Category
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Comparative share of learners and teachers across academic disciplines
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {categories.length} Taxonomy Disciplines
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3">
              {categories.map((cat, idx) => (
                <div
                  key={cat.category}
                  onClick={() => setSelectedCategory(cat.category)}
                  className="cursor-pointer bg-slate-950/80 border border-slate-800/90 hover:border-indigo-500/50 rounded-xl p-4 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">{cat.category}</h4>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-slate-800">
                      {cat.total_skills} skills
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Learners: {cat.learners_count} ({cat.learner_share_percentage}%)</span>
                      <span className="font-mono text-indigo-400">Demand: {cat.demand_index}x</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden flex">
                      <div
                        className="bg-indigo-500 h-full rounded-full"
                        style={{ width: `${cat.learner_share_percentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>Teachers: {cat.teachers_count} ({cat.teacher_share_percentage}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${cat.teacher_share_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SKILL NETWORK VISUALIZATION PANEL */}
        {activeTab === "NETWORK" && network && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Network className="w-5 h-5 text-indigo-400" />
                  Interdisciplinary Campus Skill Network
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Anonymized co-occurrence clusters revealing skills studied or taught in tandem across departments
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{network.nodes.length} Key Nodes</span>
                <span>•</span>
                <span>{network.edges.length} Cross-Disciplinary Ties</span>
              </div>
            </div>

            {/* Interactive SVG Network Graph */}
            <div className="relative w-full h-[450px] bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center p-4">
              <svg className="w-full h-full" viewBox="0 0 800 450">
                {/* Edges */}
                {network.edges.slice(0, 45).map((edge, idx) => {
                  const nodeCount = network.nodes.length;
                  const srcIdx = network.nodes.findIndex((n) => n.id === edge.source);
                  const tgtIdx = network.nodes.findIndex((n) => n.id === edge.target);

                  if (srcIdx === -1 || tgtIdx === -1) return null;

                  // Circular layout projection
                  const cx = 400;
                  const cy = 225;
                  const radius = 170;

                  const srcAngle = (srcIdx / nodeCount) * 2 * Math.PI;
                  const tgtAngle = (tgtIdx / nodeCount) * 2 * Math.PI;

                  const x1 = cx + radius * Math.cos(srcAngle);
                  const y1 = cy + radius * Math.sin(srcAngle);
                  const x2 = cx + radius * Math.cos(tgtAngle);
                  const y2 = cy + radius * Math.sin(tgtAngle);

                  const isHighlighted = hoveredNode === edge.source || hoveredNode === edge.target;

                  return (
                    <line
                      key={`${edge.source}-${edge.target}-${idx}`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isHighlighted ? "#818cf8" : "#334155"}
                      strokeWidth={isHighlighted ? 2.5 : Math.min(edge.weight, 3)}
                      strokeOpacity={isHighlighted ? 0.9 : 0.4}
                      className="transition-all duration-300"
                    />
                  );
                })}

                {/* Nodes */}
                {network.nodes.map((node, idx) => {
                  const nodeCount = network.nodes.length;
                  const cx = 400;
                  const cy = 225;
                  const radius = 170;
                  const angle = (idx / nodeCount) * 2 * Math.PI;

                  const nx = cx + radius * Math.cos(angle);
                  const ny = cy + radius * Math.sin(angle);
                  const isHovered = hoveredNode === node.id;

                  return (
                    <g
                      key={node.id}
                      className="cursor-pointer transition-transform duration-300"
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onClick={() => {
                        const target = skillsList.find((s) => s.skill_id === node.id);
                        if (target) setSelectedSkill(target);
                      }}
                    >
                      <circle
                        cx={nx}
                        cy={ny}
                        r={isHovered ? node.size + 4 : node.size}
                        fill={isHovered ? "#6366f1" : "#1e293b"}
                        stroke={isHovered ? "#a5b4fc" : "#475569"}
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        className="transition-all duration-200"
                      />
                      <text
                        x={nx}
                        y={ny + node.size + 12}
                        textAnchor="middle"
                        fontSize={isHovered ? "11" : "9"}
                        fontWeight={isHovered ? "bold" : "normal"}
                        fill={isHovered ? "#ffffff" : "#94a3b8"}
                        className="select-none pointer-events-none"
                      >
                        {node.name.length > 14 ? node.name.slice(0, 12) + "…" : node.name}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Network Tooltip Card */}
              {hoveredNode && (
                <div className="absolute bottom-4 right-4 bg-slate-900/95 border border-indigo-500/50 rounded-xl p-3 text-xs shadow-2xl backdrop-blur-md max-w-xs space-y-1">
                  {(() => {
                    const n = network.nodes.find((item) => item.id === hoveredNode);
                    if (!n) return null;
                    return (
                      <>
                        <div className="font-bold text-white">{n.name}</div>
                        <div className="text-indigo-400 font-mono text-[11px]">{n.category}</div>
                        <div className="text-slate-300 text-[11px]">
                          Co-occurs with related skills across multiple campus student profiles.
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. Detailed Searchable & Sortable Skill Intelligence Matrix */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Campus Skill Matrix ({filteredSkills.length} Skills)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Full taxonomy with learners, teachers, demand ratio, supply index, and gap scores
              </p>
            </div>

            {/* Search & Sort Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search skills or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 w-56 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                >
                  <option value="gap">Skill Gap Score</option>
                  <option value="demand">Demand Index</option>
                  <option value="supply">Supply Index</option>
                  <option value="learners">Learners Count</option>
                  <option value="teachers">Teachers Count</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Skill Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-center">Learners</th>
                  <th className="py-3 px-3 text-center">Teachers</th>
                  <th className="py-3 px-3 text-center">Demand Index</th>
                  <th className="py-3 px-3 text-center">Supply Index</th>
                  <th className="py-3 px-3 text-center">Gap Score</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                {filteredSkills.map((s) => (
                  <tr
                    key={s.skill_id}
                    onClick={() => setSelectedSkill(s)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                      <span>{s.skill_name}</span>
                      {s.is_emerging && (
                        <span className="text-[10px] bg-purple-500/15 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
                          Emerging
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{s.category}</td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-200">
                      {s.learners_count}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-200">
                      {s.teachers_count}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                        {s.demand_index}x
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-400">
                      {s.supply_index}%
                    </td>
                    <td className="py-3 px-3 text-center">
                      {s.skill_gap_score > 0 ? (
                        <span className="font-mono font-bold text-rose-400">
                          +{s.skill_gap_score}
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">{getStatusBadge(s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 8. Skill Detail Modal */}
        {selectedSkill && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    {selectedSkill.category}
                  </span>
                  <h3 className="text-xl font-black text-white">{selectedSkill.skill_name}</h3>
                </div>
                <button
                  onClick={() => setSelectedSkill(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {/* Concrete Narrative Callout Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Campus Narrative Insight
                </span>
                <p className="text-sm font-medium text-slate-200 leading-relaxed italic">
                  "{selectedSkill.callout_text}"
                </p>
              </div>

              {/* Detailed Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400">Learners Demanding:</span>
                  <div className="text-lg font-bold text-white mt-0.5">{selectedSkill.learners_count} students</div>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400">Teachers Available:</span>
                  <div className="text-lg font-bold text-white mt-0.5">{selectedSkill.teachers_count} mentors</div>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400">Skill Demand Index:</span>
                  <div className="text-lg font-bold text-indigo-400 mt-0.5">{selectedSkill.demand_index}x</div>
                </div>
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-slate-400">Skill Gap Score:</span>
                  <div className="text-lg font-bold text-rose-400 mt-0.5">+{selectedSkill.skill_gap_score} deficit</div>
                </div>
              </div>

              {/* Role Action Suggestion */}
              <div className="bg-indigo-950/40 border border-indigo-800/40 p-3.5 rounded-xl text-xs space-y-1">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Recommendation for {role}s:
                </span>
                <p className="text-slate-300 text-[11px]">
                  {role === "STUDENT" &&
                    (selectedSkill.learners_count > selectedSkill.teachers_count
                      ? "If you have experience in this skill, offer to teach it now to earn 1.5x bonus skill credits!"
                      : "Balanced peer availability exists. Request a peer session through the credit hub.")}
                  {role === "FACULTY" &&
                    (selectedSkill.learners_count > selectedSkill.teachers_count
                      ? "High unfulfilled interest. Consider introducing an elective workshop or inviting a guest lecturer."
                      : "Current curriculum coverage appears adequate for student demand.")}
                  {role === "ADMINISTRATOR" &&
                    "Track this skill in quarterly departmental resource allocations to maintain campus equilibrium."}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedSkill(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
