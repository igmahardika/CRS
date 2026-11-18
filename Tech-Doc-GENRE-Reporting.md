# Technical Documentation — GENRE Reporting System

> **Versi:** 1.0.0 | **Tanggal:** November 2026 | **Status:** Production

---

## 1. Overview Aplikasi

**GENRE Reporting System** (*customer-reporting-system*) adalah aplikasi web internal milik **PT. NEXA** yang digunakan oleh tim Network Operation Center (NOC) untuk membuat, mengelola, dan mendistribusikan laporan layanan pelanggan secara terstruktur.

Aplikasi ini mengotomatisasi pengambilan data trafik jaringan dari sistem monitoring (MRTG/Cacti dan PRTG), menghasilkan laporan dalam format PDF, dan mengelola alur persetujuan multi-departemen secara digital.

---

## 2. Tech Stack

| Layer | Teknologi | Versi |
|---|---|---|
| **Framework** | Next.js (App Router) | ^15.1.7 |
| **Runtime** | Node.js | — |
| **Bahasa** | TypeScript | ^5.7.3 |
| **UI Library** | React | ^19.0.0 |
| **Styling** | Tailwind CSS | ^3.4.17 |
| **UI Components** | Radix UI (Primitives) | ^1.x / ^2.x |
| **ORM** | Prisma | ^6.4.1 |
| **Database** | SQLite (via Prisma) | `file:./dev.db` |
| **PDF Engine** | Puppeteer Core | ^24.2.0 |
| **HTTP Client** | Axios | ^1.7.9 |
| **Notifikasi** | Nodemailer (Email) | ^10.6.0 |
| **Export** | XLSX (Excel) | ^0.18.5 |
| **Toast / Alert** | Sonner | ^2.0.8 |
| **Icon** | Lucide React | ^0.475.0 |

---

## 3. Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                      GENRE Reporting System                     │
│                       (Next.js App Router)                      │
│                                                                 │
│  ┌─────────────────┐    ┌────────────────────────────────────┐  │
│  │   Frontend UI   │    │         API Routes (Server)        │  │
│  │  (React/TSX)    │◄──►│  /api/reports, /api/customers,     │  │
│  │  Tailwind CSS   │    │  /api/users, /api/discovery,       │  │
│  │  Radix UI       │    │  /api/schedule, /api/requests      │  │
│  └─────────────────┘    └──────────────┬───────────────────── ┘  │
│                                        │                        │
│  ┌─────────────────────────────────────▼──────────────────────┐  │
│  │                    Business Logic (lib/)                    │  │
│  │  pdf-template | sla-calculator | discovery-service |       │  │
│  │  auth | permissions | mrtg-service | prtg-service          │  │
│  └──────────────────────────┬─────────────────────────────────┘  │
│                             │                                   │
│  ┌──────────────────────────▼──────────────────────────────────┐  │
│  │                  Prisma ORM → SQLite DB                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
              │                                │
              ▼                                ▼
     ┌────────────────┐             ┌──────────────────┐
     │  MRTG / Cacti  │             │  PRTG Network    │
     │  (Monitoring)  │             │  Monitor         │
     └────────────────┘             └──────────────────┘
```

---

## 4. Database Schema

Database menggunakan **SQLite** yang dikelola oleh Prisma ORM. Berikut model data utama:

### 4.1 `Customer` — Master Data Pelanggan
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | String (CUID) | Primary Key |
| `customerName` | String | Nama pelanggan |
| `customerId` | String | ID unik pelanggan |
| `serviceId` | String | ID layanan (format: `XX.XXXX.X`) |
| `serviceName` | String | Nama paket layanan |
| `nodeCount` | Int | Jumlah node |
| `targetSla` | Float | Target SLA (default: 99.5%) |
| `graphType` | String | Engine monitoring: `MRTG` atau `PRTG` |
| `cactiGraphId` | String? | Graph ID di Cacti |
| `prtgSensorId` | String? | Sensor ID di PRTG |
| `trafficDirection` | String | `NORMAL` atau `REVERSED` |
| `isMonthlyRoutine` | Boolean | Terdaftar di jadwal bulanan |
| `routineGroup` | String | Departemen tujuan: CX / AE / Finance |
| `routineReportType` | String | Tipe laporan rutin: SLA / MRTG / BOTH |

### 4.2 `Report` — Laporan yang Dihasilkan
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | String (CUID) | Primary Key |
| `reportType` | String | `MRTG` atau `SLA` |
| `documentNumber` | String (UNIQUE) | Nomor dokumen unik |
| `status` | String | Status approval (lihat Alur Approval) |
| `assignedDepartment` | String | Departemen penerima laporan |
| `onlinePercent` | Float | Persentase online bulan laporan |
| `availabilityPercent` | Float | Availability = online percent |
| `totalDowntimeMinutes` | Int | Total menit downtime |
| `pdfPath` | String? | Nama file PDF tersimpan |
| `tickets` | String? | JSON array ticket gangguan |
| `cases` | String? | JSON array case downtime |

### 4.3 `User` — Pengguna Sistem
| Field | Tipe | Keterangan |
|---|---|---|
| `username` | String (UNIQUE) | Username login |
| `role` | String | `ADMIN` / `SUPERVISOR` / `OPERATOR` / `STAFF` / `VIEWER` |
| `department` | String | Departemen (lihat Departemen) |
| `passwordHash` | String | Hash scrypt (64-byte) |
| `passwordSalt` | String | Salt (16-byte random hex) |

### 4.4 Model Lainnya
| Model | Fungsi |
|---|---|
| `AppConfig` | Konfigurasi global (URL MRTG/PRTG, SMTP, Telegram, Template) |
| `DiscoveredItem` | Cache hasil discovery perangkat dari Cacti/PRTG |
| `StaffMember` | Direktori staf NOC/CX/AE/Finance (PIC Laporan) |
| `ReportRequest` | Permintaan laporan dari departemen non-NOC |
| `MonthlyScheduleTask` | Task jadwal laporan bulanan otomatis |
| `ReportAuditLog` | Audit trail setiap aksi pada laporan |

---

## 5. Fitur Utama

### 5.1 Generator Laporan
- Mendukung dua tipe laporan: **MRTG** (grafik trafik) dan **SLA** (ketersediaan layanan)
- Mengambil grafik trafik langsung dari **Cacti** (MRTG) atau **PRTG** secara real-time
- Kalkulasi SLA otomatis berdasarkan input ticket & case downtime
- Output laporan dalam format **PDF** (via Puppeteer)
- Nomor dokumen unik dengan format `IMUN.01/...` (anti-collision)

### 5.2 SLA Calculator
Rumus perhitungan SLA:

```
totalDowntimeMinutes = Σ case.downtimeMinutes
downtimePercent      = (totalDowntimeMinutes / totalMinutesInMonth) × 100
onlinePercent        = 100 - downtimePercent
availabilityPercent  = onlinePercent
```

Dimana `totalMinutesInMonth = jumlahHariBulan × 24 × 60`

### 5.3 Discovery Service
Engine on-demand yang terkoneksi langsung ke server monitoring:
- **MRTG/Cacti**: Scraping HTML `graph_view.php`, pagination otomatis (2000 baris/halaman, batch 4 paralel, maks 60 halaman)
- **PRTG**: Konsumsi REST API `/api/table.json`, hingga 50.000 sensor sekaligus
- Parsing otomatis Service ID (`XX.XXXX.X`) dan Customer ID dari nama grafik/sensor
- Hasil disimpan ke `DiscoveredItem` untuk pencarian instan

### 5.4 Alur Persetujuan (Approval Workflow)
Sistem menggunakan **2-Tier Approval**:

```
[NOC Operator/Staff] Buat Laporan
         │
         ▼
PENDING_NOC_APPROVAL  ──► NOC Supervisor review
         │
         ▼ (disetujui Tier 1)
PENDING_DEPT_APPROVAL ──► Supervisor CX/AE/Finance review
         │
         ▼ (disetujui Tier 2)
      APPROVED ──► Laporan siap diunduh & dikirim
         │
    (jika ditolak)
         ▼
   REVISION_NEEDED ──► Operator revisi & submit ulang
```

> **Exception:** Laporan "Internal NOC" hanya memerlukan 1-Tier (Supervisor NOC langsung approve).

### 5.5 Report Request System
Departemen non-NOC (CX, AE, Finance) dapat mengajukan permintaan laporan melalui portal request:
- Nomor tiket otomatis: `REQ-YYYYMM-XXXX`
- Mendukung permintaan multi-bulan
- Urgensi: `NORMAL` atau `URGENT`
- Notifikasi email (SMTP) + Telegram otomatis

### 5.6 Monthly Routine Schedule
- Laporan SLA bulanan dapat dijadwalkan secara otomatis untuk pelanggan terdaftar
- Deadline 24 jam dari kickoff
- Status task: `PENDING` → `COMPLETED` / `FAILED_MANUAL_REQUIRED` / `BREACHED`

### 5.7 Notifikasi
| Channel | Konfigurasi | Trigger |
|---|---|---|
| **Telegram** | Bot Token + Chat ID + Thread ID | Laporan masuk, disetujui, direvisi |
| **Email (SMTP)** | SMTP Host/Port/User | Permintaan diterima, approval dibutuhkan, laporan selesai |

---

## 6. Keamanan & Autentikasi

### 6.1 Session & Token
- Autentikasi berbasis **HTTP-only Cookie** (cookie: `genre_auth`)
- Token menggunakan **JWT-like signed token** (`AUTH_SECRET` dari env)
- Durasi sesi berbeda per role (ADMIN lebih lama, dll.)
- Password di-hash menggunakan **scrypt** (salt 16-byte random, output 64-byte)

### 6.2 RBAC (Role-Based Access Control)
Sistem memiliki **5 role** dan **4 departemen**:

**Departemen:**
- `Network Operation` (NOC)
- `Customer Experience`
- `Account Executive`
- `Finance`

**Role:**
| Role | Keterangan |
|---|---|
| `ADMIN` | Akses penuh semua fitur dan konfigurasi sistem |
| `SUPERVISOR` | Approval laporan + semua operasional (NOC) atau approval Tier 2 (non-NOC) |
| `OPERATOR` | Buat laporan, kelola pelanggan, discovery (NOC only) |
| `STAFF` | Setara Operator |
| `VIEWER` | Read-only: lihat laporan approved dan request |

**Matriks Permission Utama:**
| Permission | ADMIN | NOC Supervisor | NOC Operator/Staff | NOC Viewer | Non-NOC Supervisor | Non-NOC Staff/Viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `report:create` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `report:approve` | ✅ | ✅ | ❌ | ❌ | ✅ (dept sendiri) | ❌ |
| `report:delete` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `customer:write` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `discovery:manage` | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| `request:create` | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| `system:admin` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 7. API Endpoints

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET/POST/PUT/DELETE` | `/api/reports` | CRUD laporan |
| `GET` | `/api/reports/download` | Download PDF laporan |
| `POST` | `/api/reports/approve` | Approve / reject laporan |
| `GET/POST/PUT/DELETE` | `/api/customers` | CRUD master pelanggan |
| `GET/POST/PUT/DELETE` | `/api/users` | CRUD manajemen user |
| `GET/POST` | `/api/requests` | Kelola report request |
| `GET/POST` | `/api/schedule` | Kelola jadwal bulanan |
| `GET/POST` | `/api/discovery` | Trigger discovery MRTG/PRTG |
| `GET/POST` | `/api/settings` | Baca/simpan AppConfig |
| `POST` | `/api/auth/login` | Login user |
| `POST` | `/api/auth/logout` | Logout user |
| `GET` | `/api/staff` | Master data staf |

---

## 8. Halaman / Route Frontend

| Route | Akses | Fungsi |
|---|---|---|
| `/` | NOC Operator+ | Generator laporan utama |
| `/history` | Semua user (scoped) | Riwayat & approval laporan |
| `/approvals` | Supervisor+ | Antrian approval |
| `/requests` | Semua user (scoped) | Kelola permintaan laporan |
| `/request-report` | Non-NOC Staff+ | Form permintaan laporan |
| `/customers` | NOC Operator+ | Master data pelanggan |
| `/discovery` | NOC Operator+ | Network discovery tree |
| `/schedule` | NOC Operator+ | Jadwal laporan bulanan |
| `/staff` | NOC Supervisor+ | Master data staf |
| `/users` | ADMIN only | Manajemen user |
| `/settings` | ADMIN only | Konfigurasi sistem |
| `/login` | Public | Halaman login |

---

## 9. Integrasi Sistem Eksternal

| Sistem | Protokol | Fungsi |
|---|---|---|
| **Cacti (MRTG)** | HTTP/HTTPS + Session Cookie | Ambil grafik trafik, discovery perangkat |
| **PRTG Network Monitor** | HTTP REST API | Ambil sensor data, discovery perangkat |
| **Telegram Bot API** | HTTPS | Notifikasi operasional ke grup/topik |
| **SMTP Server** | SMTP (port 587 default) | Notifikasi email ke departemen |

---

## 10. Penyimpanan File

| Path | Isi |
|---|---|
| `prisma/dev.db` | Database SQLite utama |
| `storage/reports/` | File PDF laporan yang sudah digenerate |
| `public/assets/templates/` | Template gambar cover & background PDF |

---

## 11. Environment Variables (Konfigurasi Deploy)

| Variable | Fungsi |
|---|---|
| `AUTH_SECRET` | Secret key untuk signing session token |
| `DEFAULT_ADMIN_PASSWORD` | Password default admin saat seeding |
| `SECURE_COOKIES` | Set `true` di production untuk HTTPS-only cookie |
| `NODE_ENV` | `development` / `production` |

> Konfigurasi monitoring (URL, kredensial MRTG/PRTG, SMTP, Telegram) dikelola langsung di dalam database melalui halaman **Settings** (`AppConfig`).

---

## 12. Scripts

| Command | Fungsi |
|---|---|
| `pnpm dev` | Jalankan development server |
| `pnpm build` | Build production (dengan max-old-space-size 4GB) |
| `pnpm start` | Jalankan production server |
| `pnpm test` | Jalankan unit test |
| `pnpm test:smoke` | Smoke test via script Node.js |
| `pnpm lint` | Lint kode dengan ESLint |
| `prisma generate` | Generate Prisma Client (auto-run di postinstall) |
| `prisma migrate dev` | Migrasi database development |

---

## 13. Audit Trail

Setiap aksi pada laporan dicatat di tabel `ReportAuditLog`:

| Action | Trigger |
|---|---|
| `CREATED` | Laporan baru dibuat |
| `NOC_APPROVED` | Supervisor NOC approve Tier 1 |
| `DEPT_APPROVED` | Supervisor Dept approve Tier 2 |
| `REVISION_REQUESTED` | Laporan dikembalikan untuk revisi |
| `REVISED` | Operator submit revisi laporan |
| `FINAL_APPROVED` | Laporan disetujui langsung (Internal NOC) |

---

*Dokumen ini di-generate secara otomatis dari analisis codebase pada 18 November 2026.*
