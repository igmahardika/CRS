'use client';

import React from 'react';
import Link from 'next/link';
import { Send, ArrowLeft, FileText, Share2, Clock } from 'lucide-react';
import { PageHeader, Button, EmptyState } from '@/components/ui';

export default function RequestReportPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Form Permintaan Laporan SLA & MRTG"
        description="Formulir pengajuan permintaan laporan jaringan resmi bagi departemen internal Nexa."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Generator</span>
          </Link>
        }
      />

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs flex items-center gap-2.5 shadow-xs">
        <Clock className="w-4 h-4 text-blue-600 shrink-0" />
        <div>
          <span className="font-semibold">Fase Pengerjaan Selanjutnya (Fase 4): </span>
          <span>Formulir publik shareable lengkap akan dikonfigurasikan pada tahap Fase 4.</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-8 text-center">
        <EmptyState
          icon={Send}
          title="Form Permintaan Shareable"
          description="Formulir ini dapat dibagikan tautannya ke departemen luar (Sales, AM, Customer Care) untuk mengajukan permintaan laporan resmi secara terstruktur."
          actionLabel="Kembali ke Dashboard Generator"
          onAction={() => window.location.href = '/'}
        />
      </div>
    </div>
  );
}
