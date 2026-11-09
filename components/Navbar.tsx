'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  Users,
  History,
  Settings,
  BarChart3,
  Menu,
  X,
  Radio,
  LogOut,
  Shield,
  Sliders,
  Eye,
  UserCheck,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui';

interface CurrentUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Don't show regular navbar on login page
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (isLoginPage) return;
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) setCurrentUser(data.user);
        }
      } catch {
        // Not logged in or error
      }
    };
    fetchMe();
  }, [isLoginPage, pathname]);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error(err);
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  // Base navigation items
  const baseNavItems = [
    { href: '/', label: 'Report Generator', icon: FileText, roles: ['ADMIN', 'OPERATOR', 'VIEWER'] },
    { href: '/customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'OPERATOR'] },
    { href: '/history', label: 'Report History', icon: History, roles: ['ADMIN', 'OPERATOR', 'VIEWER'] },
    { href: '/discovery', label: 'Network Discovery', icon: Radio, roles: ['ADMIN', 'OPERATOR'] },
    { href: '/users', label: 'Users', icon: UserCheck, roles: ['ADMIN'] },
    { href: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
  ];

  // Filter items by user role (default to least privileged VIEWER while loading)
  const userRole = currentUser?.role || 'VIEWER';
  const navItems = baseNavItems.filter((item) => item.roles.includes(userRole));

  if (isLoginPage) {
    return null; // Clean login layout
  }

  const userInitials = (currentUser?.name || 'User')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-[1750px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center space-x-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <span>MRTG & SLA</span>
                <span className="font-heading text-[10px] px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold border border-orange-200/80 uppercase tracking-wider">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Automated A4 PDF Reporting System</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1">
            <nav className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`font-heading flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${isActive
                        ? 'bg-orange-50 text-orange-600 border border-orange-200/80 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                      }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile Pill & Logout */}
          <div className="hidden sm:flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-200">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                  {userInitials}
                </div>
                <div className="text-left hidden md:block">
                  <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[140px]">
                    {currentUser.name}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${currentUser.role === 'ADMIN'
                          ? 'bg-purple-100 text-purple-700'
                          : currentUser.role === 'OPERATOR'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  title="Sign out"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-[11px] font-semibold text-emerald-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>System Online</span>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex lg:hidden items-center space-x-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`font-heading flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${isActive
                    ? 'bg-orange-50 text-orange-600 border border-orange-200/80'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-orange-500' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {currentUser && (
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs px-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold flex items-center justify-center text-[10px]">
                  {userInitials}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">{currentUser.role}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center space-x-1 text-xs text-rose-600 font-semibold hover:underline"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Sign Out"
        description="Are you sure you want to sign out of your session?"
        confirmText="Sign Out"
        variant="primary"
        loading={isLoggingOut}
        onConfirm={handleLogout}
      />
    </header>
  );
}
