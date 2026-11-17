# Customer Reporting System (CRS)
> **PT Internet Mulia Untuk Negeri (Nexa)** &bull; Production Enterprise Telemetry & SLA Compliance Reporting Portal

[![CI Pipeline](https://github.com/organization/customer-reporting-system/actions/workflows/ci.yml/badge.svg)](https://github.com/organization/customer-reporting-system/actions)
[![Node.js Version](https://img.shields.io/badge/Node.js-v22+-339933?logo=node.js)](https://nodejs.org/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](#)

---

## 📌 Ikhtisar Sistem

Customer Reporting System (CRS) adalah portal enterprise pelaporan metrik jaringan (MRTG / Cacti) dan kepatuhan ketersediaan layanan (SLA Compliance) terpadu untuk pelanggan PT Internet Mulia Untuk Negeri (Nexa). Sistem ini mengotomatisasi pengumpulan graf monitoring, kalkulasi downtime tiket, alur verifikasi ganda (*Four-Eyes Principle*), penomoran dokumen resmi (`IMUN.01`), dan penerbitan laporan PDF berkualitas tinggi.

---

## 🚀 Teknologi Utama

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI primitives, Lucide Icons, Sonner
- **Database & ORM**: Prisma ORM, SQLite (`prisma/dev.db`)
- **PDF Generation**: Puppeteer Core (Chromium Headless) dengan resolusi tinggi A4
- **Integrasi NMS**: Cacti (MRTG) & PRTG Network Monitor API
- **Notifikasi**: Telegram Bot API, Nodemailer (SMTP)

---

## 📋 Prasyarat Sistem

1. **Node.js**: Versi `20.x` atau `22.x` LTS (disarankan v22+)
2. **Browser Engine**: Google Chrome atau Microsoft Edge terpasang pada server host (untuk Puppeteer PDF generator)
3. **Package Manager**: `npm` (v10+)

---

## ⚙️ Konfigurasi Variabel Lingkungan (.env)

Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

| Variabel | Wajib? | Nilai Bawaan / Contoh | Deskripsi |
|---|---|---|---|
| `DATABASE_URL` | Ya | `file:./prisma/dev.db` | URL koneksi database SQLite/Postgres Prisma |
| `AUTH_SECRET` | Ya (Prod) | *String 32+ karakter* | Kunci rahasia penandatanganan token JWT sesi |
| `CRON_SECRET` | Opsional | *String rahasia* | Token otorisasi endpoint batch kickoff via cron |
| `DEFAULT_ADMIN_PASSWORD` | Ya (Init) | `admin123` | Password akun default admin saat inisialisasi awal |
| `SECURE_COOKIES` | Opsional | `true` | Mengaktifkan flag Secure pada cookie sesi (HTTPS) |
| `PORT` | Opsional | `3000` | Port listening server Next.js |
| `PUPPETEER_EXECUTABLE_PATH`| Opsional | Auto-detect | Jalur custom executable Chromium di server Linux |

---

## 🛠️ Panduan Instalasi & Menjalankan Aplikasi

### 1. Instalasi Dependensi
```bash
npm ci
```

### 2. Inisialisasi Database
```bash
npx prisma generate
npx prisma db push
```

### 3. Mode Pengembangan (Development)
```bash
npm run dev
```
Akses aplikasi melalui peramban di `http://localhost:3000`. Akun bawaan: `admin` / (password sesuai `DEFAULT_ADMIN_PASSWORD`).

### 4. Mode Produksi (Production Build & Start)
```bash
npm run build
npm run start
```

---

## 🧪 Pengujian & Verifikasi Kualitas

```bash
# Menjalankan seluruh Unit Test otomatis
npm test

# Menjalankan Smoke Test runtime (verifikasi ketersediaan server & health check)
npm run test:smoke

# Menjalankan pemeriksaan validitas tipe TypeScript
npx tsc --noEmit
```

---

## 🐳 Deployment Menggunakan Docker

Tersedia `Dockerfile` multi-stage berbasis Alpine Linux yang aman dengan akun non-root `nextjs` dan Chromium terpasang otomatis:

```bash
# Build image Docker
docker build -t customer-reporting-system:latest .

# Jalankan kontainer
docker run -d \
  --name crs-app \
  -p 3000:3000 \
  -e AUTH_SECRET="isi-secret-32-karakter-anda-disini" \
  -e NODE_ENV="production" \
  customer-reporting-system:latest
```

---

## 🩺 Health Check & Monitoring

Aplikasi menyediakan endpoint pemantauan kesehatan sistem tanpa autentikasi untuk liveness/readiness probe Kubernetes dan Docker:

- **Endpoint**: `GET /api/health`
- **Respons Normal (HTTP 200)**:
  ```json
  {
    "status": "healthy",
    "service": "customer-reporting-system",
    "timestamp": "2026-11-18T00:00:00.000Z",
    "uptimeSeconds": 1420,
    "checks": {
      "database": {
        "status": "healthy",
        "latencyMs": 2
      },
      "memory": {
        "rssMb": 112,
        "heapUsedMb": 64,
        "heapTotalMb": 88
      }
    },
    "responseTimeMs": 3
  }
  ```

---

## 🔒 Keamanan & Kebijakan Operasional

1. **Rotasi Kredensial**: Segera ubah password akun `admin` bawaan melalui menu `/users` setelah instalasi pertama kali.
2. **Four-Eyes Principle**: Persetujuan laporan resmi membutuhkan verifikasi Supervisor departemen dan Supervisor NOC. Sistem mencegah pembuat laporan menyetujui laporannya sendiri (*Anti Self-Approval*).
3. **Hardening**: Header pertahanan keamanan HTTP (`X-Frame-Options`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`) aktif secara default pada setiap respons.

---
&copy; 2026 PT Internet Mulia Untuk Negeri (Nexa). All rights reserved.
