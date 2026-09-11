"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Users2,
  GitMerge,
  Coins,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Layers,
  GraduationCap,
  Cpu,
  WifiOff,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-600 selection:text-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                AI SKILL <span className="text-indigo-400">EXCHANGE</span>
              </span>
              <span className="hidden sm:block text-[10px] uppercase font-mono tracking-widest text-slate-400">
                Autonomous Campus Protocol
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
            >
              <span>Launch App</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-16 pb-20 px-6 max-w-6xl mx-auto text-center">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6 shadow-sm">
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            <span>National Hackathon Showcase Edition • 100% Offline-Capable</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Break Campus Silos.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400">
              Exchange Skills &amp; Assemble Teams.
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            The autonomous peer learning protocol. Students earn credits teaching what they have mastered, spend credits
            learning new disciplines, and assemble balanced multidisciplinary project teams with AI complementarity matching.
          </p>

          {/* Primary CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all"
            >
              <span>Explore Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/team-builder"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 transition-all"
            >
              <Users2 className="h-4 w-4 text-amber-400" />
              <span>Team Builder Demo</span>
            </Link>

            <Link
              href="/campus-insights"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <BarChart3 className="h-4 w-4 text-indigo-400" />
              <span>Campus Intelligence</span>
            </Link>
          </div>

          {/* Metrics Strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-b border-slate-800/80 py-6">
            <div>
              <div className="text-2xl font-black font-mono text-white">100%</div>
              <div className="text-xs text-slate-400 mt-0.5">Offline-First PWA</div>
            </div>
            <div>
              <div className="text-2xl font-black font-mono text-indigo-400">0.85+</div>
              <div className="text-xs text-slate-400 mt-0.5">Reciprocal Match Precision</div>
            </div>
            <div>
              <div className="text-2xl font-black font-mono text-emerald-400">Server Auth</div>
              <div className="text-xs text-slate-400 mt-0.5">Transparent Credit Ledger</div>
            </div>
            <div>
              <div className="text-2xl font-black font-mono text-sky-400">5-Stage</div>
              <div className="text-xs text-slate-400 mt-0.5">Team Optimization Pipeline</div>
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16 px-6 max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Engineered for Modern University Ecosystems
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              A comprehensive system uniting peer mentoring, project teaming, and institutional analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <GitMerge className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Reciprocal Peer Matching</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Connects students whose teaching capabilities mirror each other&apos;s learning goals. Maximizes mutual benefit
                and schedules peer tutoring sessions across departments.
              </p>
            </div>

            {/* Card 2 - Star */}
            <div className="rounded-2xl border border-indigo-500/40 bg-indigo-950/20 p-6 space-y-3 relative overflow-hidden">
              <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                <Users2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Multidisciplinary Team Builder
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Primary Demo
                </span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Evaluates project requirement skill hierarchies, scans available campus student profiles, and synthesizes
                an optimized team with fit scoring and complementary role rationale.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Coins className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Transparent Credit Ledger</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Skill credits prevent negative balances with strict server-authoritative reconciliation. Students earn credits
                only when verified sessions conclude.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <WifiOff className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Offline-First Architecture</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Full Service Worker and IndexedDB caching. Local NLP analyzer and heuristic matching algorithms ensure the app
                runs seamlessly without an active connection.
              </p>
            </div>

            {/* Card 5 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-sky-600/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Online/Offline Synchronization</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Mutations are queued locally. When reconnected, batch synchronization resolves profile conflicts via
                Last-Write-Wins and enforces server authority on credits.
              </p>
            </div>

            {/* Card 6 */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
              <div className="h-10 w-10 rounded-xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Campus Skill Intelligence</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Anonymized aggregate macro analytics: Skill Demand Index, Supply Index, Skill Shortage Alerts, and narrative
                action items for faculty and administrators.
              </p>
            </div>
          </div>
        </section>

        {/* Demo Persona Quick-Launch Bar for Judges */}
        <section className="py-12 px-6 max-w-4xl mx-auto bg-slate-900/40 rounded-2xl border border-slate-800 p-8 text-center space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Quick-Test Personas for Evaluation</h3>
            <p className="text-xs text-slate-400">
              Select any pre-seeded campus student persona to immediately test matching, team building, and credit exchange.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/dashboard"
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-left transition-all group"
            >
              <p className="text-xs font-bold text-white group-hover:text-indigo-300">Aarav Sharma</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Computer Science • AI &amp; Python</p>
            </Link>

            <Link
              href="/dashboard"
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-left transition-all group"
            >
              <p className="text-xs font-bold text-white group-hover:text-indigo-300">Priya Patel</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Data Science • Machine Learning</p>
            </Link>

            <Link
              href="/dashboard"
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500 text-left transition-all group"
            >
              <p className="text-xs font-bold text-white group-hover:text-indigo-300">Elena Rostova</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Software Engineering • React &amp; Next.js</p>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500">
        <p>AI Skill Exchange • National Hackathon Demonstration Protocol</p>
        <p className="mt-1 text-[11px] text-slate-600">
          Clean • Modern • Intelligent • Professional • Accessible • Fast
        </p>
      </footer>
    </div>
  );
}
