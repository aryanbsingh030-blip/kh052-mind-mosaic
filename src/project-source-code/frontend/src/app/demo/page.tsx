"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Users2,
  Cpu,
  Coins,
  BarChart3,
  WifiOff,
  ArrowRight,
  ShieldAlert,
  GraduationCap,
  Layers,
  ChevronRight,
  Info,
  HelpCircle,
  Award,
  Zap,
  Check,
} from "lucide-react";

export default function HackathonDemoPage() {
  // 10 Canonical Demo Steps:
  // 1: Enter Project Proposal
  // 2: AI Analyzes Project (Agriculture, Computer Vision, Deep Learning, Python, Machine Learning, Backend, Deployment)
  // 3: Show Campus Student Pool
  // 4: AI Generates 3 Candidate Teams
  // 5: Compare Teams (Skill Coverage, Learning Synergy, Experience Balance, Compatibility)
  // 6: Select Optimal Team
  // 7: Click "Why this team?" -> Explainable Breakdown of Every Member's Role
  // 8: Show Skill Credit Relationships
  // 9: Open Campus Insights (High-demand skills, Skill shortages, Available mentors)
  // 10: Turn off Internet -> Show OFFLINE MODE & Run Core Workflow Locally
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [selectedTeamIdx, setSelectedTeamIdx] = useState<number>(0);
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const promptText = "Build an AI-powered crop disease detection platform for farmers.";

  // Step 2 Extracted Skills (Exact match to prompt requirements)
  const extractedSkills = [
    { name: "Agriculture", category: "Domain Knowledge", importance: "MANDATORY", level: "INTERMEDIATE" },
    { name: "Computer Vision", category: "AI & Imaging", importance: "MANDATORY", level: "ADVANCED" },
    { name: "Deep Learning", category: "AI & Neural Networks", importance: "MANDATORY", level: "ADVANCED" },
    { name: "Python", category: "Programming", importance: "MANDATORY", level: "ADVANCED" },
    { name: "Machine Learning", category: "AI & Data Science", importance: "MANDATORY", level: "INTERMEDIATE" },
    { name: "Backend", category: "Software Engineering", importance: "MANDATORY", level: "INTERMEDIATE" },
    { name: "Deployment", category: "DevOps & Cloud", importance: "PREFERRED", level: "INTERMEDIATE" },
  ];

  // Step 3 Campus Student Pool
  const candidatePool = [
    { name: "Priya Patel", dept: "Computer Science", skills: ["Computer Vision", "Deep Learning", "Python"], experience: "3 yrs", match: "98%" },
    { name: "Samuel Ochieng", dept: "Agricultural Sciences", skills: ["Agriculture", "Soil Health", "Crop Diagnostics"], experience: "4 yrs", match: "95%" },
    { name: "Aarav Sharma", dept: "Software Engineering", skills: ["Backend", "FastAPI", "Deployment"], experience: "3.5 yrs", match: "92%" },
    { name: "Elena Rostova", dept: "Data Science", skills: ["Machine Learning", "Python", "Data Pipelines"], experience: "2 yrs", match: "89%" },
    { name: "Marcus Vance", dept: "Electrical Engineering", skills: ["Edge IoT", "Deployment", "Sensors"], experience: "2.5 yrs", match: "84%" },
  ];

  // Step 4 & 5 Candidate Teams
  const candidateTeams = [
    {
      id: "team-a",
      name: "Team Alpha (Synergy Optimal)",
      fitScore: 96,
      skillCoverage: 100,
      learningSynergy: 94,
      experienceBalance: 92,
      compatibility: 95,
      isRecommended: true,
      summary: "Full coverage across Agronomy, Deep Vision, and Cloud Backend with maximal cross-teaching potential.",
      members: [
        {
          name: "Priya Patel",
          dept: "Computer Science",
          role: "Vision & Deep Learning Architect",
          rationale: "Engineered convolutional neural networks for visual defect detection; covers Computer Vision, Deep Learning, and Python.",
          credits: 140,
        },
        {
          name: "Samuel Ochieng",
          dept: "Agricultural Sciences",
          role: "Agronomy & Validation Lead",
          rationale: "4th-year agronomy researcher specializing in leaf blight pathology and farmer usability workflows; covers Agriculture.",
          credits: 180,
        },
        {
          name: "Aarav Sharma",
          dept: "Software Engineering",
          role: "Backend & Edge Deployment Lead",
          rationale: "Mastery of FastAPI, containerization, and low-latency API delivery in low-connectivity rural settings; covers Backend & Deployment.",
          credits: 135,
        },
      ],
    },
    {
      id: "team-b",
      name: "Team Beta (Research Focused)",
      fitScore: 88,
      skillCoverage: 86,
      learningSynergy: 89,
      experienceBalance: 78,
      compatibility: 84,
      isRecommended: false,
      summary: "High algorithmic depth in AI and data modeling, but lacks hands-on agricultural field trial experience.",
      members: [
        { name: "Priya Patel", dept: "Computer Science", role: "CV Research", rationale: "Lead on neural architecture and loss functions.", credits: 140 },
        { name: "Elena Rostova", dept: "Data Science", role: "ML Data Engineer", rationale: "Dataset augmentation, pre-processing, and evaluation metrics.", credits: 110 },
        { name: "Marcus Vance", dept: "Electrical Eng.", role: "Camera Telemetry", rationale: "Edge sensors, hardware camera drivers, and optics.", credits: 95 },
      ],
    },
    {
      id: "team-c",
      name: "Team Gamma (Rapid Prototyping)",
      fitScore: 82,
      skillCoverage: 80,
      learningSynergy: 76,
      experienceBalance: 88,
      compatibility: 79,
      isRecommended: false,
      summary: "Fast full-stack delivery with basic heuristic detection, requiring external consulting for precision agronomy.",
      members: [
        { name: "Aarav Sharma", dept: "Software Eng.", role: "Full-Stack Backend", rationale: "Fast REST endpoints, SQLite caching, and WebSockets.", credits: 135 },
        { name: "Elena Rostova", dept: "Data Science", role: "Model Inference", rationale: "Classical scikit-learn classifiers and OpenCV filters.", credits: 110 },
        { name: "Samuel Ochieng", dept: "Agriculture", role: "Domain Advisor", rationale: "Field validation partner and test crop supplier.", credits: 180 },
      ],
    },
  ];

  const optimalTeam = candidateTeams[selectedTeamIdx];

  // Auto-play timer for judges (transitions step every 4.5s)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isAutoPlaying && activeStep < 10) {
      timer = setTimeout(() => {
        setActiveStep((prev) => {
          const next = prev + 1;
          if (next === 10) setIsOfflineSimulated(true);
          return next;
        });
      }, 4500);
    } else if (activeStep >= 10) {
      setIsAutoPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isAutoPlaying, activeStep]);

  const resetDemo = async () => {
    setActiveStep(1);
    setSelectedTeamIdx(0);
    setIsAutoPlaying(false);
    setIsOfflineSimulated(false);
    try {
      await fetch("/api/demo/reset", { method: "POST" });
    } catch {
      // Offline fallback
    }
    setResetNotice("Demo dataset reset to canonical baseline");
    setTimeout(() => setResetNotice(null), 3500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header with Judge Cockpit & Reset */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" />
              STAGE 14: HACKATHON DEMONSTRATION MODE
            </span>
            {isOfflineSimulated && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                <WifiOff className="h-3 w-3" /> OFFLINE MODE
              </span>
            )}
            {resetNotice && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Check className="h-3 w-3" /> {resetNotice}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            AI Skill Exchange <span className="text-indigo-400">3-Minute Judge Demo</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Controlled, deterministic walkthrough demonstrating end-to-end multidisciplinary team synthesis, explainable AI, credit economy, and zero-internet resilience.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap z-10">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
              isAutoPlaying
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
            }`}
          >
            <Play className="h-4 w-4" />
            <span>{isAutoPlaying ? "Pause Auto-Run" : "Auto-Run 3-Min Walkthrough"}</span>
          </button>

          <button
            onClick={resetDemo}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-all"
            title="Reset dataset to initial state"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>

      {/* 10-Step Timeline Ribbon */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center min-w-max gap-1 p-2 bg-slate-950/80 rounded-2xl border border-slate-800">
          {[
            "1. Concept Input",
            "2. AI Decomposition",
            "3. Campus Pool",
            "4. 3 Candidate Teams",
            "5. Compare Teams",
            "6. Select Team",
            "7. Why This Team?",
            "8. Credit Economy",
            "9. Campus Insights",
            "10. Offline Mode",
          ].map((label, idx) => {
            const stepNum = idx + 1;
            const isCurrent = activeStep === stepNum;
            const isCompleted = activeStep > stepNum;
            return (
              <button
                key={stepNum}
                onClick={() => {
                  setActiveStep(stepNum);
                  if (stepNum === 10) setIsOfflineSimulated(true);
                  else setIsOfflineSimulated(false);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isCurrent
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105 font-bold"
                    : isCompleted
                    ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <span>{stepNum}.</span>}
                <span>{label.replace(/^\d+\.\s*/, "")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Stage Container */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
        {/* STEP 1: Enter Project Concept */}
        {activeStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                STEP 1 / 10 — NATURAL LANGUAGE CONCEPT INPUT
              </span>
              <h2 className="text-2xl font-bold text-white">Enter Campus Innovation Challenge</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Judges or hackathon participants enter any unstructured concept or challenge description:
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                  Target Project Proposal
                </label>
                <span className="text-[10px] text-indigo-400 font-mono">Unstructured Text</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900/90 text-base font-medium text-emerald-300 border border-slate-800 font-mono shadow-inner">
                &ldquo;{promptText}&rdquo;
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveStep(2)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
              >
                <span>Trigger AI Project Analysis</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: AI Analyzes Project */}
        {activeStep === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                STEP 2 / 10 — AI MULTIDISCIPLINARY DECOMPOSITION
              </span>
              <h2 className="text-2xl font-bold text-white">Extracted Skill Requirements</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                The NLP pipeline analyzes the proposal and identifies core multidisciplinary domain and technical capabilities:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {extractedSkills.map((s, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 hover:border-indigo-500/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-500/20">
                      {s.category}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      s.importance === "MANDATORY" ? "text-rose-400 bg-rose-950/40" : "text-amber-400 bg-amber-950/40"
                    }`}>
                      {s.importance}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">{s.name}</h3>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Proficiency:</span>
                    <span className="font-semibold text-slate-200">{s.level}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button onClick={() => setActiveStep(1)} className="text-xs text-slate-400 hover:text-white">
                Back to Input
              </button>
              <button
                onClick={() => setActiveStep(3)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/25"
              >
                <span>Show Campus Student Pool</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Campus Student Pool */}
        {activeStep === 3 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                STEP 3 / 10 — CAMPUS STUDENT POOL SCANNING
              </span>
              <h2 className="text-2xl font-bold text-white">Campus Student Pool (32 Profiles Evaluated)</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Cross-department evaluation matching student verified skills, peer tutoring history, and schedule availability:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {candidatePool.map((c, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-white">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{c.name}</h4>
                        <p className="text-[10px] text-slate-400">{c.dept}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {c.match} Match
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Verified Capabilities:</span>
                    <div className="flex flex-wrap gap-1">
                      {c.skills.map((sk, sIdx) => (
                        <span key={sIdx} className="text-[10px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button onClick={() => setActiveStep(2)} className="text-xs text-slate-400 hover:text-white">
                Back to Skills
              </button>
              <button
                onClick={() => setActiveStep(4)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/25"
              >
                <span>AI Generates 3 Candidate Teams</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: AI Generates 3 Candidate Teams */}
        {activeStep === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                STEP 4 / 10 — CANDIDATE TEAMS SYNTHESIS
              </span>
              <h2 className="text-2xl font-bold text-white">AI Generates 3 Candidate Teams</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                The multi-objective optimizer explores team combinations balancing domain coverage, learning synergy, and experience:
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {candidateTeams.map((team, idx) => (
                <div key={team.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{team.name}</h3>
                    {team.isRecommended && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{team.summary}</p>
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Team Members:</span>
                    <div className="space-y-1.5">
                      {team.members.map((m, mIdx) => (
                        <div key={mIdx} className="text-xs flex items-center justify-between text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-850">
                          <span className="font-semibold">{m.name}</span>
                          <span className="text-[10px] text-indigo-400">{m.dept}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button onClick={() => setActiveStep(3)} className="text-xs text-slate-400 hover:text-white">
                Back to Student Pool
              </button>
              <button
                onClick={() => setActiveStep(5)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/25"
              >
                <span>Compare Teams (Step 5)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Compare Teams */}
        {activeStep === 5 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                STEP 5 / 10 — MULTI-CRITERIA COMPARISON
              </span>
              <h2 className="text-2xl font-bold text-white">Compare Teams</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Evaluation across Skill Coverage, Learning Synergy, Experience Balance, and Compatibility:
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {candidateTeams.map((team, idx) => (
                <div key={team.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{team.name}</h3>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {team.fitScore}% Fit
                    </span>
                  </div>

                  <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-medium">Skill Coverage:</span>
                      <span className="font-bold text-emerald-400">{team.skillCoverage}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${team.skillCoverage}%` }} />
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-400 font-medium">Learning Synergy:</span>
                      <span className="font-bold text-indigo-400">{team.learningSynergy}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${team.learningSynergy}%` }} />
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-400 font-medium">Experience Balance:</span>
                      <span className="font-bold text-slate-200">{team.experienceBalance}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-slate-400 h-full rounded-full" style={{ width: `${team.experienceBalance}%` }} />
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="text-slate-400 font-medium">Compatibility:</span>
                      <span className="font-bold text-sky-400">{team.compatibility}%</span>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-sky-400 h-full rounded-full" style={{ width: `${team.compatibility}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button onClick={() => setActiveStep(4)} className="text-xs text-slate-400 hover:text-white">
                Back to Candidate Teams
              </button>
              <button
                onClick={() => setActiveStep(6)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/25"
              >
                <span>Select Optimal Team (Step 6)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Select Optimal Team */}
        {activeStep === 6 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                STEP 6 / 10 — SELECT THE OPTIMAL TEAM
              </span>
              <h2 className="text-2xl font-bold text-white">Select the Optimal Team</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Choose the team to deploy. Team Alpha is algorithmically identified as the highest-scoring candidate:
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {candidateTeams.map((team, idx) => {
                const isSelected = selectedTeamIdx === idx;
                return (
                  <div
                    key={team.id}
                    onClick={() => setSelectedTeamIdx(idx)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? "bg-slate-950 border-indigo-500 ring-2 ring-indigo-500/50 shadow-xl shadow-indigo-500/20"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{team.name}</span>
                      {team.isRecommended && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Optimal
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-300">Overall Fit: <strong className="text-emerald-400">{team.fitScore}%</strong></div>
                    <div className="text-xs text-slate-400">Skill Coverage: <strong className="text-white">{team.skillCoverage}%</strong></div>
                  </div>
                );
              })}
            </div>

            {/* Optimal Team Selected Spotlight */}
            <div className="p-6 rounded-2xl bg-indigo-950/30 border border-indigo-500/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Optimal Selection Active
                  </span>
                  <h3 className="text-lg font-bold text-white">{optimalTeam.name} — {optimalTeam.fitScore}% Fit Score</h3>
                  <p className="text-xs text-slate-300">{optimalTeam.summary}</p>
                </div>

                <button
                  onClick={() => setActiveStep(7)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all self-start sm:self-auto"
                >
                  <HelpCircle className="h-4 w-4" />
                  <span>Why this team?</span>
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button onClick={() => setActiveStep(5)} className="text-xs text-slate-400 hover:text-white">
                Back to Comparison
              </button>
              <button
                onClick={() => setActiveStep(7)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/25"
              >
                <span>Click &ldquo;Why this team?&rdquo; (Step 7)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 7: "Why this team?" Explainable Breakdown */}
        {activeStep === 7 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                  STEP 7 / 10 — EXPLAINABLE AI BREAKDOWN
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Fit Score: {optimalTeam.fitScore}%
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                Why this team?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Explainable breakdown of every member&apos;s role and how their capabilities eliminate technical bottlenecks:
              </p>
            </div>

            <div className="space-y-4">
              {optimalTeam.members.map((m, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-850 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-indigo-600/30">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{m.name}</h4>
                        <p className="text-xs text-indigo-400 font-medium">{m.role} • {m.dept}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400 bg-amber-950/40 px-3 py-1 rounded-full border border-amber-500/30">
                        {m.credits} Skill Credits
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    <span className="font-semibold text-emerald-400">Role &amp; Synergy Rationale: </span>
                    {m.rationale}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button onClick={() => setActiveStep(6)} className="text-xs text-slate-400 hover:text-white">
                Back to Team Selection
              </button>
              <button
                onClick={() => setActiveStep(8)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/25"
              >
                <span>Show Skill Credit Relationships (Step 8)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 8: Show Skill Credit Relationships */}
        {activeStep === 8 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                STEP 8 / 10 — SKILL CREDIT RELATIONSHIPS
              </span>
              <h2 className="text-2xl font-bold text-white">Skill Credit Relationships</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Transparent credit incentive flow: Students spend credits to receive mentoring and earn credits by tutoring:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                  <Coins className="h-4 w-4 text-amber-400" />
                  Peer Exchange Transaction Flow
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>Samuel Ochieng (Agronomy) → Priya Patel (CV)</span>
                    <span className="text-emerald-400 font-bold">+15 Credits (Reward)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span>Priya Patel → Samuel Ochieng</span>
                    <span className="text-rose-400 font-bold">-15 Credits (Learn Cost)</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Anti-Abuse Ledger Safeguards
                </h4>
                <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>Negative balances strictly prohibited unless authorized.</li>
                  <li>Max transfer velocity limit: 500 credits / transaction.</li>
                  <li>Self-transfers strictly rejected with HTTP 400.</li>
                  <li>Credits awarded strictly after completed &amp; verified sessions.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button onClick={() => setActiveStep(7)} className="text-xs text-slate-400 hover:text-white">
                Back to Why This Team
              </button>
              <button
                onClick={() => setActiveStep(9)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/25"
              >
                <span>Open Campus Insights (Step 9)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 9: Open Campus Insights */}
        {activeStep === 9 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-widest">
                STEP 9 / 10 — CAMPUS SKILL INTELLIGENCE
              </span>
              <h2 className="text-2xl font-bold text-white">Campus Insights</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Anonymized aggregated intelligence for campus students and faculty:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4" /> High-Demand Skills
                </span>
                <p className="text-lg font-black text-white">Computer Vision &amp; AI</p>
                <p className="text-xs text-slate-400">Most requested skill category across CS and Engineering.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4" /> Skill Shortages
                </span>
                <p className="text-lg font-black text-white">Computer Vision Gap</p>
                <p className="text-xs text-slate-400">37 students want to learn, only 8 available to teach.</p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4" /> Available Mentors
                </span>
                <p className="text-lg font-black text-white">24 Active Mentors</p>
                <p className="text-xs text-slate-400">Verified student tutors offering weekly session slots.</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button onClick={() => setActiveStep(8)} className="text-xs text-slate-400 hover:text-white">
                Back to Credit Relationships
              </button>
              <button
                onClick={() => {
                  setActiveStep(10);
                  setIsOfflineSimulated(true);
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 shadow-lg shadow-amber-600/25"
              >
                <span>Turn off Internet &amp; Verify Offline (Step 10)</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 10: Turn off Internet / OFFLINE MODE */}
        {activeStep === 10 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                  STEP 10 / 10 — ZERO-INTERNET RESILIENCE
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <WifiOff className="h-3.5 w-3.5 text-amber-400" /> OFFLINE MODE
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white">Run the Same Core Workflow Locally</h2>
              <p className="text-xs sm:text-sm text-slate-400">
                The entire workflow executes deterministically without internet connectivity using client IndexedDB storage:
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                <WifiOff className="h-4 w-4 text-amber-400" />
                Network Disconnected Verification
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Even when disconnected from the internet, AI Skill Exchange continues to:
              </p>
              <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
                <li>Load cached student profiles and skills from browser IndexedDB storage.</li>
                <li>Execute local AI skill extraction and project decomposition.</li>
                <li>Calculate reciprocal matches and 5-step team optimization with zero latency.</li>
                <li>Queue pending operations in the sync engine for automatic background synchronization when online.</li>
              </ul>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button onClick={() => setActiveStep(9)} className="text-xs text-slate-400 hover:text-white">
                Back to Campus Insights
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={resetDemo}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Restart 3-Min Demo</span>
                </button>
                <Link
                  href="/dashboard"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20"
                >
                  Enter Main Platform
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
