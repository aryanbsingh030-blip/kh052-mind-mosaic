"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, AvailabilitySlot, DayOfWeek, Skill } from "@/lib/api";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { SkillAnalyzerModal } from "@/components/ui/SkillAnalyzerModal";
import {
  User,
  Sparkles,
  Calendar,
  Save,
  CheckCircle2,
  Trash2,
  Plus,
  Code2,
  Share2,
  Globe,
  Tag,
  Briefcase,
  BookOpen,
  Brain,
} from "lucide-react";

const DAYS_OF_WEEK: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export default function ProfilePage() {
  const { profile, refreshProfile, loading: authLoading } = useAuth();

  // Form states
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [bio, setBio] = useState("");
  const [rawProjectExperience, setRawProjectExperience] = useState("");
  const [interests, setInterests] = useState("");
  const [projectInterests, setProjectInterests] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  // Availability state
  const [availabilities, setAvailabilities] = useState<AvailabilitySlot[]>([]);
  const [newDay, setNewDay] = useState<DayOfWeek>("MONDAY");
  const [newStartTime, setNewStartTime] = useState("14:00");
  const [newEndTime, setNewEndTime] = useState("16:00");
  const [savingSlot, setSavingSlot] = useState(false);

  // Status states
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAnalyzerOpen, setIsAnalyzerOpen] = useState(false);
  const [canonicalSkills, setCanonicalSkills] = useState<Skill[]>([]);

  // Load canonical skills taxonomy
  useEffect(() => {
    api.skills.list({ limit: 100 }).then(setCanonicalSkills).catch(console.error);
  }, []);

  // Populate form from current profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setDepartment(profile.department || "");
      setYearOfStudy(profile.year_of_study || "Sophomore");
      setBio(profile.bio || "");
      setRawProjectExperience(profile.raw_project_experience || "");
      setInterests(profile.interests || "");
      setProjectInterests(profile.project_interests || "");
      setGithubUrl(profile.github_url || "");
      setLinkedinUrl(profile.linkedin_url || "");
      setPortfolioUrl(profile.portfolio_url || "");

      loadAvailability(profile.id);
    }
  }, [profile]);

  const loadAvailability = async (studentId: string) => {
    try {
      const res = await api.availabilities.list(studentId);
      setAvailabilities(res);
    } catch (err) {
      console.error("Failed to load availability:", err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    // Frontend validation
    if (!fullName.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }
    if (!department.trim()) {
      setErrorMsg("Department is required.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    try {
      await api.profiles.update(profile.id, {
        full_name: fullName.trim(),
        department: department.trim(),
        year_of_study: yearOfStudy,
        bio: bio.trim(),
        raw_project_experience: rawProjectExperience.trim(),
        interests: interests.trim(),
        project_interests: projectInterests.trim(),
        github_url: githubUrl.trim() || undefined,
        linkedin_url: linkedinUrl.trim() || undefined,
        portfolio_url: portfolioUrl.trim() || undefined,
      });

      await refreshProfile();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    if (newStartTime >= newEndTime) {
      setErrorMsg("End time must be after start time.");
      return;
    }

    setSavingSlot(true);
    setErrorMsg(null);
    try {
      await api.availabilities.create(profile.id, {
        day_of_week: newDay,
        start_time: newStartTime,
        end_time: newEndTime,
      });
      await loadAvailability(profile.id);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to add availability slot.");
    } finally {
      setSavingSlot(false);
    }
  };

  const handleDeleteAvailability = async (slotId: string) => {
    if (!profile?.id) return;
    try {
      await api.availabilities.delete(slotId);
      setAvailabilities((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to remove availability slot.");
    }
  };

  if (authLoading || !profile) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
          <User className="h-6 w-6 text-indigo-400" />
          Student Profile & Experience
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your academic background, free-text project stories, and tutoring availability
          blocks.
        </p>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} />}

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          Profile changes saved successfully!
        </div>
      )}

      {/* Main Profile Form */}
      <form onSubmit={handleSaveProfile} className="space-y-8">
        {/* Academic Details Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <BookOpen className="h-4 w-4 text-indigo-400" />
            Academic Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. Aarav Sharma"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Department <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. Computer Science & Engineering"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Year of Study
              </label>
              <select
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Freshman">Freshman (1st Year)</option>
                <option value="Sophomore">Sophomore (2nd Year)</option>
                <option value="Junior">Junior (3rd Year)</option>
                <option value="Senior">Senior (4th Year)</option>
                <option value="Masters">Masters Student</option>
                <option value="PhD">PhD Candidate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Short Bio / Headline
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. Systems engineer passionate about distributed consensus"
              />
            </div>
          </div>
        </div>

        {/* Natural Language Project Experience (CRITICAL REQUIREMENT) */}
        <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/80 p-6 shadow-xl backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-400" />
              Previous Project Experience (Natural Language)
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAnalyzerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 px-3 py-1 text-xs font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                <Brain className="h-3.5 w-3.5 text-indigo-400" />
                Analyze Experience with AI
              </button>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-indigo-300 border border-indigo-500/20">
                <Sparkles className="h-3 w-3" />
                AI Skill Analyzer Ready
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Do not worry about strict dropdown categories here. Describe your previous builds, hackathon
            creations, research, or course projects in your own words. The AI Skill Analyzer will
            automatically extract your skills and proficiency benchmarks from this narrative.
          </p>

          <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 text-xs text-indigo-300">
            <span className="font-semibold">Example: </span>
            &quot;I built a plant disease classifier using Python, CNN and Flask and deployed the model as a web application with Docker containerization.&quot;
          </div>

          <textarea
            rows={4}
            value={rawProjectExperience}
            onChange={(e) => setRawProjectExperience(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans"
            placeholder="Write your project story here..."
          />
        </div>

        {/* Technical & Project Interests */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Tag className="h-4 w-4 text-cyan-400" />
            Interests & Aspirations
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Technical & Academic Interests
              </label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. Distributed Systems, Neural Architecture, CRISPR"
              />
              <p className="text-[11px] text-slate-400 mt-1">Comma-separated topics you love</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Project Collaboration Interests
              </label>
              <input
                type="text"
                value={projectInterests}
                onChange={(e) => setProjectInterests(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. Campus sustainability apps, AgroDrones, Cybersecurity CTF"
              />
              <p className="text-[11px] text-slate-400 mt-1">Types of teams you want to join</p>
            </div>
          </div>
        </div>

        {/* Portfolio & Social Links */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Globe className="h-4 w-4 text-purple-400" />
            Online Profiles
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-slate-400" />
                GitHub URL
              </label>
              <input
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="https://github.com/username"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Share2 className="h-3.5 w-3.5 text-slate-400" />
                LinkedIn URL
              </label>
              <input
                type="url"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                Portfolio Website
              </label>
              <input
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="https://portfolio.dev"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Profile..." : "Save Profile Details"}
          </button>
        </div>
      </form>

      {/* Weekly Availability Scheduler Section */}
      <div id="availability" className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-400" />
              Weekly Tutoring & Meeting Availability
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Specify recurring weekly time windows when you can tutor peers or work on team projects.
            </p>
          </div>
        </div>

        {/* Add Slot Form */}
        <form onSubmit={handleAddAvailability} className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-950/60 p-4 border border-slate-800">
          <div className="w-full sm:w-auto flex-1 min-w-[140px]">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Day of Week</label>
            <select
              value={newDay}
              onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0) + d.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="w-1/2 sm:w-auto">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Start Time</label>
            <input
              type="time"
              value={newStartTime}
              onChange={(e) => setNewStartTime(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="w-1/2 sm:w-auto">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">End Time</label>
            <input
              type="time"
              value={newEndTime}
              onChange={(e) => setNewEndTime(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={savingSlot}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-indigo-500 transition-colors disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {savingSlot ? "Adding..." : "Add Time Slot"}
          </button>
        </form>

        {/* Existing Slots List */}
        {availabilities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {availabilities.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-200">
                    {slot.day_of_week.charAt(0) + slot.day_of_week.slice(1).toLowerCase()}
                  </span>
                  <p className="text-slate-400 font-mono mt-0.5">
                    {slot.start_time} &ndash; {slot.end_time}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAvailability(slot.id)}
                  className="text-slate-500 hover:text-rose-400 transition-colors"
                  title="Remove slot"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            No availability slots added yet. Add recurring weekly windows above.
          </p>
        )}
      </div>

      {/* AI Skill Analyzer Modal */}
      <SkillAnalyzerModal
        isOpen={isAnalyzerOpen}
        onClose={() => setIsAnalyzerOpen(false)}
        studentId={profile.id}
        canonicalSkills={canonicalSkills}
        onSkillsUpdated={refreshProfile}
        defaultDirection="TEACH"
      />
    </div>
  );
}
