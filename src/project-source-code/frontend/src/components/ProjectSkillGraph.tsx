"use client";

import React, { useState, useMemo } from "react";
import {
  ProjectSkillGraphData,
  ProjectGraphNode,
  ProjectGraphEdge,
} from "@/lib/api";
import { Sparkles, Layers, ShieldCheck, Star, Info, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";

interface ProjectSkillGraphProps {
  data: ProjectSkillGraphData;
  projectTitle: string;
  domainLabel: string;
  onSelectSkill?: (skillName: string) => void;
}

export const ProjectSkillGraph: React.FC<ProjectSkillGraphProps> = ({
  data,
  projectTitle,
  domainLabel,
  onSelectSkill,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "MANDATORY_ONLY" | "DOMAINS_ONLY">("ALL");
  const [zoom, setZoom] = useState<number>(1);

  // SVG Canvas dimensions
  const width = 860;
  const height = 540;
  const centerX = width / 2;
  const centerY = height / 2;

  // Filter nodes according to selected view
  const visibleNodes = useMemo(() => {
    if (filterType === "MANDATORY_ONLY") {
      return data.nodes.filter(
        (n) => n.node_type === "project" || n.node_type === "domain" || n.importance === "MANDATORY"
      );
    }
    if (filterType === "DOMAINS_ONLY") {
      return data.nodes.filter((n) => n.node_type === "project" || n.node_type === "domain");
    }
    return data.nodes;
  }, [data.nodes, filterType]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);

  // Compute deterministic coordinates for nodes (Radial Layout)
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number; radius: number; color: string }> = {};

    const hub = data.nodes.find((n) => n.node_type === "project");
    const domainNodes = data.nodes.filter((n) => n.node_type === "domain");
    const skillNodes = data.nodes.filter((n) => n.node_type === "skill");

    // Center Hub
    if (hub) {
      positions[hub.id] = {
        x: centerX,
        y: centerY,
        radius: 36,
        color: "#6366f1", // Indigo 500
      };
    }

    // Domain nodes on Inner Orbit (radius ~135)
    const domainRadius = 135;
    domainNodes.forEach((node, idx) => {
      const angle = (idx / Math.max(domainNodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
      positions[node.id] = {
        x: centerX + domainRadius * Math.cos(angle),
        y: centerY + domainRadius * Math.sin(angle),
        radius: 26,
        color: "#059669", // Emerald 600
      };
    });

    // Skill nodes on Outer Orbit (radius ~220 - 240)
    const skillRadius = 230;
    skillNodes.forEach((node, idx) => {
      // Offset angle to distribute smoothly
      const angle = (idx / Math.max(skillNodes.length, 1)) * 2 * Math.PI - Math.PI / 2 + 0.15;
      const centralityBoost = Math.round((node.centrality || 0.5) * 12);
      const isMandatory = node.importance === "MANDATORY";

      positions[node.id] = {
        x: centerX + skillRadius * Math.cos(angle),
        y: centerY + skillRadius * Math.sin(angle),
        radius: 18 + centralityBoost,
        color: isMandatory ? "#4f46e5" : "#d97706", // Indigo vs Amber
      };
    });

    return positions;
  }, [data.nodes, centerX, centerY]);

  // Active connected node IDs for highlighting
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId && !selectedNodeId) return null;
    const targetId = hoveredNodeId || selectedNodeId;
    const connected = new Set<string>([targetId!]);
    data.edges.forEach((e) => {
      if (e.source === targetId) connected.add(e.target);
      if (e.target === targetId) connected.add(e.source);
    });
    return connected;
  }, [hoveredNodeId, selectedNodeId, data.edges]);

  // Find active node object
  const activeNode = useMemo(() => {
    const id = selectedNodeId || hoveredNodeId;
    return data.nodes.find((n) => n.id === id) || null;
  }, [selectedNodeId, hoveredNodeId, data.nodes]);

  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-800 bg-slate-950/70 backdrop-blur-xl shadow-2xl overflow-hidden">
      {/* Header controls bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 px-5 py-3.5 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              NetworkX Skill Topology Graph
              <span className="rounded-md bg-indigo-950 border border-indigo-700/40 px-2 py-0.5 text-[10px] font-mono text-indigo-300">
                {data.nodes.length} Nodes &bull; {data.edges.length} Edges
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Interactive structural dependencies, domain orbits, and centrality hierarchy
            </p>
          </div>
        </div>

        {/* View toggles */}
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterType === "ALL"
                  ? "bg-indigo-600 text-white font-semibold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType("MANDATORY_ONLY")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterType === "MANDATORY_ONLY"
                  ? "bg-indigo-600 text-white font-semibold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Mandatory Only
            </button>
            <button
              onClick={() => setFilterType("DOMAINS_ONLY")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                filterType === "DOMAINS_ONLY"
                  ? "bg-indigo-600 text-white font-semibold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Domains
            </button>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={() => setZoom((z) => Math.min(1.4, z + 0.1))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.1))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setSelectedNodeId(null);
                setHoveredNodeId(null);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Reset view"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/70 to-slate-950 flex items-center justify-center min-h-[460px]">
        {/* Background Grid Accent */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-30 pointer-events-none" />

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full max-h-[540px] select-none transition-transform duration-300 ease-out"
          style={{ transform: `scale(${zoom})` }}
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            <linearGradient id="domainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            <linearGradient id="mandatoryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4338ca" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>

            <linearGradient id="preferredGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Orbit Guide Rings */}
          <circle
            cx={centerX}
            cy={centerY}
            r={135}
            fill="none"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="opacity-40"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={230}
            fill="none"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeDasharray="6 6"
            className="opacity-30"
          />

          {/* Edges Layer */}
          <g className="edges">
            {data.edges.map((edge, idx) => {
              const src = nodePositions[edge.source];
              const tgt = nodePositions[edge.target];
              if (!src || !tgt) return null;
              if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) return null;

              const isConnected =
                connectedNodeIds === null ||
                (connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target));

              let strokeColor = "#334155";
              let strokeWidth = 1.2;
              let strokeDash: string | undefined = undefined;

              if (edge.relation === "belongs_to_domain") {
                strokeColor = "#10b981";
                strokeWidth = 2.0;
              } else if (edge.relation === "requires_skill") {
                strokeColor = edge.weight >= 0.9 ? "#6366f1" : "#475569";
                strokeWidth = edge.weight >= 0.9 ? 1.8 : 1.2;
              } else if (edge.relation === "hierarchical_synergy") {
                strokeColor = "#f59e0b";
                strokeWidth = 1.4;
                strokeDash = "3 3";
              }

              return (
                <line
                  key={`${edge.source}-${edge.target}-${idx}`}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDash}
                  className={`transition-opacity duration-200 ${
                    isConnected ? "opacity-90" : "opacity-15"
                  }`}
                />
              );
            })}
          </g>

          {/* Nodes Layer */}
          <g className="nodes">
            {visibleNodes.map((node) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;

              const isHovered = hoveredNodeId === node.id;
              const isSelected = selectedNodeId === node.id;
              const isConnected = connectedNodeIds === null || connectedNodeIds.has(node.id);

              const isHub = node.node_type === "project";
              const isDomain = node.node_type === "domain";
              const isMandatory = node.importance === "MANDATORY";

              let fillGrad = "url(#mandatoryGrad)";
              if (isHub) fillGrad = "url(#hubGrad)";
              else if (isDomain) fillGrad = "url(#domainGrad)";
              else if (!isMandatory) fillGrad = "url(#preferredGrad)";

              const r = isHovered || isSelected ? pos.radius * 1.15 : pos.radius;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => {
                    setSelectedNodeId(node.id === selectedNodeId ? null : node.id);
                    if (node.node_type === "skill" && onSelectSkill) {
                      onSelectSkill(node.label);
                    }
                  }}
                  className={`cursor-pointer transition-transform duration-200 ${
                    isConnected ? "opacity-100" : "opacity-25"
                  }`}
                >
                  {/* Outer Glow on hover or selected */}
                  {(isHovered || isSelected || isHub) && (
                    <circle
                      r={r + 6}
                      fill="none"
                      stroke={pos.color}
                      strokeWidth="2"
                      className="animate-pulse opacity-70"
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r={r}
                    fill={fillGrad}
                    stroke="#ffffff"
                    strokeWidth={isHovered || isSelected ? 2.5 : 1.2}
                    filter={isHub ? "url(#glow)" : undefined}
                    className="shadow-lg"
                  />

                  {/* Icon or Type Indicator */}
                  {isHub ? (
                    <Sparkles className="h-6 w-6 text-white" x="-12" y="-12" />
                  ) : isDomain ? (
                    <ShieldCheck className="h-4 w-4 text-white" x="-8" y="-8" />
                  ) : isMandatory ? (
                    <Star className="h-3.5 w-3.5 text-white" x="-7" y="-7" />
                  ) : (
                    <Layers className="h-3.5 w-3.5 text-amber-200" x="-7" y="-7" />
                  )}

                  {/* Text Label Pill */}
                  <g transform={`translate(0, ${r + 14})`}>
                    <rect
                      x={-Math.min(node.label.length * 4.2 + 8, 90)}
                      y="-9"
                      width={Math.min(node.label.length * 8.4 + 16, 180)}
                      height="18"
                      rx="9"
                      fill="#020617"
                      fillOpacity="0.85"
                      stroke={isHovered || isSelected ? pos.color : "#1e293b"}
                      strokeWidth="1"
                    />
                    <text
                      textAnchor="middle"
                      y="3.5"
                      fill={isHovered || isSelected ? "#ffffff" : "#cbd5e1"}
                      fontSize={isHub ? "11" : "9.5"}
                      fontWeight={isHovered || isSelected ? "700" : "500"}
                      className="font-sans"
                    >
                      {node.label.length > 22 ? `${node.label.slice(0, 20)}…` : node.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Selected / Hovered Node Inspector Drawer */}
        {activeNode && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-xs rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md p-3.5 shadow-2xl z-10 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    activeNode.node_type === "project"
                      ? "bg-indigo-500/20 text-indigo-300"
                      : activeNode.node_type === "domain"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : activeNode.importance === "MANDATORY"
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {activeNode.node_type === "skill"
                    ? `${activeNode.importance} Skill`
                    : activeNode.node_type}
                </span>
                <h4 className="text-sm font-bold text-white mt-1">{activeNode.label}</h4>
                {activeNode.category && (
                  <p className="text-xs text-slate-400">Category: {activeNode.category}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-mono">Centrality</span>
                <p className="text-xs font-mono font-bold text-indigo-400">
                  {Math.round((activeNode.centrality || 0) * 100)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-wrap items-center justify-between border-t border-slate-800/80 bg-slate-900/60 px-5 py-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" />
            <span className="font-medium text-slate-300">Project Hub</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
            <span className="font-medium text-slate-300">Domain</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-indigo-600" />
            <span className="font-medium text-slate-300">Mandatory Skill</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-amber-500" />
            <span className="font-medium text-slate-300">Preferred Skill</span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2 sm:mt-0 font-mono text-[11px]">
          <span className="text-slate-400">Domain: <strong className="text-indigo-300 font-semibold">{domainLabel}</strong></span>
          <span className="text-slate-500">&bull;</span>
          <span className="text-slate-400">Clusters: <strong className="text-slate-200">{data.clusters.length}</strong></span>
        </div>
      </div>
    </div>
  );
};
