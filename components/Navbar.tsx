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
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import {
  ConfirmDialog,
  Button,
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
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const baseNavItems = [
    { href: '/', label: 'Generator', icon: FileText, roles: ['ADMIN', 'OPERATOR', 'VIEWER'] },
    { href: '/customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'OPERATOR'] },
    { href: '/history', label: 'History', icon: History, roles: ['ADMIN', 'OPERATOR', 'VIEWER'] },
    { href: '/discovery', label: 'Discovery', icon: Radio, roles: ['ADMIN', 'OPERATOR'] },
    { href: '/users', label: 'Users', icon: UserCheck, roles: ['ADMIN'] },
    { href: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const userRole = currentUser?.role || 'VIEWER';
  const navItems = baseNavItems.filter((item) => item.roles.includes(userRole));

  if (isLoginPage) {
    return null;
  }

  const userInitials = (currentUser?.name || 'User')
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex justify-between h-14 items-center">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center space-x-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-lg bg-[#EA580C] text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-4 h-4 stroke-[2]" />
            </div>
            <span className="font-heading text-base font-semibold text-slate-900 tracking-tight">
              GENRE
            </span>
          </Link>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-full text-[13px] transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#FFF7ED] text-[#C2410C] font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 stroke-[1.75] ${isActive ? 'text-[#C2410C]' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Profile Menu */}
          <div className="hidden sm:flex items-center">
            {currentUser ? (
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
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                      {currentUser.role}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  {currentUser.role === 'ADMIN' && (
                    <Link href="/settings">
                      <DropdownMenuItem className="gap-2 cursor-pointer">
                        <Settings className="w-4 h-4 text-slate-500" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuItem
                    onClick={() => setShowLogoutConfirm(true)}
                    className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-full text-xs font-medium transition ${
                  isActive
                    ? 'bg-[#FFF7ED] text-[#C2410C] font-semibold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 stroke-[1.75] ${isActive ? 'text-[#C2410C]' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {currentUser && (
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs px-2">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-medium flex items-center justify-center text-[10px]">
                  {userInitials}
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{currentUser.name}</div>
                  <div className="text-[10px] text-slate-500 font-normal uppercase">{currentUser.role}</div>
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
        description="Are you sure you want to sign out of your session?"
        confirmText="Sign Out"
        variant="primary"
        loading={isLoggingOut}
        onConfirm={handleLogout}
      />
    </header>
  );
}
