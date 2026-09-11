"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Sparkles, ArrowRight, UserCheck, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, switchStudent, seedProfiles, profile } = useAuth();
  const [email, setEmail] = useState("aarav@uni.edu");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Invalid university credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = async (studentId: string) => {
    switchStudent(studentId);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 selection:bg-indigo-600 selection:text-white">
      {/* Brand Icon */}
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-md shadow-indigo-600/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              AI SKILL <span className="text-indigo-400">EXCHANGE</span>
            </span>
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-white">Campus Portal Authentication</h1>
          <p className="text-xs text-slate-400">Enter university credentials or select a test persona</p>
        </div>

        {/* Form Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="login-email">
                Campus Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="student@university.edu"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? "Authenticating..." : "Sign In to Campus Protocol"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {/* Persona Switcher Section for Hackathon Demo */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
              <UserCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Or 1-Click Evaluation Personas:</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {seedProfiles.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleQuickSelect(p.id)}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/90 hover:border-indigo-500/50 hover:bg-slate-900 text-left transition-all group"
                >
                  <p className="text-xs font-semibold text-white group-hover:text-indigo-300 truncate">
                    {p.full_name}
                  </p>
                  <p className="text-[10px] text-slate-500">{p.department.split(" ")[0]}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">
            ← Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
