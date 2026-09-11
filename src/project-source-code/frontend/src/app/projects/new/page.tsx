"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  api,
  ProjectAnalysisResponse,
  ProjectRequiredSkillItem,
  Skill,
  ProficiencyLevel,
} from "@/lib/api";
import { ProjectSkillGraph } from "@/components/ProjectSkillGraph";
import {
  Sparkles,
  Rocket,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users2,
  Target,
  ArrowRight,
  ShieldCheck,
  Save,
  HelpCircle,
  Check,
  X,
  Bot,
  Zap,
} from "lucide-react";
import Link from "next/link";

// Pre-built inspiration templates for one-click testing
const SAMPLE_PROJECT_TEMPLATES = [
  {
    label: "🌾 Crop Disease Detection (Agriculture + AI)",
    text: "I want to build an AI-based crop disease detection application.",
  },
  {
    label: "🤖 Autonomous Drone SLAM (Robotics + AI)",
    text: "We need an autonomous drone system using visual SLAM, ROS, and onboard sensor telemetry for navigation in GPS-denied environments.",
  },
  {
    label: "🔗 P2P Lending Protocol (Blockchain + Fintech)",
    text: "Developing a decentralized peer-to-peer micro-lending protocol using smart contracts in Solidity with automated escrow and financial risk calculations.",
  },
  {
    label: "🩺 Pulmonary Diagnostic Assistant (Healthcare + AI)",
    text: "Building an AI diagnostic assistant to detect and segment pulmonary nodules from volumetric chest CT scans and radiology reports.",
  },
];

export default function NewProjectPage() {
  const { profile } = useAuth();

  // Form inputs
  const [description, setDescription] = useState(
    "I want to build an AI-based crop disease detection application."
  );
  const [customTitle, setCustomTitle] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);

  // Analysis Result State
  const [analysisResult, setAnalysisResult] = useState<ProjectAnalysisResponse | null>(null);
  const [editableSkills, setEditableSkills] = useState<ProjectRequiredSkillItem[]>([]);

  // Add Skill Modal / Inline State
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("General");
  const [newSkillImportance, setNewSkillImportance] = useState<"MANDATORY" | "PREFERRED">("MANDATORY");
  const [canonicalSkills, setCanonicalSkills] = useState<Skill[]>([]);

  // Load canonical skills taxonomy for quick add suggestions
  useEffect(() => {
    async function loadTaxonomy() {
      try {
        const skills = await api.skills.list({ limit: 100 });
        setCanonicalSkills(skills);
      } catch (err) {
        console.error("Failed to load skills taxonomy:", err);
      }
    }
    loadTaxonomy();
  }, []);

  // Run AI Project Intelligence Pipeline
  const handleAnalyze = async () => {
    if (!description.trim()) {
      setError("Please provide a project description.");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setSuccessMessage(null);
    setCreatedProjectId(null);

    try {
      const response = await api.ai.analyzeProject({
        text: description.trim(),
        title: customTitle.trim() || undefined,
        student_id: profile?.id,
      });

      setAnalysisResult(response);
      setEditableSkills(response.required_skills);
      if (!customTitle && response.project_title) {
        setCustomTitle(response.project_title);
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze project idea. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Skill editing handlers
  const handleToggleImportance = (index: number) => {
    setEditableSkills((prev) =>
      prev.map((skill, i) => {
        if (i !== index) return skill;
        const newImp: "MANDATORY" | "PREFERRED" =
          skill.importance === "MANDATORY" ? "PREFERRED" : "MANDATORY";
        return {
          ...skill,
          importance: newImp,
          importance_score: newImp === "MANDATORY" ? 0.95 : 0.75,
        };
      })
    );
  };

  const handleRemoveSkill = (index: number) => {
    setEditableSkills((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;

    // Check if skill already exists
    const exists = editableSkills.some(
      (s) => s.skill_name.toLowerCase() === newSkillName.trim().toLowerCase()
    );
    if (exists) {
      setError(`Skill "${newSkillName}" is already in the requirements list.`);
      return;
    }

    // Match with canonical taxonomy if available
    const canon = canonicalSkills.find(
      (s) => s.name.toLowerCase() === newSkillName.trim().toLowerCase()
    );

    const newSkill: ProjectRequiredSkillItem = {
      skill_id: canon?.id || null,
      skill_name: canon?.name || newSkillName.trim(),
      skill_category: canon?.category || newSkillCategory,
      required_proficiency: "INTERMEDIATE" as ProficiencyLevel,
      importance: newSkillImportance,
      importance_score: newSkillImportance === "MANDATORY" ? 0.95 : 0.75,
      rationale: "Manually customized requirement by project owner",
    };

    setEditableSkills((prev) => [newSkill, ...prev]);
    setNewSkillName("");
    setIsAddingSkill(false);
    setError(null);
  };

  // Save finalized project to database
  const handleSaveProject = async () => {
    if (!profile) {
      setError("You must select a student profile to save the project.");
      return;
    }

    if (!editableSkills.length) {
      setError("The project must have at least one required skill.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const finalTitle = customTitle.trim() || analysisResult?.project_title || "Campus Innovation Project";
      const finalCategory = analysisResult?.domain_label || "AI & Software";

      const payload = {
        title: finalTitle,
        description: description.trim(),
        category: finalCategory,
        max_members: analysisResult?.suggested_team_size || 4,
        requirements: editableSkills.map((s) => ({
          skill_id: s.skill_id || undefined,
          skill_name: s.skill_name,
          required_proficiency: s.required_proficiency,
          importance: s.importance,
          description: s.rationale || undefined,
        })),
      };

      const created = await api.projects.create(profile.id, payload);
      setCreatedProjectId(created.id);
      setSuccessMessage(
        `Project "${created.title}" successfully created and saved with ${editableSkills.length} required skills!`
      );
    } catch (err: any) {
      setError(err.message || "Failed to save project. Please check requirements.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* Top Banner Header */}
      <div className="relative rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/40 p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-20 -bottom-10 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" />
              Stage 5: Project Intelligence
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              AI Project Idea Analyzer &amp; Skill Decomposition
            </h1>
            <p className="max-w-2xl text-sm text-slate-400">
              Enter any collaborative project idea in natural language. Our deterministic AI pipeline
              infers domain boundaries, extracts technical skills, computes NetworkX topological centrality,
              identifies your personal skill gaps, and recommends multi-disciplinary team roles.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-right">
              <span className="text-[11px] font-mono text-slate-400 block">Owner Profile</span>
              <span className="text-sm font-bold text-white block truncate max-w-[160px]">
                {profile?.full_name || "Aarav Sharma"}
              </span>
              <span className="text-[10px] text-indigo-400 block truncate">
                {profile?.department || "Computer Science"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Section Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Bot className="h-4 w-4 text-indigo-400" />
            Natural Language Project Idea
          </label>
          <div className="text-xs text-slate-400">
            {description.length} characters &bull; Free-form conversational English
          </div>
        </div>

        {/* Quick-fill template chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Sample Inspiration Prompts:
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROJECT_TEMPLATES.map((tpl, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setDescription(tpl.text);
                  setCustomTitle("");
                }}
                className="rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-indigo-500/50 hover:bg-slate-800 hover:text-white transition-all text-left"
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Area */}
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. I want to build an AI-based crop disease detection application..."
          className="w-full rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans leading-relaxed"
        />

        {/* Action Button and Custom Title */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
          <div className="w-full sm:w-auto flex-1 max-w-md">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Custom Project Title (optional, AI will infer)"
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={analyzing || !description.trim()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-cyan-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 transition-all cursor-pointer"
          >
            {analyzing ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Analyzing Intelligence Pipeline...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Analyze Project Intelligence
              </>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
            {createdProjectId && (
              <span className="rounded-lg bg-emerald-950 border border-emerald-700/50 px-2.5 py-1 text-xs font-mono text-emerald-200">
                ID: {createdProjectId.slice(0, 8)}...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Analysis Results View */}
      {analysisResult && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Executive Summary Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Domain: {analysisResult.domain_label}
                  </span>
                  <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-0.5 text-xs font-bold text-indigo-400">
                    Complexity: {analysisResult.complexity}
                  </span>
                  <span className="rounded-full bg-slate-800 border border-slate-700 px-3 py-0.5 text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Users2 className="h-3.5 w-3.5 text-slate-400" />
                    Target Team: {analysisResult.suggested_team_size} Members
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {analysisResult.project_title}
                </h2>
              </div>

              {/* Save Project CTA */}
              <button
                onClick={handleSaveProject}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving to Campus DB...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save &amp; Publish Project
                  </>
                )}
              </button>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/50 rounded-xl p-4 border border-slate-800/80">
              {analysisResult.project_summary}
            </p>
          </div>

          {/* NetworkX Visual Skill Graph Component */}
          <ProjectSkillGraph
            data={analysisResult.skill_graph}
            projectTitle={analysisResult.project_title}
            domainLabel={analysisResult.domain_label}
            onSelectSkill={(skill) => {
              // Highlight or filter if desired
            }}
          />

          {/* Two-Column Grid: Skills Manager vs Roles & Gaps */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Required Skills Manager (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Target className="h-4 w-4 text-indigo-400" />
                    Required Skills &amp; Importance Classification
                  </h3>
                  <p className="text-xs text-slate-400">
                    Click badge to toggle Mandatory &bull; Edit or remove requirements before saving
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingSkill(!isAddingSkill)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Skill
                </button>
              </div>

              {/* Add Skill Form Drawer */}
              {isAddingSkill && (
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-3 animate-in fade-in">
                  <div className="text-xs font-bold text-indigo-300">Add Skill Requirement</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        placeholder="Skill name (e.g. PyTorch, Docker, React)..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <select
                        value={newSkillImportance}
                        onChange={(e) => setNewSkillImportance(e.target.value as any)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="MANDATORY">MANDATORY</option>
                        <option value="PREFERRED">PREFERRED</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingSkill(false)}
                      className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500"
                    >
                      Add to Requirements
                    </button>
                  </div>
                </div>
              )}

              {/* Skills Cards List */}
              <div className="space-y-2.5">
                {editableSkills.map((skill, idx) => {
                  const isMandatory = skill.importance === "MANDATORY";
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-slate-700 transition group"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-white">{skill.skill_name}</span>
                          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                            {skill.skill_category || "General"}
                          </span>
                        </div>
                        {skill.rationale && (
                          <p className="text-xs text-slate-400 truncate">{skill.rationale}</p>
                        )}
                      </div>

                      {/* Importance Toggle Badge & Score */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:block text-right">
                          <span className="text-[10px] text-slate-400 font-mono block">Weight</span>
                          <span className="text-xs font-mono font-bold text-indigo-400">
                            {Math.round(skill.importance_score * 100)}%
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleImportance(idx)}
                          title="Click to toggle Mandatory / Preferred"
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold tracking-wide transition-all cursor-pointer ${
                            isMandatory
                              ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 hover:bg-indigo-600/30"
                              : "bg-amber-600/20 text-amber-400 border border-amber-500/40 hover:bg-amber-600/30"
                          }`}
                        >
                          {skill.importance}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(idx)}
                          title="Remove skill"
                          className="rounded-lg p-1 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Missing Skills Gap & Suggested Team Roles (1 col) */}
            <div className="space-y-6">
              {/* Missing Skills Gap Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400" />
                    Personal Skill Gap Analysis
                  </h3>
                  <span className="rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-mono text-amber-300">
                    {analysisResult.missing_skills.length} Gaps
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Skills required by this project that <strong>{profile?.full_name || "you"}</strong> does not currently possess. Recruit teammates or find peer tutors on campus!
                </p>

                {analysisResult.missing_skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {analysisResult.missing_skills.map((ms, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-300 flex items-center gap-1"
                      >
                        <X className="h-3 w-3 text-red-400" />
                        {ms}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>You already possess all required skills for this build!</span>
                  </div>
                )}

                <div className="pt-2">
                  <Link
                    href="/learn"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                  >
                    Find peer matches for these gaps <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* Suggested Team Roles Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users2 className="h-4 w-4 text-indigo-400" />
                    Suggested Team Roles
                  </h3>
                  <span className="rounded-md bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                    {analysisResult.suggested_roles.length} Roles
                  </span>
                </div>

                <div className="space-y-3">
                  {analysisResult.suggested_roles.map((role, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-800/90 bg-slate-900/60 p-3.5 space-y-2"
                    >
                      <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        {role.role_title}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {role.description}
                      </p>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {role.associated_skills.map((ask, sIdx) => (
                          <span
                            key={sIdx}
                            className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300"
                          >
                            {ask}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
