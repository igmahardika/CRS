'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  FileText,
  FilePlus,
  History,
  CheckSquare,
  Clock,
  Inbox,
  Send,
  CalendarCheck,
  Server,
  Users,
  Radio,
  ShieldCheck,
  UserCheck,
  Settings,
  ChevronDown,
  Menu,
  X,
  LogOut,
  Sparkles,
} from 'lucide-react';
import {
  ConfirmDialog,
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui';

interface CurrentUser {
  id: string;
  username: string;
  name: string;
  email: string | null;
  role: 'ADMIN' | 'SUPERVISOR' | 'STAFF' | 'REQUESTER' | 'OPERATOR' | 'VIEWER';
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (isLoginPage) return;
    const fetchMe = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            // If Supervisor or Admin, fetch pending reports count
            if (data.user.role === 'ADMIN' || data.user.role === 'SUPERVISOR') {
              fetch('/api/reports')
                .then((r) => (r.ok ? r.json() : null))
                .then((rData) => {
                  if (rData?.reports && Array.isArray(rData.reports)) {
                    const count = rData.reports.filter(
                      (rep: { status?: string }) => rep.status === 'PENDING_APPROVAL'
                    ).length;
                    setPendingApprovalsCount(count);
                  }
                })
                .catch(() => {});
            }
          } else {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      } finally {
        setAuthChecked(true);
      }
    };
    fetchMe();
  }, [isLoginPage, pathname]);

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

  if (isLoginPage) {
    return null;
  }

  const userRole = currentUser?.role || 'VIEWER';
  const isSupervisorOrAdmin = userRole === 'ADMIN' || userRole === 'SUPERVISOR';
  const isAdmin = userRole === 'ADMIN';

  const userInitials = (currentUser?.name || 'User')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Active section flags
  const isReportsActive = pathname === '/' || pathname === '/history';
  const isQueueActive = pathname === '/requests' || pathname === '/request-report' || pathname === '/schedule';
  const isMasterActive = pathname === '/customers' || pathname === '/discovery';
  const isSystemActive = pathname === '/users' || pathname === '/settings';

  // Only hide internal NOC menus when on /request-report AND user is NOT logged in (public share link)
  const hasAuthToken = typeof document !== 'undefined' ? document.cookie.includes('genre_auth_token') : false;
  const isGuestOnRequestPage =
    pathname === '/request-report' &&
    !currentUser &&
    (!hasAuthToken || authChecked);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <Badge variant="neutral" className="bg-slate-900 text-white border-slate-900 font-semibold text-[10px] px-2 py-0.5 shadow-2xs">
            Admin
          </Badge>
        );
      case 'SUPERVISOR':
        return (
          <Badge variant="info" className="bg-blue-600 text-white border-blue-600 font-semibold text-[10px] px-2 py-0.5 shadow-2xs">
            Supervisor
          </Badge>
        );
      case 'STAFF':
        return (
          <Badge variant="warning" className="bg-[#EA580C] text-white border-[#C2410C] font-semibold text-[10px] px-2 py-0.5 shadow-2xs">
            Staff
          </Badge>
        );
      case 'REQUESTER':
        return (
          <Badge variant="soft" className="text-[10px] px-2 py-0.5 font-medium">
            Requester
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" className="text-[10px] px-2 py-0.5 font-medium">
            Viewer
          </Badge>
        );
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex justify-between h-14 items-center">
          {/* Left: Brand Logo */}
          <div className="flex items-center space-x-6">
            <Link href={isGuestOnRequestPage ? "/request-report" : "/"} className="flex items-center space-x-2.5 shrink-0 group">
              <div className="w-8 h-8 rounded-lg bg-[#EA580C] text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                <BarChart3 className="w-4 h-4 stroke-[2]" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading text-base font-bold text-slate-900 tracking-tight leading-none">
                  GENRE
                </span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase mt-0.5 leading-none">
                  Reporting System
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Groups (Hierarchical Menu with Dropdowns) */}
            {isGuestOnRequestPage ? (
              <nav className="flex items-center space-x-1">
                <div className="px-3.5 py-1.5 rounded-full text-[13px] flex items-center gap-1.5 bg-[#FFF7ED] text-[#C2410C] font-semibold border border-orange-200/80 shadow-2xs">
                  <Send className="w-4 h-4 text-[#C2410C] stroke-[2]" />
                  <span>Request Form</span>
                </div>
              </nav>
            ) : (
              <nav className="hidden lg:flex items-center space-x-1">
              {/* 1. Menu: Reports */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-[13px] transition-colors flex items-center gap-1.5 outline-none cursor-pointer ${
                      isReportsActive
                        ? 'bg-[#FFF7ED] text-[#C2410C] font-semibold'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <FileText className={`w-4 h-4 stroke-[1.75] ${isReportsActive ? 'text-[#C2410C]' : 'text-slate-500'}`} />
                    <span>Reports</span>
                    {isSupervisorOrAdmin && pendingApprovalsCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {pendingApprovalsCount}
                      </span>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 p-1">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/"
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-xs font-medium ${
                        pathname === '/' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <FilePlus className="w-4 h-4 text-[#EA580C]" />
                      <span>Create Report</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/history"
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-xs font-medium ${
                        pathname === '/history' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <History className="w-4 h-4 text-slate-500" />
                      <span>Report History</span>
                    </Link>
                  </DropdownMenuItem>

                  {isSupervisorOrAdmin && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/history"
                        className="flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckSquare className="w-4 h-4 text-amber-600" />
                          <span>Approval Queue</span>
                        </div>
                        {pendingApprovalsCount > 0 && (
                          <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                            {pendingApprovalsCount}
                          </Badge>
                        )}
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 2. Menu: Queue & Schedule */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-[13px] transition-colors flex items-center gap-1.5 outline-none cursor-pointer ${
                      isQueueActive
                        ? 'bg-[#FFF7ED] text-[#C2410C] font-semibold'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <Clock className={`w-4 h-4 stroke-[1.75] ${isQueueActive ? 'text-[#C2410C]' : 'text-slate-500'}`} />
                    <span>Queue &amp; Schedule</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 p-1">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/requests"
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-xs font-medium ${
                        pathname === '/requests' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Inbox className="w-4 h-4 text-indigo-600" />
                      <span>Request Queue</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/request-report"
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-xs font-medium ${
                        pathname === '/request-report' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Send className="w-4 h-4 text-blue-600" />
                      <span>Request Form</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link
                      href="/schedule"
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-xs font-medium ${
                        pathname === '/schedule' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <CalendarCheck className="w-4 h-4 text-emerald-600" />
                      <span>Monthly Schedule &amp; SLA</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 3. Menu: Master Data */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-full text-[13px] transition-colors flex items-center gap-1.5 outline-none cursor-pointer ${
                      isMasterActive
                        ? 'bg-[#FFF7ED] text-[#C2410C] font-semibold'
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <Server className={`w-4 h-4 stroke-[1.75] ${isMasterActive ? 'text-[#C2410C]' : 'text-slate-500'}`} />
                    <span>Master Data</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52 p-1">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/customers"
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-xs font-medium ${
                        pathname === '/customers' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Users className="w-4 h-4 text-[#EA580C]" />
                      <span>Customer Directory</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/discovery"
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-xs font-medium ${
                        pathname === '/discovery' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Radio className="w-4 h-4 text-emerald-600" />
                      <span>Network Discovery</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 4. Menu: System Management (Admin Only) */}
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-full text-[13px] transition-colors flex items-center gap-1.5 outline-none cursor-pointer ${
                        isSystemActive
                          ? 'bg-[#FFF7ED] text-[#C2410C] font-semibold'
                          : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <ShieldCheck className={`w-4 h-4 stroke-[1.75] ${isSystemActive ? 'text-[#C2410C]' : 'text-slate-500'}`} />
                      <span>System</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-52 p-1">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/users"
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-xs font-medium ${
                          pathname === '/users' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <UserCheck className="w-4 h-4 text-purple-600" />
                        <span>User Management</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings"
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-xs font-medium ${
                          pathname === '/settings' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span>System Settings</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
            )}
          </div>

          {/* Right: User Profile & Role Chip */}
          {isGuestOnRequestPage ? (
            <div className="flex items-center space-x-2.5">
              <div className="flex items-center space-x-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-medium text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Public Request Portal</span>
              </div>
              <Link
                href="/login"
                className="text-xs font-semibold text-slate-600 hover:text-[#EA580C] px-3 py-1 rounded-md hover:bg-slate-100 transition-colors"
              >
                Sign In
              </Link>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-3">
              {currentUser ? (
                <div className="flex items-center space-x-2">
                  {/* Role Badge Chip */}
                  {getRoleBadge(currentUser.role)}

                  {/* User Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 gap-2 text-slate-700 hover:text-slate-900 rounded-full"
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-medium flex items-center justify-center text-[10px]">
                          {userInitials}
                        </div>
                        <span className="text-[13px] font-medium hidden md:inline-block max-w-[120px] truncate">
                          {currentUser.name}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 p-1.5">
                      <div className="px-2.5 py-2">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {currentUser.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-sans truncate">
                          {currentUser.email || `@${currentUser.username}`}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400">Role:</span>
                          {getRoleBadge(currentUser.role)}
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link href="/settings" className="gap-2 cursor-pointer text-xs">
                            <Settings className="w-4 h-4 text-slate-500" />
                            <span>System Settings</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setShowLogoutConfirm(true)}
                        className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer text-xs"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[11px] font-medium text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Online</span>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          {!isGuestOnRequestPage && (
            <div className="flex lg:hidden items-center">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu (Hierarchically Sectioned) */}
      {!isGuestOnRequestPage && isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-4 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Section 1: Reports */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Reports
            </div>
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FilePlus className="w-4 h-4 text-[#EA580C]" />
              <span>Create Report</span>
            </Link>
            <Link
              href="/history"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/history' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-600" />
                <span>Report History</span>
              </div>
              {isSupervisorOrAdmin && pendingApprovalsCount > 0 && (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                  {pendingApprovalsCount}
                </Badge>
              )}
            </Link>
          </div>

          {/* Section 2: Queue & Schedule */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Queue &amp; Schedule
            </div>
            <Link
              href="/requests"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/requests' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Inbox className="w-4 h-4 text-indigo-600" />
              <span>Request Queue</span>
            </Link>
            <Link
              href="/request-report"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/request-report' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Send className="w-4 h-4 text-blue-600" />
              <span>Request Form</span>
            </Link>
            <Link
              href="/schedule"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/schedule' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Monthly Schedule &amp; SLA</span>
            </Link>
          </div>

          {/* Section 3: Master Data */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Master Data
            </div>
            <Link
              href="/customers"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/customers' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 text-[#EA580C]" />
              <span>Customer Directory</span>
            </Link>
            <Link
              href="/discovery"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/discovery' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-600" />
              <span>Network Discovery</span>
            </Link>
          </div>

          {/* Section 4: System (Admin Only) */}
          {isAdmin && (
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                System
              </div>
              <Link
                href="/users"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  pathname === '/users' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span>User Management</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  pathname === '/settings' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>System Settings</span>
              </Link>
            </div>
          )}

          {/* User Profile on Mobile */}
          {currentUser && (
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs px-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-medium flex items-center justify-center text-[10px]">
                  {userInitials}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{currentUser.name}</div>
                  <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLogoutConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs gap-1 h-7 px-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title="Sign Out"
        description="Are you sure you want to sign out of your account session?"
        confirmText="Sign Out"
        variant="primary"
        loading={isLoggingOut}
        onConfirm={handleLogout}
      />
    </header>
  );
}
