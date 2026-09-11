"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Sparkles,
  GitMerge,
  GraduationCap,
  Coins,
  FolderGit2,
  Cpu,
  Users2,
  BarChart3,
  RefreshCw,
  Settings,
  Star,
} from "lucide-react";

interface NavGroup {
  title: string;
  items: Array<{
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
    isPrimaryDemo?: boolean;
  }>;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navGroups: NavGroup[] = [
    {
      title: "Core Hub",
      items: [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { href: "/skills", label: "My Skills", icon: Layers },
        { href: "/skill-analyzer", label: "Skill Analyzer", icon: Sparkles, badge: "NLP" },
      ],
    },
    {
      title: "P2P Exchange",
      items: [
        { href: "/learn", label: "Learn (Matches)", icon: GitMerge },
        { href: "/teach", label: "Teach (Sessions)", icon: GraduationCap },
        { href: "/credits", label: "Skill Credits", icon: Coins, badge: "Stage 7" },
      ],
    },
    {
      title: "Collaboration",
      items: [
        { href: "/projects", label: "Projects", icon: FolderGit2 },
        { href: "/project-intelligence", label: "Project Intelligence", icon: Cpu, badge: "Graph" },
        {
          href: "/team-builder",
          label: "Team Builder",
          icon: Users2,
          badge: "Demo Star",
          isPrimaryDemo: true,
        },
      ],
    },
    {
      title: "Intelligence & System",
      items: [
        { href: "/campus-insights", label: "Campus Insights", icon: BarChart3, badge: "Stage 8" },
        { href: "/sync-debug", label: "Sync Workbench", icon: RefreshCw, badge: "Stage 10" },
        { href: "/settings", label: "Settings & Cache", icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className="w-64 shrink-0 border-r border-slate-800 bg-slate-950 p-4 min-h-[calc(100vh-4rem)] flex flex-col justify-between"
      aria-label="Application Navigation"
    >
      <div className="space-y-6">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx}>
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {group.title}
            </div>
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition-all group ${
                      isActive
                        ? item.isPrimaryDemo
                          ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-bold"
                          : "bg-slate-900 text-indigo-300 border border-indigo-500/20 font-bold"
                        : item.isPrimaryDemo
                        ? "text-slate-200 hover:bg-slate-900/80 hover:text-white"
                        : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`h-4 w-4 ${
                          isActive
                            ? "text-indigo-400"
                            : item.isPrimaryDemo
                            ? "text-amber-400"
                            : "text-slate-400 group-hover:text-slate-300"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono tracking-tight ${
                          item.isPrimaryDemo
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-0.5"
                            : isActive
                            ? "bg-indigo-500/20 text-indigo-300"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {item.isPrimaryDemo && <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />}
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer link to Landing / Help */}
      <div className="pt-4 border-t border-slate-800/80 mt-4">
        <Link
          href="/"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
        >
          <span>Product Overview</span>
          <span className="font-mono text-[10px] text-slate-400">v1.1</span>
        </Link>
      </div>
    </aside>
  );
};
