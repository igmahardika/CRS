'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarCheck, ArrowLeft, Clock, ShieldAlert } from 'lucide-react';
import { PageHeader, Button, EmptyState } from '@/components/ui';

export default function SchedulePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal Pelanggan Rutin & SLA 24 Jam"
        description="Monitoring dan pengawalan pembuatan laporan bulanan pelanggan kontrak rutin setiap tanggal 1."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Generator</span>
          </Link>
        }
      />

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center gap-2.5 shadow-xs">
        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
        <div>
          <span className="font-semibold">Fase Pengerjaan Selanjutnya (Fase 5): </span>
          <span>Engine jadwal otomatis tanggal 1 dan sistem pengawalan batas waktu 24 jam dengan notifikasi Telegram akan diaktifkan di Fase 5.</span>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-8 text-center">
        <EmptyState
          icon={CalendarCheck}
          title="Jadwal Rutin SLA 24 Jam"
          description="Sistem akan otomatis mengompilasi daftar seluruh pelanggan yang memiliki klausul wajib report bulanan pada setiap tanggal 1 pukul 08:00 WIB dan mengawal penyelesaiannya selama 24 jam."
          actionLabel="Buka Direktori Pelanggan"
          onAction={() => window.location.href = '/customers'}
        />
      </div>
    </div>
  );
}
