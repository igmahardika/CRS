'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestReportRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/requests?new=1');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
      <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-orange-600 animate-spin" />
      <p className="text-xs text-slate-500 font-medium">
        Redirecting to Request Queue...
      </p>
    </div>
  );
}
