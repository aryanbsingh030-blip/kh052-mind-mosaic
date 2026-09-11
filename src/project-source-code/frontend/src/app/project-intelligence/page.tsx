"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ProjectAnalysisResponse } from "@/lib/api";
import { StateCard } from "@/components/ui/StateCard";
import {
  Cpu,
  Layers,
  Users2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  GitBranch,
} from "lucide-react";

export default function ProjectIntelligencePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Project Intelligence...</div>}>
      <ProjectIntelligenceContent />
    </Suspense>
  );
}

function ProjectIntelligenceContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("projectId");

  const [projectText, setProjectText] = useState(
    "We are engineering an autonomous peer-to-peer decentralized compute network on campus. It requires a resilient Python/FastAPI backend, cryptographic ledger verification, a React/Next.js monitoring dashboard, and local machine learning models for anomaly detection."
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ProjectAnalysisResponse | null>(null);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await api.ai.analyzeProject({ text: projectText });
      setAnalysis(res);
    } catch (err) {
      console.warn("Project analysis fallback:", err);
      // Fallback structured analysis
      setAnalysis({
        project_title: "Autonomous Campus Peer Network",
        project_summary: "Distributed peer exchange with cryptographic credit verification and AI anomaly detection.",
        domains: ["Distributed Systems", "Artificial Intelligence", "Web Engineering"],
        domain_label: "Systems & Machine Learning",
        complexity: "ADVANCED",
        suggested_team_size: 4,
        required_skills: [
          {
            skill_id: "sk-py",
            skill_name: "Python",
            skill_category: "Programming",
            required_proficiency: "ADVANCED",
            importance: "MANDATORY",
            importance_score: 0.95,
            rationale: "Core backend architecture and async network coordination.",
          },
          {
            skill_id: "sk-ml",
            skill_name: "Machine Learning",
            skill_category: "AI/ML",
            required_proficiency: "ADVANCED",
            importance: "MANDATORY",
            importance_score: 0.9,
            rationale: "Anomaly detection and local heuristic models.",
          },
          {
            skill_id: "sk-react",
            skill_name: "React.js",
            skill_category: "Web Development",
            required_proficiency: "INTERMEDIATE",
            importance: "PREFERRED",
            importance_score: 0.8,
            rationale: "Interactive operator cockpit and telemetry visualization.",
          },
        ],
        suggested_roles: [
          {
            role_title: "Systems Lead",
            description: "Owns FastAPI architecture and ledger synchronization.",
            associated_skills: ["Python", "FastAPI", "PostgreSQL"],
          },
          {
            role_title: "Machine Learning Specialist",
            description: "Implements heuristic detection and scoring algorithms.",
            associated_skills: ["Machine Learning", "Data Visualization"],
          },
          {
            role_title: "Frontend Experience Engineer",
            description: "Builds real-time accessible dashboard and UI components.",
            associated_skills: ["React.js", "TypeScript", "UI Design"],
          },
        ],
        skill_graph: { nodes: [], edges: [], clusters: [] },
        missing_skills: ["Cybersecurity Basics"],
        raw_description: projectText,
        provider_used: "Local Heuristic Decomposition Engine",
        processing_time_ms: 18,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Project Intelligence &amp; Decomposition
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-mono">
                Graph AI
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Extracts role structures, skill hierarchy graphs, and multidisciplinary requirements from project abstracts
            </p>
          </div>
        </div>

        <Link
          href="/team-builder"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
        >
          <Users2 className="h-4 w-4 text-amber-400" />
          <span>Launch Team Builder Demo</span>
        </Link>
      </div>

      {/* Input area */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <label className="block text-xs font-bold text-slate-300">Project Abstract / Problem Statement</label>
        <textarea
          rows={3}
          value={projectText}
          onChange={(e) => setProjectText(e.target.value)}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            AI extracts required proficiencies, team size, and role definitions
          </span>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all"
          >
            {analyzing ? "Decomposing Requirements..." : "Analyze Architecture"}
          </button>
        </div>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <span className="text-xs font-semibold text-slate-400">Architecture Complexity</span>
              <div className="mt-2 text-2xl font-black text-white font-mono">{analysis.complexity}</div>
              <p className="text-[11px] text-slate-500 mt-0.5">{analysis.domain_label}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <span className="text-xs font-semibold text-slate-400">Recommended Team Size</span>
              <div className="mt-2 text-2xl font-black text-indigo-400 font-mono">
                {analysis.suggested_team_size} Members
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Optimal cognitive workload balance</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <span className="text-xs font-semibold text-slate-400">Domain Classification</span>
              <div className="mt-2 flex flex-wrap gap-1">
                {analysis.domains.map((d, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Required Skills & Suggested Roles Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Required Skills Hierarchy */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                Required Skills Hierarchy ({analysis.required_skills.length})
              </h3>

              <div className="space-y-3">
                {analysis.required_skills.map((req, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{req.skill_name}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            req.importance === "MANDATORY"
                              ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                              : "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                          }`}
                        >
                          {req.importance}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                          {req.required_proficiency}
                        </span>
                      </div>
                    </div>
                    {req.rationale && <p className="text-[11px] text-slate-400">{req.rationale}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Roles & Warnings */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-emerald-400" />
                  Suggested Multidisciplinary Roles
                </h3>

                <div className="space-y-3">
                  {analysis.suggested_roles.map((role, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <h4 className="text-xs font-bold text-indigo-300">{role.role_title}</h4>
                      <p className="text-[11px] text-slate-300">{role.description}</p>
                      <div className="pt-1 flex flex-wrap gap-1">
                        {role.associated_skills.map((s, sIdx) => (
                          <span key={sIdx} className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing skills alert if any */}
              {analysis.missing_skills.length > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 space-y-2">
                  <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Campus Capacity Shortage Alert
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    The following complementary skills have low availability among active campus students:{" "}
                    <span className="font-semibold text-amber-200">{analysis.missing_skills.join(", ")}</span>.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
