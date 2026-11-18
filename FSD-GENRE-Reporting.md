# Functional Specification Document (FSD)
## GENRE Reporting System

---

| | |
|---|---|
| **Nama Produk** | GENRE — Generator of Network Reporting |
| **Versi Dokumen** | 1.0 |
| **Status** | Final |
| **Tanggal** | 18 November 2026 |
| **Departemen Pemilik** | Network Operation Center — PT. NEXA |
| **Platform** | Web Application (Internal) — Next.js 15 |

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Arsitektur Fungsional](#2-arsitektur-fungsional)
3. [Sistem Autentikasi & Otorisasi](#3-sistem-autentikasi--otorisasi)
4. [Modul Generator Laporan](#4-modul-generator-laporan)
5. [Modul Riwayat & Approval](#5-modul-riwayat--approval)
6. [Modul Master Pelanggan](#6-modul-master-pelanggan)
7. [Modul Discovery Jaringan](#7-modul-discovery-jaringan)
8. [Modul Request Laporan](#8-modul-request-laporan)
9. [Modul Jadwal Bulanan](#9-modul-jadwal-bulanan)
10. [Modul Notifikasi](#10-modul-notifikasi)
11. [Modul Administrasi Sistem](#11-modul-administrasi-sistem)
12. [Spesifikasi Laporan PDF](#12-spesifikasi-laporan-pdf)
13. [Kalkulasi SLA](#13-kalkulasi-sla)
14. [Integrasi Sistem Eksternal](#14-integrasi-sistem-eksternal)
15. [Penanganan Error](#15-penanganan-error)

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen

Dokumen ini mendeskripsikan secara rinci spesifikasi fungsional setiap modul dalam **GENRE Reporting System** — meliputi alur kerja, logika bisnis, antarmuka pengguna, dan interaksi antar komponen sistem.

### 1.2 Ruang Lingkup Sistem

```
┌─────────────────────────────────────────────────────────────────────┐
│                      GENRE Reporting System                         │
│                                                                     │
│   NOC Operator/Staff      NOC Supervisor       Non-NOC Dept         │
│   ┌───────────────┐      ┌──────────────┐     ┌──────────────┐      │
│   │  Generator    │      │  Approval    │     │  Request     │      │
│   │  Pelanggan    │      │  Dashboard   │     │  Portal      │      │
│   │  Discovery    │      │  Schedule    │     │  History     │      │
│   └───────┬───────┘      └──────┬───────┘     └──────┬───────┘      │
│           │                    │                     │              │
│   ════════╪════════════════════╪═════════════════════╪═══════════   │
│           │       Core System  │                     │              │
│           ▼                    ▼                     ▼              │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  API Layer (Next.js Route Handlers)                         │   │
│   │  Auth Guard │ RBAC │ Report CRUD │ PDF Generator            │   │
│   └─────────────────────────────┬───────────────────────────────┘   │
│                                 │                                   │
│                    ┌────────────▼────────────┐                      │
│                    │   SQLite DB (Prisma)    │                      │
│                    └─────────────────────────┘                      │
│                                                                     │
│   External: Cacti (MRTG) │ PRTG │ Telegram Bot │ SMTP Server       │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Konvensi Dokumen

| Istilah | Makna |
|---|---|
| **Operator** | NOC Operator atau NOC Staff |
| **Supervisor NOC** | Supervisor dari departemen Network Operation |
| **Dept. Supervisor** | Supervisor dari CX / AE / Finance |
| **Non-NOC** | Pengguna dari departemen CX, AE, atau Finance |
| **MRTG/Cacti** | Sistem monitoring trafik jaringan berbasis Cacti |
| **PRTG** | Paessler Router Traffic Grapher (monitoring komersial) |

---

## 2. Arsitektur Fungsional

### 2.1 Alur Data Utama

```
sequenceDiagram
    Operator->>Generator: Pilih pelanggan & periode
    Generator->>Cacti/PRTG: Fetch grafik & data trafik
    Cacti/PRTG-->>Generator: Return grafik (base64) + statistik
    Operator->>Generator: Input tiket & downtime, simpan
    Generator->>API: POST /api/reports
    API->>Database: Simpan record laporan
    API->>Puppeteer: Generate PDF
    Puppeteer-->>API: Return PDF buffer
    API->>Storage: Simpan file PDF
    API->>Telegram: Kirim notifikasi
    API-->>Generator: Return {reportId, downloadUrl}
    Generator-->>Operator: Tampilkan konfirmasi & link
    Operator->>History: Lihat laporan di antrian
    Supervisor->>History: Approve laporan
    API->>Database: Update status APPROVED
    API->>Email: Kirim notifikasi ke dept
```

### 2.2 Hierarki Navigasi

```
/ (Login)
│
├── / (Generator Laporan)          → NOC Operator+
├── /history                       → Semua user (scoped)
├── /requests                      → Semua user (scoped)
│   └── ?new=1                     → Drawer form request baru
├── /schedule                      → NOC Operator+
├── /customers                     → NOC Operator+
├── /discovery                     → NOC Operator+
├── /staff                         → NOC Supervisor+
├── /users                         → ADMIN only
└── /settings                      → ADMIN only
```

---

## 3. Sistem Autentikasi & Otorisasi

### 3.1 Halaman Login

**[Screenshot: 01-login.png]**

#### Spesifikasi Fungsional

| Komponen | Spesifikasi |
|---|---|
| Form input | Username (text) + Password (password, masked) |
| Tombol | "Sign In" — submit form |
| Validasi | Kedua field wajib diisi sebelum submit |
| Error state | Pesan error ditampilkan di atas form saat kredensial salah |
| Loading state | Tombol berubah jadi disabled + spinner saat proses login |
| Redirect sukses | NOC → `/`, Non-NOC → `/requests`, Admin → `/` |

#### Alur Login

```
[User buka browser]
        │
        ▼
[Halaman /login tampil]
        │
[User isi username + password]
        │
        ▼
[POST /api/auth/login]
        │
   ┌────┴─────┐
   │          │
Sukses      Gagal
   │          │
   ▼          ▼
[Set        [Tampilkan
 Cookie]     pesan error]
   │
   ▼
[Redirect ke halaman default role]
```

#### Mekanisme Keamanan

- Password diverifikasi menggunakan **scrypt** (salt 16-byte random, output 64-byte)
- Token sesi menggunakan HMAC-signed JWT-like payload (`AUTH_SECRET`)
- Cookie bersifat **HttpOnly** + **SameSite=Lax** (tidak bisa diakses JS)
- Cookie **Secure=true** di production (HTTPS only)
- Durasi sesi berbeda per role (Admin lebih lama dari Viewer)

### 3.2 Matriks Hak Akses

| Halaman / Fitur | ADMIN | NOC Sup | NOC Op/Staff | NOC Viewer | Non-NOC Sup | Non-NOC Staff | Non-NOC Viewer |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Generator (`/`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Riwayat semua status | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Riwayat scoped (approved) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve laporan | ✅ | ✅ | ❌ | ❌ | ✅* | ❌ | ❌ |
| Hapus laporan | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Master Pelanggan | ✅ | ✅ | ✅ | ✅ (read) | ❌ | ❌ | ❌ |
| Edit Pelanggan | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Discovery | ✅ | ✅ | ✅ | ✅ (read) | ❌ | ❌ | ❌ |
| Request laporan | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| Jadwal bulanan | ✅ | ✅ | ✅ | ✅ (read) | ❌ | ❌ | ❌ |
| Manajemen User | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Pengaturan Sistem | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> *Non-NOC Supervisor hanya dapat approve laporan yang ditujukan ke departemennya sendiri

---

## 4. Modul Generator Laporan

**[Screenshot: 02-generator.png]**

### 4.1 Deskripsi Modul

Generator adalah halaman utama bagi NOC Operator untuk membuat laporan pelanggan. Halaman ini terintegrasi langsung dengan sistem monitoring (Cacti/PRTG) dan menghasilkan PDF secara otomatis.

### 4.2 Komponen Halaman

```
┌─────────────────────────────────────────────────────────────┐
│  [Page Header] Generator Laporan                            │
├──────────────────────────┬──────────────────────────────────┤
│  PANEL KIRI              │  PANEL KANAN (Live Preview)      │
│                          │                                  │
│  [1] Tipe Laporan        │  ┌──────────────────────────┐    │
│      ○ MRTG  ○ SLA       │  │   PREVIEW PDF REAL-TIME  │    │
│                          │  │                          │    │
│  [2] Data Pelanggan      │  │   [Cover]                │    │
│      [Cari Pelanggan]    │  │   [Data]                 │    │
│      Nama: ___________   │  │   [Grafik]               │    │
│      Customer ID: ____   │  │   [SLA]                  │    │
│      Service ID: _____   │  │                          │    │
│      Paket: __________   │  └──────────────────────────┘    │
│      Node: ___  SLA: _   │                                  │
│                          │  [Download Draft PDF]            │
│  [3] Periode & No. Dok   │                                  │
│      Bulan: [   ▼]       │                                  │
│      Tahun: [    ]       │                                  │
│      No. Dok: [______]   │                                  │
│                          │                                  │
│  [4] Sumber Data Grafik  │                                  │
│      Engine: MRTG○ PRTG○ │                                  │
│      Graph ID: [______]  │                                  │
│      [Fetch Cacti ↑]     │                                  │
│      DL Avg: ___ Max: __ │                                  │
│      UL Avg: ___ Max: __ │                                  │
│                          │                                  │
│  [5] Tiket & Case        │                                  │
│      [+ Tambah Tiket]    │                                  │
│      [+ Tambah Case]     │                                  │
│                          │                                  │
│  [6] Target Dept         │                                  │
│      [Internal NOC ▼]    │                                  │
│                          │                                  │
│  [Reset]  [Simpan 💾]    │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

### 4.3 Alur Kerja Detail

#### Step 1 — Pilih Tipe Laporan
- Toggle antara **MRTG** dan **SLA**
- Jika dari URL dengan `type=BOTH`, wizard 2-langkah aktif (SLA dulu, lalu MRTG)
- Mempengaruhi tampilan cover PDF dan kolom yang ditampilkan

#### Step 2 — Pilih Pelanggan
- Tombol "Cari Pelanggan" membuka modal pencarian direktori
- Pencarian real-time berdasarkan nama, Customer ID, atau Service ID
- Setelah dipilih: semua field (nama, ID, paket, node, SLA) terisi otomatis
- Graph ID (Cacti atau PRTG) juga terisi otomatis dari data pelanggan

#### Step 3 — Periode & Nomor Dokumen
- Default: bulan sebelumnya dari bulan saat ini
- Nomor dokumen digenerate otomatis dari API saat halaman dimuat
- Format: `PREFIX/TYPE/MM-YYYY/SEQ` (contoh: `IMUN.01/SLA/10-2026/0042`)
- Nomor dokumen dapat diedit manual (toggle manual mode)

#### Step 4 — Fetch Data Grafik
**Alur Fetch Cacti (MRTG):**
```
[Tombol Fetch Cacti diklik]
        │
        ▼
[GET /api/cacti-graph?graphId=XXXX&period=MM-YYYY]
        │
   ┌────┴──────────────────────────┐
Sukses                           Error
   │                               │
   ▼                               ▼
[Tampil grafik (img base64)]   [Tampil pesan error]
[Isi DL Avg, DL Max]           [Operator input manual]
[Isi UL Avg, UL Max]
[Isi unit (Mbps/Kbps)]
```

**Alur Fetch PRTG:**
```
[Tombol Fetch PRTG diklik]
        │
        ▼
[GET /api/prtg-graph?sensorId=XXXX&period=MM-YYYY]
        │
   ┌────┴──────────────────────────┐
Sukses                           Error
   │                               │
   ▼                               ▼
[Tampil grafik + statistik]    [Tampil pesan error]
```

**Status indikator fetch:**
- 🔵 Loading — sedang mengambil data
- ✅ Sukses — grafik & data berhasil diambil
- ⚠️ Warning — partial data (grafik ada tapi statistik tidak lengkap)
- ❌ Error — koneksi gagal atau autentikasi ditolak

#### Step 5 — Input Tiket & Case

**Tabel Tiket Gangguan:**
| Kolom | Tipe Input | Keterangan |
|---|---|---|
| No. Tiket | Text | Nomor tiket helpdesk |
| Tanggal | Date | Tanggal tiket dibuat |
| Waktu Mulai | Datetime | Awal gangguan |
| Waktu Selesai | Datetime | Akhir gangguan |
| Deskripsi | Text | Uraian gangguan |
| Tindakan | Text | Langkah penyelesaian |
| Status | Select | Open / Closed / In Progress |

**Tabel Case Downtime:**
| Kolom | Tipe Input | Keterangan |
|---|---|---|
| No. Case | Text | Nomor case downtime |
| Tanggal | Date | Tanggal kejadian |
| Waktu Mulai | Datetime | Awal downtime |
| Waktu Selesai | Datetime | Akhir downtime |
| Durasi (menit) | Number | Menit downtime — **digunakan untuk kalkulasi SLA** |
| Deskripsi | Text | Keterangan downtime |
| Tindakan | Text | Resolusi |

#### Step 6 — Simpan Laporan

```
[Tombol Simpan diklik]
        │
        ▼
[Validasi: pelanggan & periode terisi?]
        │
   ┌────┴───────┐
   Ya          Tidak
   │            │
   ▼            ▼
[POST        [Tampil
/api/reports] pesan validasi]
   │
   ▼
[DB: simpan record]
   │
   ▼
[PDF: generate via Puppeteer]
   │
   ▼
[Storage: simpan file PDF]
   │
   ▼
[Telegram: kirim notifikasi]
   │
   ▼
[Tampilkan konfirmasi:
 No. Dokumen + link Riwayat]
```

### 4.4 Mode Khusus

| Mode | Trigger | Perbedaan Perilaku |
|---|---|---|
| **Revisi** | URL `?revisingReportId=ID` | Banner catatan revisi tampil, simpan = PUT (update) bukan POST |
| **Mode BOTH** | URL `?isBoth=1` | Wizard 2-langkah: selesai SLA → modal transisi → mulai MRTG |
| **Pre-fill Request** | URL `?requestId=ID` | Data pelanggan & periode terisi dari data request |
| **Pre-fill Schedule** | URL `?scheduleTaskId=ID` | Data dari task jadwal, task otomatis COMPLETED setelah simpan |

---

## 5. Modul Riwayat & Approval

**[Screenshot: 03-history.png]**

### 5.1 Deskripsi Modul

Halaman ini menampilkan daftar laporan yang sudah dibuat, dengan fungsi approval, unduhan, revisi, dan penghapusan. Visibilitas laporan dibatasi berdasarkan role dan departemen pengguna.

### 5.2 Layout Halaman

```
┌─────────────────────────────────────────────────────────────┐
│  [Page Header] Riwayat & Approval Laporan                   │
├─────────────────────────────────────────────────────────────┤
│  [StatCard: Total] [Pending] [Approved] [Revision]          │
├─────────────────────────────────────────────────────────────┤
│  [🔍 Cari...] [Filter Status ▼] [Filter Tipe ▼] [Periode ▼] │
├─────────────────────────────────────────────────────────────┤
│  No. Dokumen │ Pelanggan │ Tipe │ Periode │ Status │ Aksi   │
│  ────────────┼───────────┼──────┼─────────┼────────┼─────── │
│  IMUN.01/... │ PT. ABC   │ SLA  │ Okt 26  │ 🟡PEND │ [...]  │
│  IMUN.01/... │ PT. XYZ   │ MRTG │ Okt 26  │ ✅APP  │ [...]  │
│  IMUN.01/... │ CV. DEF   │ SLA  │ Sep 26  │ 🔴REV  │ [...]  │
├─────────────────────────────────────────────────────────────┤
│  [◀ Prev]  Hal 1 / 5  [Next ▶]                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Badge Status

| Status | Warna | Deskripsi |
|---|---|---|
| `PENDING_NOC_APPROVAL` | 🟡 Kuning | Menunggu review Supervisor NOC |
| `PENDING_DEPT_APPROVAL` | 🔵 Biru | Menunggu review Supervisor Departemen |
| `APPROVED` | 🟢 Hijau | Disetujui, laporan dapat diunduh |
| `REVISION_NEEDED` | 🔴 Merah | Dikembalikan, menunggu revisi operator |

### 5.4 Dropdown Aksi per Baris

Tombol `[···]` (MoreVertical) membuka dropdown menu:

| Aksi | Tersedia untuk | Kondisi |
|---|---|---|
| Lihat Detail | Semua user | Selalu |
| Download PDF | User yang berwenang | Status = APPROVED |
| Approve | Supervisor sesuai tier | Status = PENDING_X |
| Kembalikan (Reject) | Supervisor sesuai tier | Status = PENDING_X |
| Revisi | NOC Operator/Admin | Status = REVISION_NEEDED |
| Hapus | ADMIN / NOC Supervisor | Selalu |

### 5.5 Modal Detail Laporan

Menampilkan seluruh informasi laporan dalam tab:
- **Tab Info** — data pelanggan, periode, statistik SLA
- **Tab Tiket** — tabel tiket gangguan
- **Tab Case** — tabel case downtime
- **Tab Histori Approval** — audit trail kronologis

### 5.6 Alur Approval Tier 1 (NOC Supervisor)

```
[Supervisor klik Approve pada laporan PENDING_NOC_APPROVAL]
        │
        ▼
[POST /api/reports/approve {action: "noc_approve"}]
        │
        ▼
[DB: update status → PENDING_DEPT_APPROVAL]
        │
        ▼
[DB: set nocApprovedById, nocApprovedAt]
        │
        ▼
[DB: insert ReportAuditLog action="NOC_APPROVED"]
        │
        ▼
[Telegram: notifikasi ke dept. tujuan]
        │
        ▼
[UI: refresh daftar, toast "Laporan disetujui Tier 1"]
```

### 5.7 Alur Reject / Revision

```
[Supervisor klik Kembalikan]
        │
        ▼
[Dialog: Wajib isi catatan revisi]
        │
        ▼
[POST /api/reports/approve {action: "reject", notes: "..."}]
        │
        ▼
[DB: update status → REVISION_NEEDED]
        │
        ▼
[DB: simpan rejectionNotes]
        │
        ▼
[DB: insert AuditLog action="REVISION_REQUESTED"]
        │
        ▼
[UI: laporan tampil badge merah]
[NOC Operator: tombol Revisi mengarah ke Generator dengan pre-fill]
```

---

## 6. Modul Master Pelanggan

**[Screenshot: 06-customers.png]**

### 6.1 Deskripsi Modul

Direktori terpusat seluruh pelanggan yang layanannya perlu dilaporkan, lengkap dengan konfigurasi monitoring dan pengaturan laporan rutin.

### 6.2 Layout Halaman

```
┌─────────────────────────────────────────────────────────────┐
│  [Page Header] Master Pelanggan           [+ Tambah] [Impor]│
├─────────────────────────────────────────────────────────────┤
│  [StatCard: Total] [Routine] [Has Cacti] [Has PRTG]         │
├─────────────────────────────────────────────────────────────┤
│  [Tab: ALL│ROUTINE│HAS_CACTI│HAS_PRTG│HAS_BOTH│NO_GRAPH]   │
│  [🔍 Cari...] [Jenis Layanan ▼] [Target SLA ▼]             │
├─────────────────────────────────────────────────────────────┤
│  ☐ │ Nama Pelanggan ↕ │ Cust.ID ↕ │ Service ID ↕ │ ...     │
│  ☐ │ PT. ABC          │ 01.0001   │ 01.0001.1    │ ...     │
├─────────────────────────────────────────────────────────────┤
│  [Ekspor Excel]  [Hapus Terpilih ⚠]  Halaman: [◀][1][▶]   │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Form Tambah/Edit Pelanggan

| Field | Tipe | Validasi | Keterangan |
|---|---|---|---|
| Nama Pelanggan | Text | Wajib | Nama perusahaan/pelanggan |
| Customer ID | Text | Wajib | Format bebas, unik per pelanggan |
| Service ID | Text | Wajib | Format: `XX.XXXX.X` |
| Nama Layanan | Text | Wajib | Contoh: "Prime 300 Mbps" |
| Jumlah Node | Number | Min: 1 | Default: 1 |
| Target SLA (%) | Number | 0–100 | Default: 99.5 |
| Engine Monitoring | Select | Wajib | MRTG / PRTG |
| Cacti Graph ID | Text | Opsional | Digunakan jika engine = MRTG |
| PRTG Sensor ID | Text | Opsional | Digunakan jika engine = PRTG |
| Arah Trafik | Select | Wajib | NORMAL / REVERSED |
| Jadwal Bulanan | Toggle | — | Aktifkan laporan rutin |
| Grup Rutinitas | Select | Jika Routine ON | CX / AE / Finance |
| Tipe Laporan Rutin | Select | Jika Routine ON | SLA / MRTG / BOTH |
| PIC Sales | Select | Opsional | Dari direktori staf AE |
| PIC CE | Select | Opsional | Dari direktori staf CX |

### 6.4 Fitur Import Excel

```
[User klik Impor]
        │
        ▼
[Modal Import tampil]
        │
[User upload file .xlsx]
        │
        ▼
[Frontend parse Excel]
        │
        ▼
[Preview: tabel baris-baris data + highlight error]
        │
        ▼
[User klik Konfirmasi Import]
        │
        ▼
[POST /api/customers/import]
        │
        ▼
[Proses batch insert ke DB]
        │
        ▼
[Summary: X berhasil, Y gagal]
```

---

## 7. Modul Discovery Jaringan

**[Screenshot: 07-discovery.png]**

### 7.1 Deskripsi Modul

Engine on-demand yang terhubung langsung ke Cacti dan PRTG untuk menemukan dan mendaftarkan seluruh perangkat dan interface ke database lokal, memudahkan pemetaan ke data pelanggan.

### 7.2 Layout Halaman

```
┌─────────────────────────────────────────────────────────────┐
│  [Page Header] Discovery Jaringan                           │
├─────────────────────────────────────────────────────────────┤
│  [StatCard: MRTG Items] [PRTG Items]                        │
│  [Sync MRTG (Cacti) ↺]  Last sync: 18 Nov 2026 09:15       │
│  [Sync PRTG ↺]          Last sync: 18 Nov 2026 09:20       │
├─────────────────────────────────────────────────────────────┤
│  [Filter: MRTG○ PRTG○ Both○]  [🔍 Cari perangkat...]       │
├─────────────────────────────────────────────────────────────┤
│  DISCOVERY TREE                                             │
│  ▼ Customers                                                │
│    ▼ Switch-Core-01 (192.168.1.1)                           │
│       ├─ ether1 [ID: 54619] [SID: 01.0001.1] ✅ [🗺️] [📋] │
│       └─ ether2 [ID: 54620] [SID: —]         ✅ [🗺️] [📋] │
│    ► Switch-Core-02 (192.168.1.2)                           │
│  ► Mainlink / Core                                          │
│  ► Infrastructure / NOC                                     │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Alur Discovery MRTG (Cacti)

```
[Tombol Sync MRTG diklik]
        │
        ▼
[POST /api/discovery {engine: "MRTG"}]
        │
        ▼
[Server: Autentikasi ke Cacti (session cookie)]
        │
        ▼
[Fetch Page 1: graph_view.php?action=list&rows=2000]
        │
        ▼
[Parse HTML: ekstrak local_graph_id + nama grafik]
        │
        ▼
[Hitung total halaman dari "X to Y of TOTAL"]
        │
        ▼
[Fetch halaman 2–N secara paralel (batch 4)]
        │
        ▼
[Merge semua hasil, deduplikasi by targetId]
        │
        ▼
[Parsing nama: ekstrak device, interface, groupName]
        │
        ▼
[Ekstrak Service ID & Customer ID dari nama]
        │
        ▼
[Simpan ke DB: DiscoveredItem (upsert)]
        │
        ▼
[Return summary: X devices, Y interfaces]
```

### 7.4 Pemetaan Interface ke Pelanggan

```
[Operator klik ikon 🗺️ pada interface]
        │
        ▼
[Modal pemetaan tampil]
[Auto-fill Service ID dari detectedSid]
        │
[Operator verifikasi / ubah Service ID]
        │
        ▼
[Klik "Cari Pelanggan"]
        │
        ▼
[GET /api/customers?serviceId=XX.XXXX.X]
        │
   ┌────┴────────────────┐
Ditemukan             Tidak ditemukan
   │                       │
   ▼                       ▼
[Tampil nama          [Pesan: pelanggan
 pelanggan]            tidak ada di DB]
   │
[Klik Simpan Pemetaan]
   │
   ▼
[PUT /api/customers: update cactiGraphId / prtgSensorId]
```

---

## 8. Modul Request Laporan

**[Screenshot: 04-requests.png]**

### 8.1 Deskripsi Modul

Portal self-service bagi departemen non-NOC untuk mengajukan permintaan laporan kepada tim NOC secara formal dan terstruktur.

### 8.2 Layout Halaman

```
┌─────────────────────────────────────────────────────────────┐
│  [Page Header] Antrian Permintaan Laporan  [+ Request Baru] │
├─────────────────────────────────────────────────────────────┤
│  [StatCard: Total] [Pending] [In Progress] [Completed]      │
├─────────────────────────────────────────────────────────────┤
│  [🔍 Cari...] [Filter Status ▼]                            │
├─────────────────────────────────────────────────────────────┤
│  No. Tiket │ Pemohon │ Dept │ Pelanggan │ Urgensi │ Status  │
│  ──────────┼─────────┼──────┼───────────┼─────────┼──────── │
│  REQ-...01 │ Budi S  │ CX   │ PT. ABC   │ NORMAL  │ 🟡PEND  │
│  REQ-...02 │ Rina M  │ AE   │ PT. XYZ   │ 🔴URGENT│ ⚙️ IP   │
├─────────────────────────────────────────────────────────────┤
│  [Share Link Form Request 🔗]                               │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Form Permintaan Baru (Drawer)

| Field | Tipe | Validasi | Keterangan |
|---|---|---|---|
| Nama Pelanggan | Text (Autocomplete) | Wajib | Pencarian dari DB pelanggan |
| Customer ID | Text | Opsional | Auto-fill dari pilihan pelanggan |
| Service ID | Text | Opsional | Auto-fill dari pilihan pelanggan |
| Tipe Laporan | Select | Wajib | SLA / MRTG / BOTH |
| Periode | Month-Year | Wajib | Minimal 1 periode |
| Multi-periode | Toggle | Opsional | Tambah periode lebih dari satu |
| Nama Pemohon | Text | Wajib | Nama staff yang mengajukan |
| Email Pemohon | Email | Opsional | Untuk notifikasi balasan |
| PIC Sales | Text | Opsional | Nama Account Executive |
| PIC CE | Text | Opsional | Nama Customer Experience |
| Urgensi | Radio | Wajib | NORMAL / URGENT |
| Catatan | Textarea | Opsional | Keterangan tambahan |

### 8.4 Status Request & Transisi

| Status | Kode | Deskripsi | Transisi ke |
|---|---|---|---|
| Menunggu | `PENDING` | Baru dibuat, belum diproses | IN_PROGRESS, CANCELLED |
| Diproses | `IN_PROGRESS` | NOC sedang mengerjakan | COMPLETED, PENDING |
| Jadwal Rutin | `SCHEDULED_ROUTINE` | Bagian dari jadwal bulanan | COMPLETED |
| Selesai | `COMPLETED` | Laporan terkait sudah APPROVED | — |
| Dibatalkan | `CANCELLED` | Dibatalkan oleh pemohon | — |

---

## 9. Modul Jadwal Bulanan

**[Screenshot: 05-schedule.png]**

### 9.1 Deskripsi Modul

Sistem manajemen task laporan rutin bulanan untuk pelanggan yang terdaftar dalam program routine, dengan tracking deadline 24 jam.

### 9.2 Layout Halaman

```
┌─────────────────────────────────────────────────────────────┐
│  [Page Header] Jadwal Laporan Bulanan      [Kickoff Bulan]  │
├─────────────────────────────────────────────────────────────┤
│  [StatCard: Total] [✅Selesai] [⏳Pending] [❌Breached]      │
│  Progress: ████████░░ 78%                                   │
├─────────────────────────────────────────────────────────────┤
│  [Bulan ▼] [Tahun ▼] [Dept ▼] [Kategori ▼] [Status ▼]     │
├─────────────────────────────────────────────────────────────┤
│  Pelanggan   │ Tipe │ Dept │ Deadline      │ Status  │ Aksi │
│  ────────────┼──────┼──────┼───────────────┼─────────┼───── │
│  PT. ABC     │ SLA  │ CX   │ 19/11 09:00   │ ⏳ PEND │[▶]  │
│  PT. XYZ     │ MRTG │ AE   │ 18/11 14:00   │ ✅DONE  │[👁] │
│  CV. DEF     │ BOTH │ FIN  │ 17/11 08:00   │ 🔴BREACH│[!]  │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 Proses Kickoff

```
[Supervisor klik Kickoff Bulan ini]
        │
        ▼
[Konfirmasi: "Akan membuat X task untuk Y pelanggan Routine"]
        │
        ▼
[POST /api/schedule/kickoff {month, year}]
        │
        ▼
[Query: semua Customer dengan isMonthlyRoutine = true]
        │
        ▼
[Untuk setiap pelanggan: buat MonthlyScheduleTask]
  - kickoffTime = now()
  - deadlineTime = now() + 24 hours
  - status = "PENDING"
        │
        ▼
[Telegram: notifikasi jadwal dimulai]
        │
        ▼
[UI: refresh tabel, tampil semua task baru]
```

### 9.4 Mekanisme Deadline

| Waktu | Kejadian |
|---|---|
| T+0 | Kickoff — task dibuat, deadline = T+24 jam |
| T+24 jam | Jika masih PENDING → otomatis jadi `BREACHED` |
| T+N (kapan saja) | Operator selesai → task jadi `COMPLETED` |

---

## 10. Modul Notifikasi

### 10.1 Notifikasi Telegram

Semua notifikasi dikirim ke grup/topik Telegram yang dikonfigurasi melalui Telegram Bot API.

| Event | Pesan |
|---|---|
| Laporan masuk antrian | 📋 [LAPORAN MASUK ANTRIAN APPROVAL] + detail pelanggan + nama pembuat |
| Laporan disetujui langsung | ✅ [LAPORAN SELESAI & DISETUJUI LANGSUNG] + detail |
| Laporan direvisi | 🔄 [DOKUMEN TELAH DIREVISI & DIKIRIM ULANG] + detail |

**Format pesan Telegram (HTML):**
```html
📋 <b>[LAPORAN MASUK ANTRIAN APPROVAL]</b>

• <b>Pelanggan:</b> PT. ABC Indonesia
• <b>Service ID:</b> <code>01.0001.1</code>
• <b>Tipe:</b> SLA (MRTG)
• <b>Periode:</b> October 2026
• <b>No. Dokumen:</b> <code>IMUN.01/SLA/10-2026/0042</code>
• <b>Tujuan Dept:</b> <b>Customer Experience</b>
• <b>Alur Approval:</b> <i>2-Tier (NOC → Supervisor CX)</i>
• <b>Dibuat oleh:</b> Dito Santoso (OPERATOR)
• <b>Waktu:</b> 18/11/2026, 09:30:00 WIB
• <b>Status:</b> ⏳ <b>Menunggu Verifikasi Supervisor NOC</b>
```

### 10.2 Notifikasi Email (SMTP)

| Event | Penerima | Template |
|---|---|---|
| Permintaan laporan diterima | NOC (emailDeptHelpdesk) | emailTemplateRequestReceived |
| Laporan selesai diproses | Pemohon (email dept terkait) | emailTemplateReportApproved |
| Approval dibutuhkan | Dept. Supervisor | emailTemplateApprovalNeeded |

**Konfigurasi SMTP:**
| Parameter | Keterangan |
|---|---|
| SMTP Host | Server email (mis. smtp.nexa.net.id) |
| SMTP Port | 587 (default, STARTTLS) |
| SMTP Secure | false (STARTTLS) / true (SSL/TLS port 465) |
| From Email | noreply-genre@nexa.net.id |
| From Name | NEXA GENRE Reporting |

---

## 11. Modul Administrasi Sistem

### 11.1 Manajemen Pengguna

**[Screenshot: 09-users.png]**

Halaman ini hanya dapat diakses oleh role **ADMIN**.

**Kolom tabel:**
- Username, Nama Lengkap, Email, Departemen, Role, Status (Aktif/Nonaktif), Login Terakhir

**Aksi yang tersedia:**
- Tambah pengguna baru
- Edit data pengguna (termasuk reset password)
- Toggle aktif/nonaktif

**Validasi:**
- Username harus unik di seluruh sistem
- Password minimal 8 karakter
- Email harus valid jika diisi

### 11.2 Konfigurasi Sistem (Settings)

**[Screenshot: 08-settings.png]**

Halaman konfigurasi global yang tersimpan di tabel `AppConfig` (singleton).

**Seksi 1 — Koneksi MRTG (Cacti):**
| Field | Keterangan |
|---|---|
| Base URL | URL server Cacti (contoh: `https://cacti.internal.net`) |
| Username | Username login Cacti |
| Password | Password login Cacti |
| Auth Type | BASIC (HTTP Basic Auth) / COOKIE (session-based) |

**Seksi 2 — Koneksi PRTG:**
| Field | Keterangan |
|---|---|
| Base URL | URL server PRTG |
| Username | Username PRTG |
| Password | Password atau Passhash PRTG |
| Auth Type | PASSWORD / PASSHASH |
| Basic Auth Username | Username untuk Nginx reverse proxy |
| Basic Auth Password | Password untuk Nginx reverse proxy |

**Seksi 3 — Dokumen:**
| Field | Keterangan |
|---|---|
| Prefix Nomor Dokumen | Contoh: `IMUN.01` |
| Target SLA Default | Contoh: `99.5` |
| Template Cover MRTG | Path gambar cover PDF MRTG |
| Template Cover SLA | Path gambar cover PDF SLA |
| Background Halaman | Path gambar background halaman PDF |

**Seksi 4 — Telegram:**
| Field | Keterangan |
|---|---|
| Bot Token | Token dari BotFather Telegram |
| Chat ID | ID grup/channel tujuan |
| Thread ID | ID topik (untuk grup dengan Topics) |
| Aktifkan Notifikasi | Toggle on/off |
| [Test Kirim Telegram] | Tombol uji koneksi |

**Seksi 5 — Email (SMTP):**
| Field | Keterangan |
|---|---|
| SMTP Host | Hostname server SMTP |
| SMTP Port | Port (default: 587) |
| SMTP Secure | Toggle SSL/TLS |
| Username SMTP | Akun email pengirim |
| Password SMTP | Password email |
| From Email | Alamat pengirim |
| From Name | Nama pengirim |
| Email Dept. Sales | Distribusi list AE |
| Email Dept. CX | Distribusi list CX |
| Email Dept. Finance | Distribusi list Finance |
| Email Helpdesk | Email NOC/Helpdesk |

---

## 12. Spesifikasi Laporan PDF

### 12.1 Struktur Halaman PDF

Laporan PDF dihasilkan menggunakan **Puppeteer Core** yang me-render HTML/CSS ke file PDF.

**Spesifikasi Kertas:**
- Ukuran: A4 Portrait (210mm × 297mm)
- Margin: 0 (layout full-bleed dengan padding internal)
- Resolusi: standard print quality

**Halaman 1 — Cover:**
```
┌─────────────────────────────────┐
│  [Background: cover_mrtg.png /  │
│   cover_sla.png]                │
│                                 │
│  Logo Perusahaan                │
│                                 │
│  LAPORAN [MRTG / SLA]           │
│  LAYANAN INTERNET               │
│                                 │
│  Pelanggan: PT. ABC Indonesia   │
│  Service ID: 01.0001.1          │
│  Periode: October 2026          │
│  No. Dokumen: IMUN.01/SLA/...   │
│                                 │
│  [CONFIDENTIAL badge]           │
└─────────────────────────────────┘
```

**Halaman 2 — Data Pelanggan & Grafik:**
```
┌─────────────────────────────────┐
│  [Background: page_bg.png]      │
│                                 │
│  Informasi Layanan:             │
│  Nama Pelanggan | Service ID    │
│  Nama Layanan   | Node Count    │
│  Periode        | Target SLA    │
│                                 │
│  [Grafik Trafik Jaringan]       │
│  (image grafik dari MRTG/PRTG)  │
│                                 │
│  Statistik Bandwidth:           │
│  DL Avg | DL Max | UL Avg | UL Max │
└─────────────────────────────────┘
```

**Halaman 3 — Kalkulasi SLA (SLA Report):**
```
┌─────────────────────────────────┐
│  Hasil Kalkulasi SLA:           │
│  Online: 99.98% | Downtime: 0.02% │
│  Total Downtime: 30 mins        │
│  Availability: 99.98%           │
│  Target SLA: 99.5% → ✅ MET     │
│                                 │
│  Tabel Tiket Gangguan:          │
│  No.Tiket | Tanggal | Durasi | Deskripsi │
│                                 │
│  Tabel Case Downtime:           │
│  No.Case | Waktu Mulai-Selesai | Menit │
└─────────────────────────────────┘
```

**Halaman 4+ (Opsional) — Overflow Tabel:**
Jika total baris tiket + case > 4, tabel dipecah ke halaman terpisah secara otomatis untuk mencegah overflow.

### 12.2 Logika Pagination PDF Dinamis

```
isMultiPageTables = isSLA AND
  (tickets.length + cases.length > 4 OR
   tickets.length > 3 OR
   cases.length > 3)

Jika isMultiPageTables = true:
  - Halaman 2: Data pelanggan (tanpa grafik)
  - Halaman 3: Tiket
  - Halaman 4: Case / SLA summary
  - Halaman 5: Grafik trafik
Jika false:
  - Halaman 2: Data pelanggan + grafik + SLA + tabel (1 halaman)
```

---

## 13. Kalkulasi SLA

### 13.1 Formula

$$\text{Availability} (\%) = 100 - \left(\frac{\sum \text{Downtime Minutes}}{\text{Total Minutes in Month}} \times 100\right)$$

**Detail komponen:**

| Variabel | Sumber | Contoh |
|---|---|---|
| `totalDowntimeMinutes` | Σ `case.downtimeMinutes` dari semua baris Case | 30 menit |
| `totalMinutesInMonth` | `daysInMonth × 24 × 60` | Oktober: 31×24×60 = 44.640 menit |
| `downtimePercent` | `(downtime / total) × 100` | 0.067% |
| `onlinePercent` | `100 - downtimePercent` | 99.933% |
| `availabilityPercent` | `= onlinePercent` | 99.933% |

### 13.2 Format Output

| Metric | Format Tampil | Contoh |
|---|---|---|
| Online % | 2 desimal | `99.93%` |
| Downtime % | 2 desimal | `0.07%` |
| Availability % | 2 desimal | `99.93%` |
| Durasi Downtime | Jam & menit | `1 hrs 30 mins` / `-` jika 0 |

### 13.3 Penanganan Bulan Kabisat

Fungsi `getDaysInMonth(year, month)` menggunakan `new Date(year, month, 0).getDate()` yang otomatis memperhitungkan tahun kabisat untuk bulan Februari.

---

## 14. Integrasi Sistem Eksternal

### 14.1 Integrasi Cacti (MRTG)

**Autentikasi:**
- **BASIC**: HTTP Basic Auth header (`Authorization: Basic base64(user:pass)`)
- **COOKIE**: Form login → session cookie dari response header

**Endpoint yang digunakan:**
| Endpoint | Fungsi |
|---|---|
| `POST /index.php` | Form login (COOKIE mode) |
| `GET /graph_view.php?action=list&rows=2000&page=N` | Discovery — list semua grafik |
| `GET /graph.php?local_graph_id=X&rra_id=0` | Ambil gambar grafik spesifik |
| `GET /graph_json.php?...` | Ambil data statistik bandwidth |

**Parameter fetch grafik:**
```
GET /graph_json.php?local_graph_id={graphId}
  &rra_id=0
  &graph_start={unixStart}
  &graph_end={unixEnd}
  &graph_height=200
  &graph_width=750
```

### 14.2 Integrasi PRTG

**Autentikasi:**
- **PASSWORD**: `?username=X&password=Y` sebagai query param
- **PASSHASH**: `?username=X&passhash=H` sebagai query param
- Tambahan: HTTP Basic Auth untuk Nginx reverse proxy (`Authorization: Basic ...`)

**Endpoint yang digunakan:**
| Endpoint | Fungsi |
|---|---|
| `GET /api/table.json?content=sensors&columns=...&count=50000` | Discovery semua sensor |
| `GET /api/chart.png?id={sensorId}&...` | Ambil gambar grafik sensor |
| `GET /api/historicdata.json?id={sensorId}&...` | Ambil data historis |

### 14.3 Telegram Bot API

**Endpoint:** `POST https://api.telegram.org/bot{TOKEN}/sendMessage`

**Payload:**
```json
{
  "chat_id": "CHAT_ID",
  "message_thread_id": "THREAD_ID",
  "text": "...",
  "parse_mode": "HTML"
}
```

---

## 15. Penanganan Error

### 15.1 Kategori Error & Respons

| Kode HTTP | Kondisi | Respons ke UI |
|---|---|---|
| `400 Bad Request` | Input tidak valid / field wajib kosong | Toast error dengan pesan spesifik |
| `401 Unauthorized` | Sesi tidak valid / expired | Redirect ke `/login` dengan pesan |
| `403 Forbidden` | Tidak memiliki izin | Toast "Akses ditolak" dengan keterangan permission |
| `404 Not Found` | Resource tidak ada | Toast "Data tidak ditemukan" |
| `409 Conflict` | Nomor dokumen duplikat (P2002) | Auto-realokasi nomor baru (transparan ke user) |
| `500 Internal Server Error` | Error server | Toast "Terjadi kesalahan sistem", detail di console |

### 15.2 Error Khusus per Modul

| Modul | Skenario Error | Penanganan |
|---|---|---|
| **Generator** | Cacti tidak bisa diakses | Status ❌ + pesan + operator bisa input manual |
| **Generator** | PRTG autentikasi ditolak | Status ❌ + saran cek Settings |
| **Generator** | PDF gagal digenerate | Laporan tetap tersimpan; PDF dapat di-regenerate |
| **Discovery** | Cacti: 0 grafik ditemukan | Error dengan pesan troubleshoot |
| **Discovery** | Response PRTG tidak valid | Error dengan isi response (200 karakter pertama) |
| **Import Excel** | Baris tidak valid | Preview dengan highlight baris bermasalah + alasan |
| **Notifikasi** | Telegram gagal kirim | Silent fail (log server), proses utama tidak terblokir |
| **Approval** | Reject tanpa catatan | Validasi frontend: wajib isi catatan sebelum submit |

---

*Dokumen FSD ini disusun berdasarkan analisis codebase GENRE Reporting System pada 18 November 2026.*
*Screenshot halaman akan diperbarui setelah proses capture selesai.*
