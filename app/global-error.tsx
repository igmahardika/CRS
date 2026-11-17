'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Fatal Error]', error);
  }, [error]);

  return (
    <html lang="id">
      <body className="bg-slate-50 min-h-screen flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-2">Fatal Application Error</h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Terjadi kendala kritis pada antarmuka sistem. Silakan muat ulang aplikasi.
          </p>

          <button
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Muat Ulang Aplikasi
          </button>
        </div>
      </body>
    </html>
  );
}
