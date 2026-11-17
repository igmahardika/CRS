'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log exception to monitoring service
    console.error('[Unhandled Client/Server Render Error]', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-border shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">Terjadi Kesalahan Sistem</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Sistem mengalami kendala saat memproses halaman ini. Anda dapat mencoba memuat ulang komponen atau kembali ke beranda.
        </p>

        {error.digest && (
          <div className="mb-6 p-3 bg-muted/50 rounded-lg text-xs font-mono text-muted-foreground break-all">
            Digest Code: {error.digest}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => reset()}
            variant="primary"
            className="flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Coba Lagi
          </Button>
          <Link href="/">
            <Button
              variant="secondary"
              className="w-full flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
