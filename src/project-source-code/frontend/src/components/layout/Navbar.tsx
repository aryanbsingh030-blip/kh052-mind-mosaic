"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import {
  Coins,
  UserCheck,
  Sparkles,
  GraduationCap,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Menu,
  X,
  LayoutDashboard,
  Layers,
  GitMerge,
  Users2,
  FolderGit2,
  Cpu,
  BarChart3,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { profile, user, seedProfiles, switchStudent, loading } = useAuth();
  const { isOffline, syncStatus, syncQueueCount } = useOffline();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/skills", label: "My Skills", icon: Layers },
    { href: "/skill-analyzer", label: "Skill Analyzer", icon: Sparkles },
    { href: "/learn", label: "Learn (Matches)", icon: GitMerge },
    { href: "/teach", label: "Teach (Sessions)", icon: GraduationCap },
    { href: "/credits", label: "Skill Credits", icon: Coins },
    { href: "/projects", label: "Projects", icon: FolderGit2 },
    { href: "/project-intelligence", label: "Project Intelligence", icon: Cpu },
    { href: "/demo", label: "3-Min Demo Mode", icon: Sparkles },
    { href: "/team-builder", label: "Team Builder", icon: Users2 },
    { href: "/campus-insights", label: "Campus Insights", icon: BarChart3 },
    { href: "/sync-debug", label: "Sync Workbench", icon: RefreshCw },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Mobile Toggle */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-colors"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
                AI SKILL <span className="text-indigo-400">EXCHANGE</span>
              </span>
              <span className="hidden sm:block text-[10px] uppercase font-mono tracking-widest text-slate-400">
                Campus Intelligence Network
              </span>
            </div>
          </Link>

          {/* Dynamic Sync Status Indicator (Stage 10) */}
          <Link
            href="/sync-debug"
            className="flex items-center transition-all group"
            title="Open Sync Debug & Workbench"
          >
            {isOffline ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-md shadow-amber-500/10 hover:bg-amber-950/40">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <WifiOff className="h-3.5 w-3.5 text-amber-400" />
                <span className="tracking-wide hidden xs:inline">OFFLINE</span>
                {syncQueueCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-[10px] text-amber-200 border border-amber-500/30">
                    {syncQueueCount}
                  </span>
                )}
              </div>
            ) : syncStatus === "SYNCING" ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/40 text-sky-300 text-xs font-semibold shadow-md shadow-sky-500/10">
                <RefreshCw className="h-3.5 w-3.5 text-sky-400 animate-spin" />
                <span className="tracking-wide hidden xs:inline">Syncing</span>
              </div>
            ) : syncStatus === "SYNC_FAILED" ? (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-semibold shadow-md shadow-rose-500/10 hover:bg-rose-900/40">
                <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                <span className="tracking-wide hidden xs:inline">Sync failed</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/60 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-950/30 hover:border-emerald-500/50">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Synced</span>
              </div>
            )}
          </Link>
        </div>

        {/* Right side: Seed Switcher & User Profile Pill */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Quick Seed Student Switcher */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="seed-switcher"
              className="hidden lg:flex items-center gap-1 text-xs text-slate-400 font-medium"
            >
              <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
              Persona:
            </label>
            <select
              id="seed-switcher"
              value={profile?.id || ""}
              onChange={(e) => switchStudent(e.target.value)}
              disabled={loading}
              className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[130px] sm:max-w-[200px] truncate"
            >
              {seedProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.department.split(" ")[0]})
                </option>
              ))}
            </select>
          </div>

          {/* Skill Credit Balance Badge */}
          {profile && (
            <Link
              href="/credits"
              className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all cursor-pointer shadow-sm shadow-amber-500/10 shrink-0"
              title="View Skill Credit Economy & Ledger"
            >
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>{profile.credit_balance}</span>
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-amber-500/80">
                Credits
              </span>
            </Link>
          )}

          {/* Profile pill */}
          {profile ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/90 py-1 pl-1 pr-3 hover:border-slate-700 hover:bg-slate-800 transition-all"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-xs font-bold text-white uppercase">
                {profile.full_name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left leading-none">
                <p className="text-xs font-semibold text-white truncate max-w-[100px]">
                  {profile.full_name.split(" ")[0]}
                </p>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <GraduationCap className="h-4 w-4 text-slate-500" />
              <span>Connecting...</span>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/95 p-4 space-y-1 animate-in slide-in-from-top-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
