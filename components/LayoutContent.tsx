'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import Navbar from '@/components/Navbar';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <main className="min-h-screen w-full flex flex-col bg-slate-950 text-slate-100">
        {children}
        <Toaster richColors position="top-right" closeButton />
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1 max-w-[1750px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <Toaster richColors position="top-right" closeButton />
    </div>
  );
}

