'use client';

import React, { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import Navbar from '@/components/Navbar';

function AccessDeniedToastHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get('access_denied') === '1') {
      toast.error('Akses ditolak: Anda tidak memiliki wewenang untuk membuka halaman tersebut.');
      // Clean query parameter from URL without full reload
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete('access_denied');
      const cleanUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
      router.replace(cleanUrl);
    }
  }, [searchParams, router, pathname]);

  return null;
}

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <main className="min-h-screen w-full flex flex-col bg-[#F8FAFC] text-slate-900">
        <Suspense fallback={null}>
          <AccessDeniedToastHandler />
        </Suspense>
        {children}
        <Toaster richColors position="top-right" closeButton />
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <Suspense fallback={null}>
        <AccessDeniedToastHandler />
      </Suspense>
      <Navbar />
      <main className="flex-1 max-w-[1680px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6">
        {children}
      </main>
      <Toaster richColors position="top-right" closeButton />
    </div>
  );
}
