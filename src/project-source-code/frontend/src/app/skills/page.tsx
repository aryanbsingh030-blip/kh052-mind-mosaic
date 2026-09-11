"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  Skill,
  StudentSkill,
  SkillDirection,
  ProficiencyLevel,
} from "@/lib/api";
import { SkillCard } from "@/components/ui/SkillCard";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkillAnalyzerModal } from "@/components/ui/SkillAnalyzerModal";
import {
  Layers,
  Award,
  Sparkles,
  Plus,
  Search,
  CheckCircle2,
  X,
  Filter,
  Brain,
} from "lucide-react";

const PROFICIENCIES: ProficiencyLevel[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
];

export default function SkillsPage() {
  const { profile, refreshProfile, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<SkillDirection>("TEACH");
  const [canonicalSkills, setCanonicalSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [direction, setDirection] = useState<SkillDirection>("TEACH");
  const [proficiency, setProficiency] = useState<ProficiencyLevel>("INTERMEDIATE");
  const [yearsExp, setYearsExp] = useState(1.0);
  const [skillDescription, setSkillDescription] = useState("");

  // Submission & deletion states
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load canonical skills taxonomy
  useEffect(() => {
    const fetchTaxonomy = async () => {
      try {
        const [skillsList, cats] = await Promise.all([
          api.skills.list({ limit: 100 }),
          api.skills.categories(),
        ]);
        setCanonicalSkills(skillsList);
        setCategories(cats);
        if (skillsList.length > 0) {
          setSelectedSkillId(skillsList[0].id);
        }
      } catch (err) {
        console.error("Failed to load skills taxonomy:", err);
      }
    };

    fetchTaxonomy();
  }, []);

  const openAddModal = (dir: SkillDirection) => {
    setDirection(dir);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !selectedSkillId) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await api.skills.addStudentSkill(profile.id, {
        skill_id: selectedSkillId,
        direction: direction,
        proficiency_level: proficiency,
        years_experience: direction === "TEACH" ? Number(yearsExp) : 0,
        description: skillDescription.trim() || undefined,
      });

      await refreshProfile();
      setSuccessMsg(`Successfully added skill to your ${direction === "TEACH" ? "teaching" : "learning"} profile!`);
      setIsModalOpen(false);
      setSkillDescription("");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add skill.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSkill = async (studentSkillId: string) => {
    setDeletingId(studentSkillId);
    try {
      await api.skills.deleteStudentSkill(studentSkillId);
      await refreshProfile();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove skill.");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || !profile) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  // Filter skills for active tab
  const activeSkills = profile.skills.filter((s) => s.direction === activeTab);

  const filteredSkills = activeSkills.filter((s) => {
    const matchesSearch =
      !searchQuery ||
      (s.skill_name && s.skill_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.skill_category && s.skill_category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || s.skill_category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const teachCount = profile.skills.filter((s) => s.direction === "TEACH").length;
  const learnCount = profile.skills.filter((s) => s.direction === "LEARN").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Layers className="h-6 w-6 text-indigo-400" />
            Skills Matrix
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Declare what you can teach to earn Skill Credits, and what you want to learn from campus peers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setIsAnalyzerOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-bold text-indigo-300 shadow-md hover:bg-indigo-500/20 hover:border-indigo-500/50 transition-all"
          >
            <Brain className="h-4 w-4 text-indigo-400" />
            AI Skill Analyzer
          </button>
          <button
            onClick={() => openAddModal(activeTab)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add {activeTab === "TEACH" ? "Teaching" : "Learning"} Skill
          </button>
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} />}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          {successMsg}
        </div>
      )}

      {/* Teach vs Learn Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-px">
        <button
          onClick={() => setActiveTab("TEACH")}
          className={`flex items-center gap-2.5 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
            activeTab === "TEACH"
              ? "border-emerald-500 text-emerald-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Award className="h-4 w-4" />
          Skills I Can Teach
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-mono text-emerald-400 border border-emerald-500/20">
            {teachCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("LEARN")}
          className={`flex items-center gap-2.5 border-b-2 px-5 py-3 text-sm font-bold transition-all ${
            activeTab === "LEARN"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Skills I Want to Learn
          <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-mono text-sky-400 border border-sky-500/20">
            {learnCount}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder={`Search ${activeTab.toLowerCase()} skills or categories...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-500 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2.5 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Skills Grid */}
      {filteredSkills.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onDelete={handleDeleteSkill}
              isDeleting={deletingId === skill.id}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={activeTab === "TEACH" ? Award : Sparkles}
          title={
            searchQuery || selectedCategory
              ? "No matching skills found"
              : `No ${activeTab === "TEACH" ? "Teaching" : "Learning"} Skills Declared`
          }
          description={
            searchQuery || selectedCategory
              ? "Try adjusting your search query or category filter."
              : activeTab === "TEACH"
              ? "Add skills you are confident in to mentor campus students and build up your Skill Credit balance."
              : "Specify technologies, tools, or subjects you want to master to get paired with peer tutors."
          }
          actionText={`Add ${activeTab === "TEACH" ? "Teaching" : "Learning"} Skill`}
          onAction={() => openAddModal(activeTab)}
        />
      )}

      {/* Add Skill Modal Drawer */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {direction === "TEACH" ? (
                  <Award className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Sparkles className="h-5 w-5 text-sky-400" />
                )}
                Add {direction === "TEACH" ? "Teaching Capability" : "Skill to Learn"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSkill} className="space-y-4">
              {/* Direction Switcher */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection("TEACH")}
                    className={`rounded-lg py-2 text-xs font-bold transition-all ${
                      direction === "TEACH"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-slate-950 text-slate-400 border border-slate-800"
                    }`}
                  >
                    I Can Teach This
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection("LEARN")}
                    className={`rounded-lg py-2 text-xs font-bold transition-all ${
                      direction === "LEARN"
                        ? "bg-sky-500/20 text-sky-400 border border-sky-500/40"
                        : "bg-slate-950 text-slate-400 border border-slate-800"
                    }`}
                  >
                    I Want to Learn This
                  </button>
                </div>
              </div>

              {/* Select Skill */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Select Skill from Taxonomy ({canonicalSkills.length} available)
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

              {/* Proficiency Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Proficiency Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PROFICIENCIES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProficiency(p)}
                      className={`rounded-lg py-2 px-1 text-[11px] font-mono font-bold uppercase transition-all ${
                        proficiency === p
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                          : "bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Years Experience (only for TEACH) */}
              {direction === "TEACH" && (
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1.5">
                    <span>Years of Hands-on Experience</span>
                    <span className="font-mono text-indigo-400">{yearsExp} yrs</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="8"
                    step="0.5"
                    value={yearsExp}
                    onChange={(e) => setYearsExp(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              )}

              {/* Natural language notes on application */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Natural Language Experience & Context (Optional)
                </label>
                <textarea
                  rows={2}
                  value={skillDescription}
                  onChange={(e) => setSkillDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white focus:border-indigo-500 focus:outline-none placeholder-slate-600"
                  placeholder="e.g. Deployed microservices using Docker compose and monitored memory usage."
                />
              </div>

              {/* Action buttons */}
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
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  {submitting ? "Adding..." : "Add to Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Skill Analyzer Modal */}
      <SkillAnalyzerModal
        isOpen={isAnalyzerOpen}
        onClose={() => setIsAnalyzerOpen(false)}
        studentId={profile.id}
        canonicalSkills={canonicalSkills}
        onSkillsUpdated={refreshProfile}
        defaultDirection={activeTab}
      />
    </div>
  );
}
