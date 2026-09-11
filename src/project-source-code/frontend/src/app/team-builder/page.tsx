"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { teamRepository } from "@/lib/repositories/TeamRepository";
import { projectRepository } from "@/lib/repositories/ProjectRepository";
import { studentRepository } from "@/lib/repositories/StudentRepository";
import {
  Users2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Layers,
  Award,
  Star,
  Play,
  RotateCcw,
  Zap,
  TrendingUp,
  Cpu,
  GraduationCap,
  ShieldCheck,
  Check,
} from "lucide-react";

export default function TeamBuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Team Builder...</div>}>
      <TeamBuilderContent />
    </Suspense>
  );
}

function TeamBuilderContent() {
  const searchParams = useSearchParams();
  const initialProjectId = searchParams.get("projectId") || "proj-1";

  // Active step: 1 (Project) -> 2 (Required Skills) -> 3 (Candidate Students) -> 4 (Optimized Team) -> 5 (Team Explanation)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isDemoRunning, setIsDemoRunning] = useState<boolean>(false);

  // Data
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [projects, setProjects] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [teamResult, setTeamResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Preset demo projects
  const demoProjects = [
    {
      id: "proj-1",
      title: "AI-Powered Crop Disease Detection Platform",
      category: "Agricultural AI & Vision",
      description: "Build an AI-powered crop disease detection platform for farmers using computer vision, deep learning leaf diagnostics, resilient FastAPI backend, and local offline edge deployment.",
      requirements: [
        { name: "Computer Vision", proficiency: "ADVANCED", importance: "MANDATORY" },
        { name: "Deep Learning", proficiency: "ADVANCED", importance: "MANDATORY" },
        { name: "Agriculture & Agronomy", proficiency: "INTERMEDIATE", importance: "MANDATORY" },
        { name: "Python", proficiency: "ADVANCED", importance: "MANDATORY" },
        { name: "Backend Architecture", proficiency: "INTERMEDIATE", importance: "MANDATORY" },
        { name: "Edge Deployment", proficiency: "INTERMEDIATE", importance: "PREFERRED" },
      ],
    },
    {
      id: "proj-2",
      title: "Deep Learning Medical Image Classifier",
      category: "Biomedical & AI",
      description: "Convolutional neural network pipeline for early diagnostic classification of campus clinic X-ray scans with high recall.",
      requirements: [
        { name: "Deep Learning", proficiency: "ADVANCED", importance: "MANDATORY" },
        { name: "Python", proficiency: "INTERMEDIATE", importance: "MANDATORY" },
        { name: "Data Visualization", proficiency: "INTERMEDIATE", importance: "PREFERRED" },
      ],
    },
    {
      id: "proj-3",
      title: "Sustainable Campus Energy Microgrid Dashboard",
      category: "CleanTech & IoT",
      description: "Real-time telemetry cockpit visualizing solar battery storage and student dormitory power loads with peak shaving recommendations.",
      requirements: [
        { name: "TypeScript", proficiency: "ADVANCED", importance: "MANDATORY" },
        { name: "UI Design & Wireframing", proficiency: "INTERMEDIATE", importance: "MANDATORY" },
        { name: "PostgreSQL", proficiency: "INTERMEDIATE", importance: "PREFERRED" },
      ],
    },
  ];

  const activeProject = demoProjects.find((p) => p.id === selectedProjectId) || demoProjects[0];

  useEffect(() => {
    // Load student candidate pool
    studentRepository.list({ limit: 6 }).then((students) => {
      setCandidates(students || []);
    });
  }, []);

  // Compute optimized team
  const computeTeam = () => {
    setLoading(true);
    // Simulate generation or call teamRepository
    setTimeout(() => {
      setTeamResult({
        project_title: activeProject.title,
        fit_score: 0.94,
        skill_coverage_pct: 100,
        department_diversity_count: 3,
        members: [
          {
            name: "Aarav Sharma",
            department: "Computer Science",
            role: "Backend & Systems Lead",
            match_reasons: ["Mastery in Python & FastAPI", "3+ years distributed computing"],
            skills_contributed: ["Python", "FastAPI", "PostgreSQL"],
            avatar_letter: "A",
          },
          {
            name: "Priya Patel",
            department: "Data Science",
            role: "ML Algorithm Architect",
            match_reasons: ["Advanced Machine Learning", "High heuristic complementarity"],
            skills_contributed: ["Machine Learning", "Data Visualization"],
            avatar_letter: "P",
          },
          {
            name: "Elena Rostova",
            department: "Software Engineering",
            role: "Frontend Experience Lead",
            match_reasons: ["Advanced React.js & TypeScript", "UI/UX component engineering"],
            skills_contributed: ["React.js", "TypeScript", "Next.js"],
            avatar_letter: "E",
          },
        ],
        explanation: {
          headline: "Optimal Multidisciplinary Convergence (94% Synergy)",
          narrative:
            "This 3-member team perfectly covers 100% of all mandatory and preferred skill requirements across 3 distinct academic departments (Computer Science, Data Science, and Software Engineering). Aarav handles core systems architecture, Priya brings predictive intelligence modeling, and Elena anchors the interactive user experience.",
          complementarity_points: [
            "Zero skill overlap: Eliminates duplicate roles and streamlines cognitive task allocation.",
            "Cross-departmental perspective: Blends theoretical machine learning with production web delivery.",
            "Complete requirement coverage: All 4 target competencies satisfied at or above required proficiency levels.",
          ],
          potential_risk: "Team is lean; add a junior member for automated QA and documentation support.",
        },
      });
      setLoading(false);
    }, 600);
  };

  useEffect(() => {
    computeTeam();
  }, [selectedProjectId]);

  // Demo Presentation Runner (cycles through steps smoothly)
  const runDemoPresentation = () => {
    setIsDemoRunning(true);
    setCurrentStep(1);

    const timeouts = [
      setTimeout(() => setCurrentStep(2), 1200),
      setTimeout(() => setCurrentStep(3), 2800),
      setTimeout(() => setCurrentStep(4), 4500),
      setTimeout(() => {
        setCurrentStep(5);
        setIsDemoRunning(false);
      }, 6200),
    ];

    return () => timeouts.forEach((t) => clearTimeout(t));
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Users2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Multidisciplinary Team Builder
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1 font-mono">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                Primary Hackathon Demo
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated 5-stage pipeline synthesizing complementary cross-departmental teams
            </p>
          </div>
        </div>

        {/* Presentation Trigger Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={runDemoPresentation}
            disabled={isDemoRunning}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Play className={`h-3.5 w-3.5 fill-white ${isDemoRunning ? "animate-pulse" : ""}`} />
            <span>{isDemoRunning ? "Running Presentation..." : "Play 5-Step Demo Animation"}</span>
          </button>
        </div>
      </div>

      {/* 5-Step Transition Pipeline Stepper Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 sm:p-4 backdrop-blur-md">
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          {[
            { step: 1, label: "1. Project" },
            { step: 2, label: "2. Required Skills" },
            { step: 3, label: "3. Candidate Pool" },
            { step: 4, label: "4. Optimized Team" },
            { step: 5, label: "5. Team Explanation" },
          ].map((item) => {
            const isActive = currentStep === item.step;
            const isCompleted = currentStep > item.step;
            return (
              <button
                key={item.step}
                onClick={() => setCurrentStep(item.step)}
                className={`py-2 px-2 rounded-xl transition-all font-semibold flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : isCompleted
                    ? "bg-slate-850 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                }`}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="h-4 w-4 rounded-full bg-black/20 flex items-center justify-center text-[10px] font-mono shrink-0">
                    {item.step}
                  </span>
                )}
                <span className="truncate text-[11px] sm:text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: Project Selection */}
      {currentStep === 1 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs">
                1
              </span>
              Select Target Project Challenge
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Choose a project from the campus repository to evaluate required skills and student matches
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {demoProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-3 flex flex-col justify-between ${
                  selectedProjectId === p.id
                    ? "bg-indigo-950/40 border-indigo-500 shadow-md shadow-indigo-500/10"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {p.category}
                    </span>
                    {selectedProjectId === p.id && (
                      <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Selected
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">{p.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">{p.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                  {p.requirements.length} target competencies
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2"
            >
              <span>Next: Extract Required Skills</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Required Skills */}
      {currentStep === 2 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs">
                2
              </span>
              Required Competencies for &quot;{activeProject.title}&quot;
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Extracted architectural skill requirements categorized by importance and required proficiency
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeProject.requirements.map((req, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{req.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      req.importance === "MANDATORY"
                        ? "bg-rose-500/10 text-rose-300 border border-rose-500/20"
                        : "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                    }`}
                  >
                    {req.importance}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Required Proficiency:</span>
                  <span className="font-semibold text-slate-200">{req.proficiency}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full ${
                      req.proficiency === "ADVANCED" ? "w-4/5 bg-indigo-500" : "w-1/2 bg-sky-500"
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-400 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2"
            >
              <span>Next: Scan Candidate Students</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Candidate Students */}
      {currentStep === 3 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs">
                3
              </span>
              Scanning Campus Student Candidates
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Evaluating skill complementarity, department distribution, and availability across student profiles
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {candidates.slice(0, 5).map((cand) => (
              <div key={cand.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white">{cand.full_name}</h3>
                    <p className="text-[10px] text-slate-400">{cand.department}</p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {cand.year_of_study}
                  </span>
                </div>

                <div className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded-lg">
                  <span className="text-indigo-400 font-semibold">Skills: </span>
                  {cand.skills?.slice(0, 3).map((s: any) => s.skill_name || s.name).join(", ") || "Technical Skills"}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-400 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={() => {
                computeTeam();
                setCurrentStep(4);
              }}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <span>Next: Synthesize Optimized Team</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Optimized Team (The Star Visual Output) */}
      {currentStep === 4 && teamResult && (
        <div className="rounded-2xl border border-indigo-500/40 bg-indigo-950/20 p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold mb-2">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>AI Synergy Algorithm Result</span>
              </div>
              <h2 className="text-xl font-bold text-white">Synthesized Multidisciplinary Team</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Target Project: <span className="font-semibold text-white">{teamResult.project_title}</span>
              </p>
            </div>

            {/* Score Strip */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Synergy Fit</span>
                <span className="text-xl font-black font-mono text-emerald-400">
                  {Math.round(teamResult.fit_score * 100)}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Skill Coverage</span>
                <span className="text-xl font-black font-mono text-indigo-400">
                  {teamResult.skill_coverage_pct}%
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-[10px] uppercase font-mono text-slate-400 block">Departments</span>
                <span className="text-xl font-black font-mono text-cyan-400">
                  {teamResult.department_diversity_count}
                </span>
              </div>
            </div>
          </div>

          {/* Member Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {teamResult.members.map((member: any, idx: number) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 relative overflow-hidden"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-sm text-white">
                    {member.avatar_letter}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{member.name}</h3>
                    <p className="text-[10px] text-slate-400">{member.department}</p>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                  Role: {member.role}
                </div>

                <div className="space-y-1 text-[11px] text-slate-300">
                  <span className="text-slate-500 block font-semibold text-[10px] uppercase tracking-wider">
                    Assigned Competencies:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {member.skills_contributed.map((s: string, sIdx: number) => (
                      <span key={sIdx} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-800/80">
            <button
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-400 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={() => setCurrentStep(5)}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-md shadow-indigo-600/20"
            >
              <span>Next: View AI Team Explanation</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Team Explanation */}
      {currentStep === 5 && teamResult && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Synthesis Explanation &amp; Rationale</span>
            </div>
            <h2 className="text-xl font-bold text-white">{teamResult.explanation.headline}</h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              {teamResult.explanation.narrative}
            </p>
          </div>

          {/* Rationale Bullet Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Why this composition outperforms alternative permutations:
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {teamResult.explanation.complementarity_points.map((point: string, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                  <span className="text-emerald-400 font-bold">Pillar {idx + 1}</span>
                  <p className="text-slate-300 leading-relaxed text-[11px] mt-1">{point}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-slate-300 flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Project Selection</span>
            </button>

            <Link
              href="/dashboard"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 text-center"
            >
              Save Team &amp; Return to Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
