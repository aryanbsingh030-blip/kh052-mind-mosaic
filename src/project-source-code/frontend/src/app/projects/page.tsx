"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { projectRepository, ProjectItem } from "@/lib/repositories/ProjectRepository";
import { StateCard } from "@/components/ui/StateCard";
import {
  FolderGit2,
  Plus,
  Users2,
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Layers,
} from "lucide-react";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectRepository.list({
        search: searchQuery || undefined,
        category: categoryFilter !== "ALL" ? categoryFilter : undefined,
      });
      setProjects(data || []);
    } catch (err) {
      console.warn("Project list load warning:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <FolderGit2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Campus Project Directory
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                Multidisciplinary
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Explore ongoing builds or initiate an AI-optimized multidisciplinary team assembly
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/team-builder"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-850 text-slate-200 border border-slate-800 transition-all"
          >
            <Users2 className="h-4 w-4 text-amber-400" />
            <span>Open Team Builder</span>
          </Link>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create Project</span>
          </Link>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search projects by title, stack, or problem statement..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs shrink-0 w-full sm:w-auto overflow-x-auto">
          {["ALL", "Computer Science", "Artificial Intelligence", "Engineering", "Design"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 ${
                categoryFilter === cat
                  ? "bg-slate-850 text-indigo-300 border border-indigo-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Project Cards */}
      {loading ? (
        <StateCard type="loading" title="Loading Campus Projects..." />
      ) : projects.length === 0 ? (
        <StateCard
          type="empty"
          title="No Projects Found"
          description="No projects match your current search or category filter."
          actionText="Create New Project"
          onAction={() => (window.location.href = "/projects/new")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 flex flex-col justify-between hover:border-slate-750 transition-all group"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {project.title}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 mt-1 inline-block">
                      {project.category}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                    <Users2 className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Max {project.max_members || 4}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{project.description}</p>

                {/* Required Skills Chips */}
                {project.requirements && project.requirements.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {project.requirements.slice(0, 4).map((req: any, rIdx: number) => (
                      <span
                        key={rIdx}
                        className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-mono"
                      >
                        {req.skill_name || req.name || "Skill"}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <Link
                  href={`/project-intelligence?projectId=${project.id}`}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1"
                >
                  <span>Analyze Graph</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>

                <Link
                  href={`/team-builder?projectId=${project.id}`}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 flex items-center gap-1.5 transition-all"
                >
                  <Users2 className="h-3.5 w-3.5 text-amber-400" />
                  <span>Assemble Team</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
