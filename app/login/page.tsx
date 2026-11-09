'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Activity,
  FileCheck2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your credentials.');
      }

      router.push(redirectUrl);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#090d16] text-slate-100 overflow-hidden font-sans">
      {/* LEFT COLUMN: Enterprise Telemetry & Branding Showcase (Desktop) */}
      <div className="hidden lg:flex lg:w-7/12 xl:w-3/5 flex-col justify-between p-12 xl:p-16 relative bg-gradient-to-br from-[#0a0f1d] via-[#0f172a] to-[#070b14] border-r border-slate-800/80">
        {/* Subtle Network Matrix Background Grid */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Ambient Gradient Glows */}
        <div className="absolute top-10 left-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top: Brand Header */}
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-lg tracking-tight text-white">GENRE REPORTING</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30">
                Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400">Automated MRTG & SLA Telemetry Portal</p>
          </div>
        </div>

        {/* Middle: Value Proposition & Feature Highlights */}
        <div className="relative z-10 max-w-xl space-y-8 my-auto py-8">
          <div className="space-y-4">
            <h1 className="font-heading text-3xl xl:text-4xl font-extrabold text-white leading-tight tracking-tight">
              Automated Network Reports & High-Precision SLA Auditing.
            </h1>
            <p className="text-sm xl:text-base text-slate-300/90 leading-relaxed font-normal">
              Unified platform for network availability monitoring, multi-source telemetry aggregation, and formal A4 executive reports.
            </p>
          </div>

          {/* Feature Pillar Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 backdrop-blur-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-white">Precision A4 Reports</h2>
              <p className="text-[11px] text-slate-400 leading-snug">Automated SLA math calculation with print-ready PDF export.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 backdrop-blur-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Activity className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-white">Multi-Source Sync</h2>
              <p className="text-[11px] text-slate-400 leading-snug">Real-time telemetry across PRTG, MRTG, and Cacti servers.</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 backdrop-blur-sm space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-white">Role-Based Access</h2>
              <p className="text-[11px] text-slate-400 leading-snug">Granular access controls for Admin, Operator, and Viewer roles.</p>
            </div>
          </div>
        </div>

        {/* Bottom: System Status Telemetry */}
        <div className="relative z-10 flex items-center justify-between pt-6 border-t border-slate-800/70 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] text-slate-300">Engine Online • All Services Operational</span>
          </div>
          <span className="font-mono text-[11px] text-slate-300">v2.4 Enterprise</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Minimalist & Clean Authentication Panel */}
      <div className="w-full lg:w-5/12 xl:w-2/5 flex flex-col justify-between p-6 sm:p-12 lg:p-14 relative bg-[#090d16]">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading font-bold text-base text-white">GENRE REPORTING</span>
            <p className="text-[11px] text-slate-400">MRTG & SLA Reporting System</p>
          </div>
        </div>

        {/* Form Container */}
        <div className="my-auto w-full max-w-sm mx-auto space-y-7">
          {/* Header Title */}
          <div className="space-y-1.5">
            <h2 className="font-heading text-2xl font-bold text-white tracking-tight">Sign In</h2>
            <p className="text-xs text-slate-400">Enter your credentials to access the system.</p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username / Email */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="block text-xs font-semibold text-slate-300">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center text-xs">
              <label className="flex items-center gap-2 text-slate-400 hover:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-orange-500 focus:ring-orange-500/20 w-3.5 h-3.5"
                />
                <span>Remember me on this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-lg shadow-orange-600/20 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Minimal Footer */}
        <div className="mt-8 text-center lg:text-left text-[11px] text-slate-400">
          <p>© 2026 PT Nexa Solusindo. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#090d16] flex items-center justify-center text-slate-400 text-xs">
          Loading Portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
