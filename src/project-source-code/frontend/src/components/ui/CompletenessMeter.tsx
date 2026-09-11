import React from "react";
import { StudentProfile } from "@/lib/api";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Props {
  profile: StudentProfile;
  hasAvailability?: boolean;
}

export const CompletenessMeter: React.FC<Props> = ({ profile, hasAvailability = false }) => {
  const teachSkills = profile.skills.filter((s) => s.direction === "TEACH");
  const learnSkills = profile.skills.filter((s) => s.direction === "LEARN");

  const checklist = [
    {
      label: "Academic Bio & Department",
      complete: Boolean(profile.bio && profile.bio.trim().length > 10),
      href: "/profile",
    },
    {
      label: "At least 1 Teaching Skill",
      complete: teachSkills.length > 0,
      href: "/skills",
    },
    {
      label: "At least 1 Skill to Learn",
      complete: learnSkills.length > 0,
      href: "/skills",
    },
    {
      label: "Previous Project Experience Story",
      complete: Boolean(profile.raw_project_experience && profile.raw_project_experience.trim().length > 20),
      href: "/profile",
    },
    {
      label: "Weekly Availability Schedule",
      complete: hasAvailability,
      href: "/profile#availability",
    },
  ];

  const completedCount = checklist.filter((item) => item.complete).length;
  const percentage = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-semibold text-white">Profile Readiness</h3>
          <p className="text-xs text-slate-400">
            {completedCount} of {checklist.length} milestones complete
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black font-mono text-indigo-400">{percentage}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800 mb-5">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Actionable items */}
      <div className="space-y-2.5">
        {checklist.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <span
              className={`flex items-center gap-2 ${
                item.complete ? "text-slate-300 line-through opacity-60" : "text-slate-200 font-medium"
              }`}
            >
              {item.complete ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-amber-400 shrink-0" />
              )}
              {item.label}
            </span>
            {!item.complete && (
              <Link
                href={item.href}
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Add <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
