'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { FormField, Input, Button, Checkbox } from '@/components/ui';

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
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#F8FAFC]">
      <div className="w-full max-w-sm bg-white rounded-lg border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center">
          <div className="w-10 h-10 rounded-lg bg-[#EA580C] text-white flex items-center justify-center mx-auto mb-3 shadow-xs">
            <BarChart3 className="w-6 h-6 stroke-[2]" />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-slate-900 tracking-tight">
            GENRE
          </h1>
          <p className="text-[13px] text-slate-600 font-sans font-normal mt-1 leading-normal">
            Sign in to access network telemetry and SLA reporting.
          </p>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Username" required>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              disabled={loading}
              error={Boolean(error && !username.trim())}
              autoComplete="username"
            />
          </FormField>

          <FormField label="Password" required>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                error={Boolean(error && !password)}
                autoComplete="current-password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </FormField>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(c) => setRememberMe(Boolean(c))}
              />
              <span>Remember me</span>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-2"
            loading={loading}
          >
            Sign In
          </Button>
        </form>

        {/* Footer */}
        <div className="pt-2 text-center border-t border-slate-100">
          <p className="text-xs text-slate-500 font-sans">
            Nexa Telemetry & SLA Reporting
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
          <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#EA580C] animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
