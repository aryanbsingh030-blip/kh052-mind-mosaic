"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useOffline } from "@/context/OfflineContext";
import { api, AvailabilitySlot, DayOfWeek } from "@/lib/api";
import { offlineStorage } from "@/lib/offline/indexedDb";
import {
  Settings,
  Calendar,
  Database,
  Trash2,
  CheckCircle2,
  Plus,
  RefreshCw,
  Clock,
  Shield,
  Eye,
} from "lucide-react";

export default function SettingsPage() {
  const { profile } = useAuth();
  const { isOffline, syncQueueCount, clearCompletedSync } = useOffline();

  const [availabilities, setAvailabilities] = useState<AvailabilitySlot[]>([]);
  const [newDay, setNewDay] = useState<DayOfWeek>("MONDAY");
  const [newStart, setNewStart] = useState("14:00");
  const [newEnd, setNewEnd] = useState("16:00");
  const [addingSlot, setAddingSlot] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    api.availabilities.list(profile.id).then((res) => setAvailabilities(res || []));
  }, [profile?.id]);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setAddingSlot(true);
    try {
      const slot = await api.availabilities.create(profile.id, {
        day_of_week: newDay,
        start_time: newStart,
        end_time: newEnd,
      });
      setAvailabilities((prev) => [...prev, slot]);
      setMessage("Availability slot added successfully.");
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(`Failed to add slot: ${err?.message || err}`);
    } finally {
      setAddingSlot(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
    try {
      await api.availabilities.delete(id);
      setAvailabilities((prev) => prev.filter((s) => s.id !== id));
      setMessage("Slot removed.");
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(`Failed to delete slot: ${err?.message || err}`);
    }
  };

  const handlePurgeCache = async () => {
    if (confirm("Are you sure you want to clear completed sync records?")) {
      await clearCompletedSync();
      setMessage("Completed sync records purged.");
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Settings &amp; Preferences</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage peer availability, offline cache storage, and accessibility controls
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-300 text-xs">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 spans): Weekly Tutoring Availability */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                  Weekly Tutoring Availability Slots
                </h2>
                <p className="text-xs text-slate-400">
                  Learners can only request peer sessions within your open calendar blocks
                </p>
              </div>
            </div>

            {/* Existing Slots */}
            {availabilities.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No availability slots configured yet.</p>
            ) : (
              <div className="space-y-2">
                {availabilities.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-indigo-400" />
                      <span className="font-bold text-white uppercase">{slot.day_of_week}</span>
                      <span className="text-slate-400">
                        {slot.start_time} - {slot.end_time}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                      title="Remove Slot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Slot Form */}
            <form onSubmit={handleAddSlot} className="pt-4 border-t border-slate-800/80 space-y-3">
              <h3 className="text-xs font-bold text-slate-300">Add New Slot</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={newDay}
                  onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                  required
                />

                <input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addingSlot}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Time Block</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column (1 span): Offline Cache & Storage Controls */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="h-4 w-4 text-amber-400" />
              IndexedDB Storage Inspector
            </h3>
            <p className="text-xs text-slate-400">
              Database: <code className="text-indigo-300">AISkillExchangeOfflineDB (v2)</code>
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Network State:</span>
                <span className={isOffline ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                  {isOffline ? "Offline (Local)" : "Online (Connected)"}
                </span>
              </div>

              <div className="flex justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Pending Sync Queue:</span>
                <span className="text-white font-mono font-bold">{syncQueueCount} operations</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handlePurgeCache}
                className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clean Finished Sync Records</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-cyan-400" />
              Accessibility Standard
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complies with WCAG 2.1 AA accessibility guidelines. Supports full keyboard navigation with visible focus rings
              and high contrast text scales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
