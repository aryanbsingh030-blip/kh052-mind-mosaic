"use client";

import React, { useState } from "react";
import {
  api,
  AnalyzedSkillItem,
  SkillAnalysisResult,
  SkillDirection,
  ProficiencyLevel,
  Skill,
} from "@/lib/api";
import { ProficiencyBadge } from "./ProficiencyBadge";
import {
  Sparkles,
  CheckCircle2,
  X,
  Plus,
  ArrowRight,
  Brain,
  Quote,
  Zap,
  HelpCircle,
  Loader2,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  canonicalSkills: Skill[];
  onSkillsUpdated: () => Promise<void>;
  defaultDirection?: SkillDirection;
}

const PRESET_EXAMPLES = [
  {
    label: "AI / ML (Plant Disease Classifier)",
    text: "I built a CNN model for plant disease classification using Python and TensorFlow. I deployed it with Flask.",
  },
  {
    label: "Full-Stack Web Development",
    text: "Developed a full-stack e-commerce app using React, TypeScript, Next.js, Node.js, and PostgreSQL with Tailwind CSS.",
  },
  {
    label: "Cybersecurity & Pentesting",
    text: "Conducted network penetration testing using Wireshark, Metasploit, and Linux to assess CVE vulnerabilities and configure firewalls.",
  },
  {
    label: "UI/UX & Prototyping",
    text: "Designed mobile app wireframes and interactive prototypes in Figma, conducted user research and usability testing.",
  },
  {
    label: "Data Science & Analytics",
    text: "Analyzed customer churn datasets using Pandas, NumPy, and Scikit-learn, visualized feature distributions with Matplotlib.",
  },
  {
    label: "Cloud & DevOps",
    text: "Configured AWS VPC, deployed microservices with Docker and Kubernetes, automated CI/CD pipelines with GitHub Actions.",
  },
];

const PROFICIENCIES: ProficiencyLevel[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
];

export const SkillAnalyzerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  studentId,
  canonicalSkills,
  onSkillsUpdated,
  defaultDirection = "TEACH",
}) => {
  const [inputText, setInputText] = useState("");
  const [direction, setDirection] = useState<SkillDirection>(defaultDirection);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<SkillAnalysisResult | null>(null);
  const [editableSkills, setEditableSkills] = useState<AnalyzedSkillItem[]>([]);
  const [acceptedSkillNames, setAcceptedSkillNames] = useState<Set<string>>(new Set());
  const [acceptingSkill, setAcceptingSkill] = useState<string | null>(null);
  const [acceptAllLoading, setAcceptAllLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    if (!inputText.trim()) {
      setErrorMsg("Please enter a description of your experience or select a preset example.");
      return;
    }

    setAnalyzing(true);
    setErrorMsg(null);
    setAcceptedSkillNames(new Set());

    try {
      const data = await api.ai.analyzeSkills(inputText.trim(), direction);
      setResult(data);
      setEditableSkills([...data.skills]);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to analyze experience.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleProficiencyChange = (index: number, newProf: ProficiencyLevel) => {
    setEditableSkills((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], proficiency: newProf };
      return updated;
    });
  };

  const handleDismissSkill = (index: number) => {
    setEditableSkills((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAcceptSingle = async (skillItem: AnalyzedSkillItem) => {
    setAcceptingSkill(skillItem.skill_name);
    setErrorMsg(null);

    try {
      // Resolve canonical skill ID if missing
      let targetSkillId = skillItem.skill_id;
      if (!targetSkillId) {
        const matched = canonicalSkills.find(
          (cs) =>
            cs.name.toLowerCase() === skillItem.skill_name.toLowerCase() ||
            cs.name.toLowerCase().includes(skillItem.skill_name.toLowerCase()) ||
            skillItem.skill_name.toLowerCase().includes(cs.name.toLowerCase())
        );
        if (matched) {
          targetSkillId = matched.id;
        }
      }

      if (!targetSkillId) {
        // Fallback to first canonical skill in category
        const catMatched = canonicalSkills.find(
          (cs) => cs.category.toLowerCase() === (skillItem.skill_category || "").toLowerCase()
        );
        targetSkillId = catMatched ? catMatched.id : canonicalSkills[0]?.id;
      }

      if (!targetSkillId) {
        throw new Error(`Could not map "${skillItem.skill_name}" to campus taxonomy.`);
      }

      await api.skills.addStudentSkill(studentId, {
        skill_id: targetSkillId,
        direction: direction,
        proficiency_level: skillItem.proficiency,
        years_experience: direction === "TEACH" ? (skillItem.proficiency === "ADVANCED" ? 2.5 : 1.0) : 0,
        description: `Extracted via AI Skill Intelligence from: "${skillItem.evidence}"`,
      });

      setAcceptedSkillNames((prev) => new Set([...prev, skillItem.skill_name]));
      await onSkillsUpdated();
    } catch (err: any) {
      if (err.message && err.message.includes("already has")) {
        // Mark as already accepted
        setAcceptedSkillNames((prev) => new Set([...prev, skillItem.skill_name]));
      } else {
        setErrorMsg(err.message || `Failed to add ${skillItem.skill_name}`);
      }
    } finally {
      setAcceptingSkill(null);
    }
  };

  const handleAcceptAll = async () => {
    setAcceptAllLoading(true);
    setErrorMsg(null);

    try {
      for (const item of editableSkills) {
        if (!acceptedSkillNames.has(item.skill_name)) {
          await handleAcceptSingle(item);
        }
      }
      await onSkillsUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to accept some skills.");
    } finally {
      setAcceptAllLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-indigo-500/30 bg-slate-900 shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/60 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-md shadow-indigo-500/20">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                AI Skill Intelligence Analyzer
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-mono font-medium text-indigo-300 border border-indigo-500/20">
                  Zero-DB Direct Mutation
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Extracts structured skills, proficiency, evidence, and hierarchy from natural language.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Preset Example Quick Pills */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Try a realistic campus example:
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setInputText(ex.text)}
                  className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-300 hover:border-indigo-500/40 hover:bg-indigo-950/20 hover:text-indigo-200 transition-all text-left"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-200">
                Describe your project, builds, or coursework in natural language:
              </label>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Target:</span>
                <button
                  type="button"
                  onClick={() => setDirection("TEACH")}
                  className={`px-2 py-0.5 rounded font-bold text-[11px] transition-all ${
                    direction === "TEACH"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "text-slate-500 hover:text-slate-400"
                  }`}
                >
                  Can Teach
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("LEARN")}
                  className={`px-2 py-0.5 rounded font-bold text-[11px] transition-all ${
                    direction === "LEARN"
                      ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                      : "text-slate-500 hover:text-slate-400"
                  }`}
                >
                  Want to Learn
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
              placeholder="e.g. I built a CNN model for plant disease classification using Python and TensorFlow. I deployed it with Flask."
            />

            <div className="flex justify-end">
              <button
                onClick={handleAnalyze}
                disabled={analyzing || !inputText.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-cyan-400 transition-all disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing Skill Signals...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Extract & Normalize Skills
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Section */}
          {result && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-400" />
                    Detected Skills ({editableSkills.length})
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    Engine: <span className="text-indigo-300">{result.provider_used}</span> &bull; {result.processing_time_ms}ms
                  </p>
                </div>

                {editableSkills.length > 0 && (
                  <button
                    onClick={handleAcceptAll}
                    disabled={acceptAllLoading || editableSkills.every((s) => acceptedSkillNames.has(s.skill_name))}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-emerald-500 transition-all disabled:opacity-50 self-start sm:self-auto"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {acceptAllLoading ? "Accepting All..." : "Accept All Detected Skills"}
                  </button>
                )}
              </div>

              {editableSkills.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {editableSkills.map((item, idx) => {
                    const isAccepted = acceptedSkillNames.has(item.skill_name);
                    const isAccepting = acceptingSkill === item.skill_name;

                    return (
                      <div
                        key={idx}
                        className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                          isAccepted
                            ? "border-emerald-500/40 bg-emerald-950/20"
                            : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Category & Confidence */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                              {item.skill_category || "General"}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-indigo-400">
                              <span>{Math.round(item.confidence * 100)}%</span>
                              <span className="text-[10px] text-slate-400 font-normal">conf</span>
                            </div>
                          </div>

                          {/* Skill Name */}
                          <h4 className="text-sm font-bold text-white flex items-center justify-between">
                            {item.skill_name}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-mono uppercase ${
                                item.source === "direct_mention"
                                  ? "bg-slate-800 text-slate-300"
                                  : item.source === "hierarchy_inferred"
                                  ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                                  : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                              }`}
                            >
                              {item.source.replace("_", " ")}
                            </span>
                          </h4>

                          {/* Proficiency Selector */}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[11px] text-slate-400">Proficiency:</span>
                            <select
                              value={item.proficiency}
                              onChange={(e) => handleProficiencyChange(idx, e.target.value as ProficiencyLevel)}
                              disabled={isAccepted}
                              className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-indigo-300 focus:border-indigo-500 focus:outline-none"
                            >
                              {PROFICIENCIES.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Evidence snippet */}
                          {item.evidence && (
                            <div className="rounded bg-slate-900/90 p-2 text-[11px] text-slate-400 italic border border-slate-800/60 line-clamp-2">
                              &quot;{item.evidence}&quot;
                            </div>
                          )}
                        </div>

                        {/* Card actions */}
                        <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => handleDismissSkill(idx)}
                            disabled={isAccepted}
                            className="text-slate-500 hover:text-slate-300 disabled:opacity-30"
                          >
                            Dismiss
                          </button>

                          {isAccepted ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-400 text-xs">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Added to Profile
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAcceptSingle(item)}
                              disabled={isAccepting}
                              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600/80 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              {isAccepting ? "Adding..." : "Accept Skill"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No technical skills could be extracted from this text. Try describing hands-on tools, frameworks, or languages used.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-6 py-4">
          <p className="text-[11px] text-slate-500">
            Skills are only saved to your profile when you click <strong>Accept</strong>.
          </p>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
