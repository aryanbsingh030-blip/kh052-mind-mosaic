"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { skillRepository } from "@/lib/repositories/SkillRepository";
import { AnalyzedSkillItem, SkillDirection, ProficiencyLevel } from "@/lib/api";
import { ProficiencyBadge } from "@/components/ui/ProficiencyBadge";
import { StateCard } from "@/components/ui/StateCard";
import {
  Sparkles,
  FileText,
  CheckCircle2,
  Plus,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function SkillAnalyzerPage() {
  const { profile } = useAuth();
  const [inputText, setInputText] = useState(
    "I have built several production full-stack web applications using Python, FastAPI, and PostgreSQL. I frequently write complex frontend components in React and Next.js with TypeScript, and deploy them using Docker and AWS."
  );
  const [direction, setDirection] = useState<SkillDirection>("TEACH");
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalyzedSkillItem[]>([]);
  const [providerUsed, setProviderUsed] = useState<string>("");
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [addedSkillIds, setAddedSkillIds] = useState<Set<string>>(new Set());

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setAnalyzing(true);
    try {
      const res = await skillRepository.analyzeSkills(inputText, direction);
      setResults(res.skills || []);
      setProviderUsed(res.provider_used || "Embedded Local NLP");
      setProcessingTime(res.processing_time_ms || 15);
    } catch (err) {
      console.warn("Analysis fallback to local heuristic:", err);
      const local = skillRepository.analyzeSkillsLocally(inputText, direction);
      setResults(local.skills || []);
      setProviderUsed(local.provider_used);
      setProcessingTime(local.processing_time_ms);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddSkill = async (skill: AnalyzedSkillItem, index: number) => {
    if (!profile?.id) return;
    try {
      await skillRepository.addStudentSkill({
        student_id: profile.id,
        skill_id: skill.skill_id || `skill-auto-${Date.now()}-${index}`,
        direction,
        proficiency_level: skill.proficiency,
        description: skill.evidence,
      });
      setAddedSkillIds((prev) => new Set(prev).add(`${skill.skill_name}-${index}`));
    } catch (err) {
      console.warn("Skill add error:", err);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Natural Language Skill Analyzer
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                100% Offline Capable
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste bio, resume highlights, or project descriptions to extract skills with confidence scores
            </p>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-400" />
            Paste Experience or Technical Bio
          </label>
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setDirection("TEACH")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                direction === "TEACH"
                  ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Analyze for Teaching
            </button>
            <button
              onClick={() => setDirection("LEARN")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                direction === "LEARN"
                  ? "bg-cyan-950/80 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Analyze for Learning
            </button>
          </div>
        </div>

        <textarea
          rows={5}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="e.g., Built a computer vision pipeline in PyTorch and deployed with Docker on AWS EC2..."
          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
        />

        {/* Preset prompts */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] text-slate-500">Quick Samples:</span>
          <button
            onClick={() =>
              setInputText(
                "3+ years building data science workflows with Python, Pandas, and Scikit-Learn. I designed regression and clustering models for campus analytics."
              )
            }
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-all"
          >
            Data Scientist &amp; ML
          </button>
          <button
            onClick={() =>
              setInputText(
                "Lead architect for distributed cloud systems using AWS Lambda, Docker, Kubernetes, and PostgreSQL. Experienced in setting up CI/CD pipelines."
              )
            }
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-all"
          >
            Cloud &amp; DevOps
          </button>
          <button
            onClick={() =>
              setInputText(
                "Frontend engineer specialized in React, Next.js, and TypeScript. Proficient in Figma wireframing and user experience testing."
              )
            }
            className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-all"
          >
            Frontend &amp; UI/UX
          </button>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-500">
            Powered by Dual-Engine (Online LLM or Local Embedded NLP)
          </span>
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !inputText.trim()}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <Sparkles className={`h-4 w-4 ${analyzing ? "animate-spin" : ""}`} />
            <span>{analyzing ? "Analyzing Capabilities..." : "Analyze Capabilities"}</span>
          </button>
        </div>
      </div>

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Detected Skills &amp; Proficiency Ratings ({results.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Engine: <span className="text-indigo-300 font-mono">{providerUsed}</span> &bull; Latency:{" "}
                <span className="text-emerald-400 font-mono">{processingTime}ms</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map((skill, idx) => {
              const isAdded = addedSkillIds.has(`${skill.skill_name}-${idx}`);
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">{skill.skill_name}</h3>
                        <p className="text-[10px] text-slate-400 uppercase font-mono tracking-wider mt-0.5">
                          {skill.skill_category || "General"}
                        </p>
                      </div>
                      <ProficiencyBadge level={skill.proficiency} />
                    </div>

                    <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 italic">
                      &quot;{skill.evidence}&quot;
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                    <span className="text-[11px] text-slate-400">
                      Confidence: <span className="font-mono text-indigo-300 font-bold">{Math.round(skill.confidence * 100)}%</span>
                    </span>

                    <button
                      onClick={() => handleAddSkill(skill, idx)}
                      disabled={isAdded}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        isAdded
                          ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Added to Profile</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add to {direction === "TEACH" ? "Teaching" : "Learning"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
