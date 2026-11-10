'use client';

import React from 'react';
import Link from 'next/link';
import { Inbox, ArrowLeft, FileText, Clock, AlertCircle } from 'lucide-react';
import { PageHeader, Button, EmptyState } from '@/components/ui';

export default function RequestsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Antrean Permintaan Laporan"
        description="Daftar permintaan pembuatan laporan SLA dan MRTG yang diajukan oleh departemen lain (Sales, AM, NOC)."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Generator</span>
          </Link>
        }
        actions={
          <Link href="/request-report">
            <Button variant="secondary" size="sm">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              <span>Buka Form Shareable</span>
            </Button>
          </Link>
        }
      />

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2.5 shadow-xs">
        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
        <div>
          <span className="font-semibold">Fase Pengerjaan Selanjutnya (Fase 4): </span>
          <span>Halaman ini akan terhubung langsung dengan form shareable dan notifikasi topik Telegram tim.</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-6">
        <EmptyState
          icon={Inbox}
          title="Antrean Permintaan Masuk"
          description="Saat departemen lain mengisi link form permintaan laporan (/request-report), seluruh tiket permintaan akan masuk ke antrean ini dan dapat diproses oleh staf."
          action={
            <Link href="/">
              <Button variant="primary" size="sm">
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                <span>Buka Report Generator</span>
              </Button>
            </Link>
          }
        />
      </div>
    </div>
  );
}
