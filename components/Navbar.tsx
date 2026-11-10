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
          }
        }
      } catch {
        // Not logged in or error
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
            <Link href="/" className="flex items-center space-x-2.5 shrink-0 group">
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
            <nav className="hidden lg:flex items-center space-x-1">
              {/* 1. Menu: Laporan */}
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
                    <span>Laporan</span>
                    {isSupervisorOrAdmin && pendingApprovalsCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                        {pendingApprovalsCount}
                      </span>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 p-1.5">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/"
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${
                        pathname === '/' ? 'bg-orange-50 text-[#C2410C]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="p-1 rounded-md bg-orange-100 text-[#EA580C] mt-0.5">
                        <FilePlus className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Buat Laporan Baru</div>
                        <div className="text-[11px] text-slate-500">Generator MRTG & SLA compliance report</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/history"
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${
                        pathname === '/history' ? 'bg-orange-50 text-[#C2410C]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="p-1 rounded-md bg-slate-100 text-slate-700 mt-0.5">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Riwayat & Arsip Dokumen</div>
                        <div className="text-[11px] text-slate-500">Daftar arsip laporan PDF & status publik</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  {isSupervisorOrAdmin && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/history"
                        className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer text-slate-700 hover:bg-slate-50"
                      >
                        <div className="p-1 rounded-md bg-amber-100 text-amber-700 mt-0.5 relative">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="text-xs font-semibold flex items-center justify-between">
                            <span>Antrean Approval</span>
                            {pendingApprovalsCount > 0 && (
                              <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                                {pendingApprovalsCount} Pending
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">Verifikasi & persetujuan laporan staf</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 2. Menu: Antrean & Jadwal */}
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
                    <span>Antrean & Jadwal</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 p-1.5">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/requests"
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${
                        pathname === '/requests' ? 'bg-orange-50 text-[#C2410C]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="p-1 rounded-md bg-indigo-100 text-indigo-700 mt-0.5">
                        <Inbox className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Antrean Permintaan Masuk</div>
                        <div className="text-[11px] text-slate-500">Permintaan report dari Sales, AM, dan NOC</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/request-report"
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${
                        pathname === '/request-report' ? 'bg-orange-50 text-[#C2410C]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="p-1 rounded-md bg-blue-100 text-blue-700 mt-0.5">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Form Request Shareable</div>
                        <div className="text-[11px] text-slate-500">Tautan form untuk dibagikan ke divisi lain</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link
                      href="/schedule"
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${
                        pathname === '/schedule' ? 'bg-orange-50 text-[#C2410C]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="p-1 rounded-md bg-emerald-100 text-emerald-700 mt-0.5">
                        <CalendarCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Jadwal Bulanan & SLA 24 Jam</div>
                        <div className="text-[11px] text-slate-500">Monitoring laporan rutin bulanan tanggal 1</div>
                      </div>
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
                <DropdownMenuContent align="start" className="w-64 p-1.5">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/customers"
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${
                        pathname === '/customers' ? 'bg-orange-50 text-[#C2410C]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="p-1 rounded-md bg-orange-100 text-[#EA580C] mt-0.5">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Direktori Pelanggan</div>
                        <div className="text-[11px] text-slate-500">Master customer, SID, dan konfigurasi SLA</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/discovery"
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${
                        pathname === '/discovery' ? 'bg-orange-50 text-[#C2410C]' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="p-1 rounded-md bg-emerald-100 text-emerald-700 mt-0.5">
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold">Discovery Jaringan</div>
                        <div className="text-[11px] text-slate-500">Tree interface MRTG Cacti & PRTG sensor</div>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 4. Menu: Kelola Sistem (Supervisor & Admin) */}
              {isSupervisorOrAdmin && (
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
                      <span>Kelola Sistem</span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64 p-1.5">
                    <DropdownMenuItem asChild>
                      <Link
                        href="/users"
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${
                          pathname === '/users' ? 'bg-orange-50 text-[#C2410C]' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="p-1 rounded-md bg-purple-100 text-purple-700 mt-0.5">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold">Manajemen Pengguna</div>
                          <div className="text-[11px] text-slate-500">Kelola akun Staff, Supervisor & akses</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>

                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link
                          href="/settings"
                          className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer ${
                            pathname === '/settings' ? 'bg-orange-50 text-[#C2410C]' : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="p-1 rounded-md bg-slate-100 text-slate-700 mt-0.5">
                            <Settings className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold">Pengaturan Sistem</div>
                            <div className="text-[11px] text-slate-500">Notifikasi Telegram, kop surat & template</div>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </nav>
          </div>

          {/* Right: User Profile & Role Chip */}
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
                        <span className="text-[10px] text-slate-400">Jabatan:</span>
                        {getRoleBadge(currentUser.role)}
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href="/settings" className="gap-2 cursor-pointer text-xs">
                          <Settings className="w-4 h-4 text-slate-500" />
                          <span>Pengaturan Sistem</span>
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

          {/* Mobile Menu Toggle Button */}
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
        </div>
      </div>

      {/* Mobile Drawer Menu (Hierarchically Sectioned) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-4 shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Section 1: Laporan */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Laporan
            </div>
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FilePlus className="w-4 h-4 text-[#EA580C]" />
              <span>Buat Laporan Baru</span>
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
                <span>Riwayat & Arsip Dokumen</span>
              </div>
              {isSupervisorOrAdmin && pendingApprovalsCount > 0 && (
                <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                  {pendingApprovalsCount} Pending
                </Badge>
              )}
            </Link>
          </div>

          {/* Section 2: Antrean & Jadwal */}
          <div className="space-y-1 pt-2 border-t border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Antrean & Jadwal
            </div>
            <Link
              href="/requests"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/requests' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Inbox className="w-4 h-4 text-indigo-600" />
              <span>Antrean Permintaan Masuk</span>
            </Link>
            <Link
              href="/request-report"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/request-report' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Send className="w-4 h-4 text-blue-600" />
              <span>Form Request Shareable</span>
            </Link>
            <Link
              href="/schedule"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/schedule' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <span>Jadwal Bulanan & SLA 24 Jam</span>
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
              <span>Direktori Pelanggan</span>
            </Link>
            <Link
              href="/discovery"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                pathname === '/discovery' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Radio className="w-4 h-4 text-emerald-600" />
              <span>Discovery Jaringan</span>
            </Link>
          </div>

          {/* Section 4: Kelola Sistem */}
          {isSupervisorOrAdmin && (
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                Kelola Sistem
              </div>
              <Link
                href="/users"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                  pathname === '/users' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span>Manajemen Pengguna</span>
              </Link>
              {isAdmin && (
                <Link
                  href="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    pathname === '/settings' ? 'bg-orange-50 text-[#C2410C] font-semibold' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="w-4 h-4 text-slate-600" />
                  <span>Pengaturan Sistem</span>
                </Link>
              )}
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
        title="Keluar dari Sesi"
        description="Apakah Anda yakin ingin keluar dari sesi akun ini?"
        confirmText="Keluar"
        variant="primary"
        loading={isLoggingOut}
        onConfirm={handleLogout}
      />
    </header>
  );
}
