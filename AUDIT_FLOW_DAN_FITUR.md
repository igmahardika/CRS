# AUDIT OPERASIONAL SISTEM, FLOW FITUR, POTENSI BUG & REKOMENDASI REVISI
## Proyek: GENRE REPORTING (Automated MRTG & SLA Telemetry Reporting)

> **Status Audit:** Selesai (Read-Only Audit — Tidak ada kode yang diubah)  
> **Tanggal Audit:** 11 November 2026  
> **Framework & Stack:** Next.js 15.1 (App Router), React 19, Prisma ORM 6.4 (SQLite), Tailwind CSS 3.4, Radix UI Primitives, Puppeteer Core, Telegram Bot API  
> **Pedoman Audit:** Menggabungkan metodologi `code_review`, `list_features`, dan `software_architecture`.

---

## DAFTAR ISI
1. [Ringkasan Eksekutif & Arsitektur Sistem](#1-ringkasan-eksekutif--arsitektur-sistem)
2. [Pemetaan Flow Operasional Setiap Fitur (12 Modul Utama)](#2-pemetaan-flow-operasional-setiap-fitur)
   - [2.1 Autentikasi & Manajemen Sesi (RBAC)](#21-autentikasi--manajemen-sesi-rbac)
   - [2.2 Telemetry Report Generator (MRTG & SLA)](#22-telemetry-report-generator-mrtg--sla)
   - [2.3 Batch Parser Tiket & Kasus Helpdesk Nexa](#23-batch-parser-tiket--kasus-helpdesk-nexa)
   - [2.4 Riwayat Laporan & Workflow Approval Supervisor](#24-riwayat-laporan--workflow-approval-supervisor)
   - [2.5 Gerbang Distribusi & Unduh Dokumen PDF](#25-gerbang-distribusi--unduh-dokumen-pdf)
   - [2.6 Direktori Pelanggan & Matriks SLA Otomatis](#26-direktori-pelanggan--matriks-sla-otomatis)
   - [2.7 Network Discovery & Pemetaan Interface Monitoring](#27-network-discovery--pemetaan-interface-monitoring)
   - [2.8 Formulir Permintaan Laporan (Ad-hoc Portal)](#28-formulir-permintaan-laporan-ad-hoc-portal)
   - [2.9 Antrean Permintaan Laporan (Request Queue)](#29-antrean-permintaan-laporan-request-queue)
   - [2.10 Jadwal Rutin Bulanan & Countdown SLA 24 Jam](#210-jadwal-rutin-bulanan--countdown-sla-24-jam)
   - [2.11 Pengaturan Sistem & Integrasi Monitoring / Telegram](#211-pengaturan-sistem--integrasi-monitoring--telegram)
   - [2.12 Manajemen Pengguna & Hak Akses](#212-manajemen-pengguna--hak-akses)
3. [Audit Potensi Bug, Celah Keamanan & Mismatched Flow](#3-audit-potensi-bug-celah-keamanan--mismatched-flow)
4. [Revisi Flow Operasional & Matriks Penyesuaian Fitur](#4-revisi-flow-operasional--matriks-penyesuaian-fitur)
5. [Rencana Aksi & Rekomendasi Prioritas](#5-rencana-aksi--rekomendasi-prioritas)

---

## 1. RINGKASAN EKSEKUTIF & ARSITEKTUR SISTEM

Sistem **GENRE Reporting** adalah portal enterprise pelaporan kepatuhan SLA (Service Level Agreement) dan MRTG untuk layanan jaringan internet/leased line NEXA. Sistem ini mengintegrasikan dua server pemantauan (*MRTG/Cacti* dan *PRTG Network Monitor*), memproses metrik traffic bandwidth, mengompilasi tiket keluhan dan kasus downtime dari Helpdesk, menghitung ketersediaan SLA bulanan secara presisi, menyediakan live preview WYSIWYG A4, dan mencetak dokumen PDF resmi berstandar korporat melalui mesin headless Chromium (*Puppeteer*).

### Arsitektur Aliran Data & Hak Akses
```
[External / Clients / Dept Lain]
          │
          ▼
   /request-report  ──(POST /api/requests)──► [Database: ReportRequest]
                                                       │
                                              Telegram Notification
                                                       │
[Staff / Operator] ◄───────────────────────────────────┘
       │
       ├─► Buka /requests (Ambil Antrean) ──► Dialihkan ke / (Generator)
       ├─► Buka /schedule (Tugas SLA 24h) ──► Dialihkan ke / (Generator)
       │
       ▼
 [Generator (/)] ◄── Sync Cacti/PRTG Graph (/api/cacti, /api/prtg)
       │         ◄── Paste Tabel Helpdesk (Parser Cerdas)
       │         ◄── Matriks SLA & Rumus Otomatis (sla-calculator.ts)
       ▼
 Save & Archive (POST /api/reports)
       │
       ▼ Status: PENDING_APPROVAL ──► Notifikasi Telegram ke Supervisor
                                                  │
[Supervisor / Admin] ◄────────────────────────────┘
       │
       ▼
 /history (Approval Queue)
       ├─► REJECT: Catatan Revisi ──► Status: REVISION_NEEDED (Notifikasi Telegram)
       └─► APPROVE: Pengesahan ──► Status: APPROVED ──► PDF Resmi Siap Diunduh
```

---

## 2. PEMETAAN FLOW OPERASIONAL SETIAP FITUR

### 2.1 Autentikasi & Manajemen Sesi (RBAC)
- **Rute Frontend:** `/login`
- **API Terkait:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **File Inti:** `middleware.ts`, `lib/auth.ts`, `lib/token.ts`, `lib/token-edge.ts`
- **Hirarki Role:**
  - `ADMIN`: Akses penuh ke seluruh menu (termasuk `/users` dan `/settings`).
  - `SUPERVISOR`: Akses operasional, generator, queue, approval/rejection laporan.
  - `STAFF` / `OPERATOR`: Membuat laporan, mengelola pelanggan, discovery, memproses antrean.
  - `VIEWER`: Hanya melihat data dan mengunduh laporan yang sudah `APPROVED`.
  - `REQUESTER`: Hanya membuat tiket permintaan via formulir publik.

**Alur Operasional:**
1. Pengguna membuka URL sistem. Jika belum memiliki cookie `genre_auth_token`, Next.js `middleware` mencegat permintaan dan mengalihkan ke `/login?redirect=...`.
2. Pengguna memasukkan `username` dan `password`.
3. Handler API memverifikasi kredensial via `crypto.scryptSync` terhadap hash dan salt di database SQLite (`model User`).
4. Jika valid, sistem membuat payload JWT bertanda tangan HMAC-SHA256 (`lib/token.ts`) dengan masa berlaku 7 hari dan menyimpannya di cookie HTTP-only `genre_auth_token`.
5. Pengguna diarahkan ke halaman tujuan atau beranda (`/`).
6. Setiap request API/halaman divalidasi oleh `middleware` (Edge Web Crypto) dan `requireAuth()`.

---

### 2.2 Telemetry Report Generator (MRTG & SLA)
- **Rute Frontend:** `/` (`app/page.tsx`)
- **API Terkait:** 
  - `GET /api/customers` (Pencarian master data pelanggan)
  - `POST /api/cacti/graph` (Tarik grafik & metrik Cacti)
  - `POST /api/prtg/graph` (Tarik grafik & metrik PRTG)
  - `GET /api/reports/next-number` (Generate nomor surat dinamis)
  - `POST /api/reports` (Simpan & arsipkan draf laporan)
  - `POST /api/generate-pdf` (Generasi binary PDF on-the-fly)

**Alur Operasional:**
1. **Pemilihan Pelanggan:**
   - Operator menekan shortcut `Ctrl + Shift + K` atau klik tombol "Select Customer".
   - `CustomerModal` terbuka, operator mencari pelanggan berdasarkan nama, Customer ID (CID), atau Service ID (SID).
   - Memilih pelanggan akan otomatis mengisi metadata generator: Nama Pelanggan, CID, SID, Nama Layanan, Jumlah Node, Target SLA kontrak, Preferred Engine (`MRTG` atau `PRTG`), ID Grafik, dan Traffic Direction.
2. **Penentuan Mode & Periode:**
   - Operator memilih tipe laporan: `MRTG Report` (fokus grafik bandwidth) atau `SLA Report` (fokus ketersediaan jaringan, tiket & kasus).
   - Operator memilih Bulan dan Tahun laporan (default ke bulan sebelumnya).
   - Sistem secara otomatis memanggil `/api/reports/next-number` untuk mengambil urutan nomor dokumen resmi berikutnya: `XX/IMUN.01/[TIPE]/MM/YYYY`.
3. **Penarikan Telemetri Monitoring:**
   - Operator memilih engine (`MRTG` atau `PRTG`) dan memastikan Graph/Sensor ID terisi.
   - Klik "Fetch Cacti" atau "Fetch PRTG".
   - Backend memanggil server Cacti/PRTG dengan timestamp awal dan akhir bulan yang dihitung spesifik zona waktu Asia/Jakarta (WIB: UTC+7).
   - Backend mengekstrak: Image grafik (Base64) dan data traffic (In/Out Avg, In/Out Max, Satuan Mbps/Gbps).
   - Data otomatis dipetakan ke form input dan live canvas. Terdapat fallback upload gambar manual jika server monitoring internal offline.
4. **Pembalikan Arah Trafik (Traffic Direction Toggle):**
   - Di jaringan NEXA:
     - `NORMAL`: Download = Inbound Traffic, Upload = Outbound Traffic.
     - `REVERSED`: Download = Outbound Traffic, Upload = Inbound Traffic.
   - Mengubah toggle seketika membalik pemetaan metrik di kalkulasi dan preview tanpa perlu fetch ulang.
5. **Live WYSIWYG A4 Preview:**
   - Komponen `LivePreview.tsx` merender tampilan A4 (210mm x 297mm) persis sama dengan output cetak: Halaman 1 (Cover) dan Halaman 2+ (Isi Laporan, Grafik, Ringkasan Trafik, Tabel Tiket, Tabel Kasus, dan Formula SLA).
   - Dilengkapi zoom toolbar (65%, 85%, 100%, Page-Fit) dan mode Fullscreen.
6. **Simpan & Arsipkan (Save & Archive):**
   - Operator klik "Save & Archive" (atau shortcut `Ctrl + Enter`).
   - Sistem menghitung SLA final melalui `calculateSla()`.
   - Mengirim payload ke `POST /api/reports`. Laporan berstatus awal `PENDING_APPROVAL` (kecuali jika dieksekusi oleh Supervisor/Admin dengan opsi direct-approve aktif).
   - Backend membangkitkan file PDF fisik melalui Puppeteer dan menyimpannya di folder `storage/reports/`.
   - Notifikasi broadcast otomatis dikirim ke topic Telegram NEXA.

---

### 2.3 Batch Parser Tiket & Kasus Helpdesk Nexa
- **Komponen Frontend:** `components/TicketCaseManager.tsx`
- **Engine Kalkulasi:** `lib/sla-calculator.ts`

**Alur Operasional:**
1. **Entri Manual:**
   - Operator dapat menambah tiket keluhan ("Add Ticket") atau kasus gangguan ("Add Case") baris demi baris secara manual.
   - Input tanggal, start datetime, end datetime, subjek masalah, dan aksi mitigasi.
   - Durasi downtime dihitung otomatis dari selisih `startDate` dan `endDate` menggunakan `calculateMinutesBetween()`.
2. **Batch Paste dari Portal Helpdesk (Fitur Cerdas):**
   - Operator membuka modal "Paste Helpdesk Table".
   - Operator menyalin (*copy*) tabel laporan langsung dari aplikasi Helpdesk internal NEXA dan menempelkannya (*paste*) ke textarea.
   - Algoritma parser `isHelpdeskTableFormat()` mendeteksi struktur kolom Helpdesk (No Tiket, Waktu, Pelanggan, Kategori, Subjek, Status, Solusi).
   - Parser membedakan secara cerdas antara:
     - **Complaint Tickets:** Tiket pertanyaan/keluhan operasional tanpa downtime.
     - **Incident Cases:** Tiket gangguan jaringan yang berdampak pada SLA.
   - Parser mengekstrak tanggal mulai dan selesai gangguan, mengonversi string format ke menit downtime numerik.
   - Opsi `alsoSyncCrossData` memungkinkan impor sekaligus kedua tabel (Tiket & Kasus) dalam satu kali paste.
   - Mode impor mendukung `Append` (menambahkan) atau `Replace` (mengganti total).
3. **Perhitungan Otomatis SLA:**
   - Rumus: $TotalMenitBulan = Hari \times 24 \times 60$ (Contoh: Oktober = 44.640 menit).
   - $PersenDowntime = \frac{TotalDowntimeMenit}{TotalMenitBulan} \times 100$ (Dibulatkan 2 desimal).
   - $PersenKetersediaan (Availability) = 100 - PersenDowntime$ (Dibulatkan 2 desimal).
   - Perbandingan dengan Target Kontrak: Jika Availability >= Target, status "SLA Achieved" (Hijau); jika kurang, "SLA Breached" (Merah).

---

### 2.4 Riwayat Laporan & Workflow Approval Supervisor
- **Rute Frontend:** `/history` (`app/history/page.tsx`)
- **API Terkait:** 
  - `GET /api/reports`
  - `POST /api/reports/approve`
  - `POST /api/reports/reject`
  - `DELETE /api/reports`

**Alur Operasional:**
1. **Pemeriksaan Daftar & Filter:**
   - Menampilkan 4 kartu statistik: Total Laporan, Laporan MRTG, Laporan SLA, dan Rata-rata Ketersediaan Jaringan.
   - Filter berdasarkan Tipe Laporan (`MRTG`, `SLA`) dan Status Approval (`PENDING_APPROVAL`, `APPROVED`, `REVISION_NEEDED`).
   - Fitur pencarian multi-kolom (No Dokumen, Nama Pelanggan, SID, CID).
2. **Tinjauan Dokumen (Inspection Modal):**
   - Mengklik baris laporan membuka modal detail lengkap: rangkuman trafik, parameter SLA, daftar tiket, dan catatan revisi.
3. **Persetujuan (Approve):**
   - Hanya akun role `SUPERVISOR` atau `ADMIN` yang melihat tombol "Setujui (Approve)".
   - Mengklik tombol mengirim `POST /api/reports/approve`.
   - Status berubah menjadi `APPROVED`, mencatat identitas supervisor dan timestamp pengesahan.
   - Bot Telegram mengirim notifikasi konfirmasi bahwa dokumen resmi telah disetujui dan siap didistribusikan.
4. **Permintaan Revisi (Reject / Revision Request):**
   - Supervisor mengklik "Minta Revisi", membuka dialog input evaluasi.
   - Supervisor mengisi catatan revisi (misal: "Metrik grafik terbalik, mohon ubah ke REVERSED" atau "Tiket no. N1298 belum dimasukkan").
   - Mengklik "Submit Revision Notes" mengubah status laporan menjadi `REVISION_NEEDED`.
   - Bot Telegram menyiarkan catatan revisi ke topic grup tim agar operator segera menindaklanjuti.
5. **Penghapusan Laporan:**
   - Operator/Admin dapat menghapus arsip melalui tombol delete.
   - Menampilkan modal konfirmasi `ConfirmDialog`.
   - Menghapus record di database SQLite dan membersihkan file PDF fisik dari disk.

---

### 2.5 Gerbang Distribusi & Unduh Dokumen PDF
- **Rute API:** `GET /api/reports/download?id=...`
- **File Inti:** `app/api/reports/download/route.ts`, `lib/pdf-generator.ts`

**Alur Operasional:**
1. Request download membawa parameter `id` laporan.
2. **Aturan Hak Unduh (Role-based Download Gate):**
   - Jika laporan berstatus `APPROVED`: Dapat diunduh oleh siapa saja yang login (Staff, Operator, Viewer, Supervisor, Admin).
   - Jika laporan berstatus `PENDING_APPROVAL` atau `REVISION_NEEDED`: **DIBLOKIR (403 Forbidden)** untuk akun Staff, Operator, dan Viewer. Hanya role `SUPERVISOR` dan `ADMIN` yang diizinkan mengunduh draf ini untuk keperluan evaluasi/pemeriksaan.
3. **Penyajian File (Cache-First dengan Auto-Regeneration):**
   - Sistem memeriksa ketersediaan file PDF fisik di folder `storage/reports/`.
   - Jika file fisik ada dan path aman (mencegah path traversal), stream binary PDF langsung dikirimkan ke browser.
   - Jika file fisik terhapus/hilang dari disk, sistem secara cerdas membaca ulang snapshot tiket, kasus, dan grafik dari database, me-render ulang dokumen menggunakan template Puppeteer, menyimpannya kembali ke disk, dan mengalirkannya ke pengguna.

---

### 2.6 Direktori Pelanggan & Matriks SLA Otomatis
- **Rute Frontend:** `/customers` (`app/customers/page.tsx`)
- **API Terkait:** 
  - `GET/POST/PUT/DELETE /api/customers`
  - `POST /api/customers/sync-sla`
  - `GET /api/customers/template`
  - `POST /api/customers/import`
  - `GET /api/customers/export`

**Alur Operasional:**
1. **CRUD Pelanggan:**
   - Form input mencakup: Nama Pelanggan, CID (`01.XXXX.XXXX`), SID (`01.XXXX.X`), Layanan, Jumlah Node, Engine Monitoring Utama, ID Cacti, ID PRTG, Arah Trafik, dan Centang "Wajib Laporan Rutin Bulanan".
   - Otomatisasi: Mengisi SID otomatis mengekstrak jumlah node via regex digit terakhir (`extractNodeFromServiceId`). Mengisi Nama Layanan otomatis menentukan Target SLA sesuai matriks kontrak NEXA (`getSlaByServiceName`).
2. **Sinkronisasi Matriks SLA Massal (Auto-Sync SLA):**
   - Tombol "Auto-Sync SLA" memanggil `POST /api/customers/sync-sla`.
   - Sistem mencocokkan seluruh pelanggan terhadap aturan resmi NEXA:
     - 99.5%: Dedicated Enterprise, Dedicated IIX, IP Transit, Local Loop, MAXi Dedicated, Metro, Prime, VPN.
     - 98.0%: Dedicated Lite, Pro.
     - 95.0%: Broadband Bisnis, GForce, Impressive, MAXi Easy.
     - 0% (Tanpa SLA): Basic, Lite, Smart, Stream, Zigy, dll.
   - Mengupdate seluruh record yang tidak sesuai dalam batch SQL efisien.
3. **Impor & Ekspor Excel:**
   - Operator dapat mengunduh template `.xlsx` yang sudah diformat dengan validasi kolom.
   - Mengunggah file Excel menampilkan preview baris yang akan diimpor, mendeteksi duplikasi SID, dan melakukan upsert masal.
   - Operator dapat mengekspor seluruh direktori pelanggan ke file Excel kapan saja.
4. **Batch Operations:**
   - Checkbox indeterminate untuk memilih beberapa/semua pelanggan dan menghapusnya sekaligus via floating batch action bar.

---

### 2.7 Network Discovery & Pemetaan Interface Monitoring
- **Rute Frontend:** `/discovery` (`app/discovery/page.tsx`)
- **API Terkait:** 
  - `POST /api/discovery/sync`
  - `GET /api/discovery/tree`
  - `POST /api/discovery/map-customer`
  - `GET /api/discovery/map-customer`
- **Service Backend:** `lib/discovery-service.ts`

**Alur Operasional:**
1. **Sinkronisasi Server Monitoring (Sync):**
   - Operator memilih engine yang akan di-sync: `MRTG` (Cacti) atau `PRTG`.
   - **Cacti Sync:** Login ke form Cacti, mendapatkan session cookie, membaca pagination HTML dinamis hingga puluhan halaman (mendukung >34.000 grafik pelanggan), mem-parsing judul grafik dan `local_graph_id`.
   - **PRTG Sync:** Memanggil PRTG API endpoint `/api/table.json?content=sensors` dengan kredensial HTTP Basic Auth dan passhash.
   - Ekstraksi Pintar: Menggunakan regex untuk mengekstrak Service ID (`detectedSid`) dan Customer ID (`detectedCid`) langsung dari penamaan interface router/switch.
   - Hasil disimpan ke tabel `DiscoveredItem` di SQLite.
2. **Eksplorasi Hierarki Pohon Jaringan (Tree View):**
   - Data dirender dalam struktur akordeon bertingkat: **Grup (Site/Tree) -> Perangkat (Switch/Router/OLT) -> Interface/Sensor**.
   - Dilengkapi status indikator (Up/Down/Unknown) dan waktu penemuan terakhir.
3. **Pencarian Cepat:**
   - Input pencarian real-time mendukung pencarian berdasarkan IP Perangkat, Nama Router, Port Interface, ID Grafik, maupun SID.
4. **Pemetaan ke Pelanggan (Map to Customer):**
   - Dari baris interface yang ditemukan, operator mengklik ikon tautan ("Map").
   - Dialog mapping terbuka, menampilkan SID yang terdeteksi secara otomatis.
   - Operator dapat mencari pelanggan target dan mengonfirmasi pemetaan.
   - Backend memperbarui field `cactiGraphId` atau `prtgSensorId` di tabel `Customer`.

---

### 2.8 Formulir Permintaan Laporan (Ad-hoc Portal)
- **Rute Frontend:** `/request-report` (`app/request-report/page.tsx`)
- **API Terkait:** `POST /api/requests`, `GET /api/requests/customers`
- **Akses:** Publik / Internal tanpa kewajiban login (dikecualikan di `middleware.ts`).

**Alur Operasional:**
1. Pengguna dari departemen non-teknis (Account Management, Sales, NOC, Customer Care) membuka form permintaan laporan.
2. Mengisi identitas pemohon: Nama, Departemen, dan Email/Kontak.
3. **Pencarian Pelanggan Terintegrasi:**
   - Input pencarian pelanggan dilengkapi auto-complete yang mengambil data dari database pelanggan via `/api/requests/customers`.
   - Pengguna juga dapat membuka modal "Browse Customer Directory" untuk memilih pelanggan resmi yang sudah terdaftar.
4. Menentukan parameter laporan: Tipe Laporan (`SLA`, `MRTG`, `BOTH`), Periode Laporan (Bulan & Tahun), Tingkat Urgensi (`NORMAL` atau `URGENT`), serta Catatan Tambahan.
5. Mengklik "Submit Request":
   - Sistem membangkitkan nomor tiket permintaan unik berurutan: `REQ-YYYYMM-XXXX`.
   - Record disimpan di tabel `ReportRequest` dengan status awal `PENDING`.
   - Sistem seketika menyiarkan alert notifikasi ke topic Telegram tim operasional.
   - Pengguna menerima kartu konfirmasi sukses beserta nomor tiket yang dapat disalin (*copy*) untuk pelacakan.

---

### 2.9 Antrean Permintaan Laporan (Request Queue)
- **Rute Frontend:** `/requests` (`app/requests/page.tsx`)
- **API Terkait:** `GET /api/requests`, `PATCH /api/requests`

**Alur Operasional:**
1. Operator membuka dashboard antrean permintaan.
2. Tiket berstatus `URGENT` secara otomatis diprioritaskan di baris paling atas tabel.
3. Filter berdasarkan status: `ALL`, `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
4. **Pemrosesan Tiket ("Process Request"):**
   - Operator mengklik tombol aksi "Process Request".
   - Sistem mengarahkan browser ke halaman Report Generator (`/`) dengan URL parameter lengkap:
     `/?customerName=...&serviceId=...&customerId=...&type=...&month=...&year=...&requestId=...&ticket=...`
   - Generator terbuka dengan data pelanggan dan periode yang sudah terisi otomatis, serta menampilkan banner status tiket aktif.
5. **Penyelesaian Otomatis (Auto-Fulfillment):**
   - Saat operator mengklik "Save & Archive" di Generator dan laporan tersimpan, generator secara otomatis mengirim `PATCH /api/requests` yang mengubah status tiket menjadi `COMPLETED` dan menautkan ID laporan yang dihasilkan ke `processedReportId`.

---

### 2.10 Jadwal Rutin Bulanan & Countdown SLA 24 Jam
- **Rute Frontend:** `/schedule` (`app/schedule/page.tsx`)
- **API Terkait:** `GET /api/schedule`, `PATCH /api/schedule`, `POST /api/schedule/kickoff`
- **Model Database:** `MonthlyScheduleTask`

**Alur Operasional:**
1. **Kickoff Awal Bulan:**
   - Setiap tanggal 1 (atau awal siklus penagihan), Admin/Operator membuka menu jadwal dan mengklik "Trigger Monthly Kickoff".
   - Dialog kickoff terbuka untuk menentukan Bulan & Tahun laporan yang akan dieksekusi.
   - Sistem menyaring semua pelanggan di database yang memiliki tanda `isMonthlyRoutine = true`.
   - Sistem membuat record tugas `MonthlyScheduleTask` untuk setiap pelanggan tersebut dengan waktu deadline persis **24 jam dari waktu kickoff** (`kickoffTime + 24h`).
   - Bot Telegram menyiarkan pengumuman resmi Kickoff SLA 24 Jam ke tim operasional, menginstruksikan staf untuk segera memproses laporan rutin sebelum batas waktu habis.
2. **Live Widget SLA 24-Hour Countdown:**
   - Halaman menampilkan banner visual penghitung mundur real-time:
     - Hijau (`SAFE`): Waktu tersisa >= 12 jam.
     - Kuning (`WARNING`): Waktu tersisa antara 6 s.d. 12 jam.
     - Merah Berkedip (`CRITICAL`): Waktu tersisa < 6 jam.
     - Merah Tua (`EXPIRED`): Batas waktu 24 jam telah lewat.
     - Hijau Sukses (`COMPLETED`): Seluruh tugas pada periode tersebut telah selesai.
3. **Auto-Detection Pelanggaran SLA (Breached):**
   - Setiap kali API `/api/schedule` diakses, backend memeriksa apakah waktu saat ini telah melewati `deadlineTime` untuk tugas yang masih `PENDING`. Jika ya, status tugas otomatis diubah menjadi `BREACHED`.
4. **Pemrosesan Tugas ("Process Task"):**
   - Staf mengklik "Process Task" pada baris pelanggan.
   - Browser diarahkan ke Generator (`/`) membawa parameter `scheduleTaskId`.
   - Setelah laporan di-generate dan disimpan di Generator, tugas jadwal otomatis diubah menjadi `COMPLETED` dan ditautkan dengan ID laporan yang telah dibuat.

---

### 2.11 Pengaturan Sistem & Integrasi Monitoring / Telegram
- **Rute Frontend:** `/settings` (`app/settings/page.tsx`)
- **API Terkait:** 
  - `GET/POST /api/config`
  - `POST /api/upload-template`
  - `POST /api/telegram/test`

**Alur Operasional:**
1. Hanya dapat diakses oleh akun `ADMIN` (dijaga oleh `middleware.ts` dan guard `requireAdmin()`).
2. **Konfigurasi Integrasi Telemetri:**
   - Pengaturan Cacti: Base URL, Username, Password, dan Tipe Autentikasi (`COOKIE` atau `BASIC`).
   - Pengaturan PRTG: Base URL, Username, Password/Passhash, dan Tipe Autentikasi (`PASSWORD` atau `PASSHASH`).
   - Tombol "Test Connection" untuk memverifikasi keterjangkauan server dan autentikasi secara non-blocking.
   - Menyimpan konfigurasi Cacti otomatis membersihkan cache cookie sesi lama (`invalidateCactiSessionCache()`).
3. **Konfigurasi Bot Notifikasi Telegram:**
   - Input Telegram Bot Token, Chat ID grup/saluran, Thread ID (Topic ID untuk supergroup bertopik), serta tombol aktif/nonaktif notifikasi.
   - Tombol "Test Telegram Notification" mengirimkan pesan uji coba langsung ke thread target untuk memverifikasi integrasi bot.
4. **Manajemen Template Dokumen:**
   - Operator dapat mengunggah gambar template Cover MRTG, Cover SLA, dan Background Isi Halaman (`page_bg.png`). File langsung diunggah ke storage aset sistem dan diperbarui di `AppConfig`.

---

### 2.12 Manajemen Pengguna & Hak Akses
- **Rute Frontend:** `/users` (`app/users/page.tsx`)
- **API Terkait:** `GET/POST/PUT/DELETE /api/users`

**Alur Operasional:**
1. Menu khusus role `ADMIN`.
2. Menampilkan daftar pengguna dengan role badge, status aktif/nonaktif, dan waktu login terakhir.
3. **Pembuatan Pengguna:**
   - Admin mengisi username (min. 3 karakter, auto lowercase), nama lengkap, email, password (min. 6 karakter), dan role (`ADMIN`, `SUPERVISOR`, `STAFF`, `OPERATOR`, `VIEWER`, `REQUESTER`).
   - Password di-hash menggunakan algoritma modern `scrypt` dengan salt acak 16 byte (`crypto.scryptSync`).
4. **Pembaruan & Reset Password:**
   - Admin dapat memperbarui nama, role, status aktif, dan menginput password baru jika pengguna lupa password.
5. **Aturan Keamanan Sistem (Self-Protection Safeguards):**
   - Admin tidak dapat menonaktifkan akunnya sendiri saat sedang login.
   - Admin tidak dapat menurunkan (*demote*) role akunnya sendiri dari Administrator.
   - Admin tidak dapat menghapus akunnya sendiri saat sedang login.
   - Sistem melarang penghapusan akun Administrator terakhir di database untuk mencegah terkunci (*lockout*).

---

## 3. AUDIT POTENSI BUG, CELAH KEAMANAN & MISMATCHED FLOW

Setelah melakukan penelusuran menyeluruh pada seluruh kode sumber (frontend, API routes, dan library pendukung), ditemukan **10 potensi bug, celah alur, dan ketidaksesuaian operasional**:

| No | Label Keparahan | Komponen / Rute | Deskripsi Temuan & Dampak |
|---|---|---|---|
| 1 | 🔴 `[blocking]` | `app/requests/page.tsx` & `app/page.tsx` | **Premature Completion pada Permintaan Tipe "BOTH"**<br>Ketika permintaan bertipe `BOTH` (MRTG + SLA) diproses, Generator membukanya dalam mode `SLA`. Begitu laporan SLA disimpan, trigger `activeRequestId` langsung mengirim `PATCH /api/requests` dengan status `COMPLETED`. Akibatnya, laporan MRTG sama sekali belum dibuat namun tiket sudah ditandai selesai. |
| 2 | 🔴 `[blocking]` | `app/history/page.tsx` & `app/page.tsx` | **Alur Buntu pada Laporan Ditolak ("Revision Needed Dead-End")**<br>Supervisor dapat meminta revisi dan menyertakan catatan evaluasi. Namun, di menu `/history` **tidak ada tombol untuk mengedit atau me-load kembali laporan yang ditolak ke Generator**. Jika operator mengisi ulang dari awal di `/`, sistem akan menghasilkan nomor dokumen baru dan laporan lama yang ditolak tetap menggantung berstatus `REVISION_NEEDED`. |
| 3 | 🔴 `[blocking]` | `app/page.tsx` & `components/LivePreview.tsx` | **Tombol "Download PDF" Tidak Berfungsi / Hilang di Toolbar Generator**<br>`LivePreview.tsx` sudah memiliki prop `onDownloadPdf` dan tombol "Download PDF". Namun di `app/page.tsx`, prop `onDownloadPdf` **tidak pernah di-pass** (`<LivePreview data={currentReportData} isGeneratingPdf={isSavingReport} />`). Selain itu, endpoint `/api/generate-pdf` menjadi yatim (*orphaned*) karena tidak pernah dipanggil dari UI utama, sehingga staf tidak dapat mengunduh draf PDF sebelum diapprove supervisor. |
| 4 | 🟡 `[important]` | `app/api/reports/next-number` & `prisma/schema.prisma` | **Race Condition Nomor Dokumen (Potensi Duplikasi)**<br>Penomoran dokumen (`next-number`) dihitung dari `maxSeq + 1` tanpa database transaction lock, dan kolom `documentNumber` di Prisma `Report` tidak memiliki constraint `@unique`. Jika dua operator men-generate laporan pada waktu berdekatan, nomor dokumen yang sama persis dapat tersimpan ganda di database. |
| 5 | 🟡 `[important]` | `app/api/requests/route.ts` | **Potensi Tabrakan Nomor Tiket Permintaan (`ticketNumber` Collision)**<br>Nomor tiket `REQ-YYYYMM-XXXX` dihitung dari `count({ startsWith: prefix }) + 1`. Jika ada tiket yang dihapus atau dibatalkan, perhitungan `count + 1` akan menabrak nomor tiket yang sudah ada, memicu crash `PrismaClientKnownRequestError (Unique constraint failed on ticketNumber)`. |
| 6 | 🟡 `[important]` | `app/api/discovery/sync/route.ts` & `app/api/prtg/graph/route.ts` | **Kopling Kredensial Nginx PRTG ke Kredensial Cacti**<br>Pada sinkronisasi PRTG dan pengambilan grafik PRTG, parameter `basicAuthUsername` dan `basicAuthPassword` otomatis mengambil nilai dari `dbConfig?.mrtgUsername` dan `dbConfig?.mrtgPassword`. Jika kredensial Cacti dan Nginx reverse-proxy PRTG berbeda, sinkronisasi PRTG akan gagal otentikasi. |
| 7 | 🟡 `[important]` | `app/api/discovery/map-customer/route.ts` | **Ambiguitas Pemetaan Pelanggan Multi-Link**<br>Jika pemetaan discovery dilakukan berdasarkan Customer ID (`customerId`) dan bukan Service ID (`serviceId`), query `prisma.customer.findFirst({ where: { customerId } })` akan secara acak memetakan port ke link pertama pelanggan tersebut, mengabaikan fakta bahwa satu pelanggan korporat bisa memiliki 5 hingga 10 link berbeda. |
| 8 | 🟡 `[important]` | `app/page.tsx` (`handleGenerateReport`) | **Auto-Save Graph ID Berpotensi Menimpa Master Data Tanpa Konfirmasi**<br>Setiap kali laporan di-generate, fungsi `autoSaveGraphIdToMaster` langsung menimpa data master `Customer`. Jika operator hanya sedang melakukan eksperimen/pengujian port sementara di generator, master data pelanggan permanen tertimpa tanpa disadari. |
| 9 | 🟡 `[important]` | `app/api/schedule/kickoff/route.ts` | **Inkonsistensi Deadline pada Re-trigger Kickoff Rutin**<br>Jika kickoff dijalankan ulang pada bulan yang sama, task lama tidak di-duplikasi (bagus), namun backend tetap menyiarkan pesan Telegram dengan waktu deadline 24 jam baru, sedangkan deadline di tabel SQLite tetap memakai deadline lama, membingungkan penghitung waktu staf. |
| 10 | 🟢 `[nit]` | `middleware.ts` vs API Guards | **Proteksi Rute Halaman Frontend Belum Sepenuhnya RBAC**<br>`middleware.ts` hanya membatasi `/users` dan `/settings` untuk ADMIN. Halaman seperti `/customers`, `/schedule`, dan `/requests` dapat dibuka oleh akun bertipe `VIEWER` atau `REQUESTER` (meskipun aksi simpan mereka ditolak dengan error 403 di backend API). Tombol aksi di UI sebaiknya di-disable atau disembunyikan untuk role Viewer. |

---

## 4. REVISI FLOW OPERASIONAL & MATRIKS PENYESUAIAN FITUR

Berdasarkan temuan audit di atas, berikut adalah rancangan revisi alur kerja dan evaluasi penyesuaian fitur yang diperlukan:

### Revisi 1: Alur Pemrosesan Tiket Permintaan Bertipe "BOTH"
- **Masalah Alur Saat Ini:** Permintaan `BOTH` langsung ditandai `COMPLETED` saat laporan pertama (SLA) selesai disimpan. Laporan MRTG tertinggal.
- **Rancangan Alur yang Direvisi:**
  1. Operator klik "Process Request" pada tiket bertipe `BOTH`.
  2. Sistem membuka Generator dalam mode pertama (misal `SLA`). URL membawa parameter `requestId=...&mode=BOTH_STEP_1`.
  3. Setelah laporan SLA disimpan, sistem **TIDAK** mengubah status tiket menjadi `COMPLETED`, melainkan menampilkan banner/dialog transisi:  
     *"Laporan SLA berhasil disimpan. Lanjutkan ke pembuatan Laporan MRTG untuk tiket ini?"*
  4. Generator otomatis beralih ke mode `MRTG` dengan data pelanggan yang sama dan URL berubah ke `mode=BOTH_STEP_2`.
  5. Setelah laporan MRTG disimpan, sistem baru mengirim update status tiket menjadi `COMPLETED` dan menyimpan kedua ID laporan ke database.
- **Penyesuaian Fitur yang Diperlukan:**
  - **Database:** Tambahkan kolom `processedMrtgReportId` dan `processedSlaReportId` pada model `ReportRequest`.
  - **API:** Perbarui `PATCH /api/requests` untuk mendukung partial completion (`status: 'IN_PROGRESS'`).
  - **UI Generator:** Logika navigasi bertahap untuk tipe `BOTH`.

---

### Revisi 2: Alur Penanganan Laporan Revisi ("Revise & Resubmit")
- **Masalah Alur Saat Ini:** Laporan berstatus `REVISION_NEEDED` berhenti menjadi dead-end di tabel `/history`.
- **Rancangan Alur yang Direvisi:**
  1. Pada tabel `/history`, untuk baris laporan yang berstatus `REVISION_NEEDED`, tampilkan tombol aksi utama berwarna oranye: **"Revisi di Generator"**.
  2. Mengklik tombol ini mengarahkan operator ke `/` dengan parameter `revisingReportId=...`.
  3. Generator membaca data lengkap laporan lama dari database (termasuk nomor dokumen asli, grafik, nilai download/upload, array tiket, array kasus, dan catatan supervisor).
  4. Generator menampilkan banner peringatan di bagian atas:  
     *"Mode Revisi Dokumen [No. Dokumen]. Catatan Supervisor: [Catatan]"*.
  5. Operator memperbaiki data yang diminta supervisor tanpa mengubah nomor dokumen resmi.
  6. Saat tombol simpan ditekan, sistem melakukan **UPDATE (PUT)** pada record laporan yang ada, memperbarui file PDF fisik, dan mengembalikan status laporan ke `PENDING_APPROVAL` disertai notifikasi Telegram:  
     *"Laporan Revisi Dokumen [No. Dokumen] telah diperbarui oleh Staf dan siap ditinjau kembali."*
- **Penyesuaian Fitur yang Diperlukan:**
  - **Frontend:** Tombol "Revisi di Generator" di `app/history/page.tsx`.
  - **Generator:** Hook `useEffect` di `app/page.tsx` untuk mem-fetch report by ID jika ada `revisingReportId`.
  - **API:** Buat endpoint `PUT /api/reports` untuk memperbarui data laporan yang sudah ada (bukan membuat baris baru).

---

### Revisi 3: Aktivasi Tombol Unduh Draf PDF di Generator
- **Masalah Alur Saat Ini:** Tombol unduh di toolbar preview mati/tidak terpasang, dan staf tidak bisa melihat draf PDF sebelum persetujuan supervisor.
- **Rancangan Alur yang Direvisi:**
  1. Sambungkan prop `onDownloadPdf` di `app/page.tsx` ke handler yang memanggil `POST /api/generate-pdf`.
  2. Saat tombol "Download PDF" di toolbar preview ditekan, Puppeteer menghasilkan binary PDF on-the-fly dengan watermark lembut bertuliskan **"DRAFT / UNAPPROVED"** jika belum diapprove, sehingga staf dapat memeriksa kerapian layout secara instan tanpa mengotori arsip database.
- **Penyesuaian Fitur yang Diperlukan:**
  - **Frontend:** Sambungkan `onDownloadPdf={() => handleDownloadDraftPdf()}` pada `<LivePreview />` di `app/page.tsx`.
  - **PDF Template:** Dukungan watermark opsional `"DRAFT"` di `lib/pdf-template.ts` jika status belum `APPROVED`.

---

### Revisi 4: Pencegahan Benturan Nomor Dokumen & Nomor Tiket
- **Masalah Alur Saat Ini:** Nomor dokumen dapat terduplikasi saat submit bersamaan; nomor tiket bentrok jika ada record yang terhapus.
- **Rancangan Alur yang Direvisi:**
  1. **Nomor Dokumen:** Tambahkan constraint `@unique` pada kolom `documentNumber` di Prisma `Report`. Pada saat eksekusi `POST /api/reports`, gunakan database transaction untuk mengunci penomoran sequence berikutnya agar bersifat atomik (*atomic increment*).
  2. **Nomor Tiket Permintaan:** Ganti metode `count()` menjadi pencarian urutan tertinggi (`maxSeq`), persis seperti logika `doc-number.ts`.
- **Penyesuaian Fitur yang Diperlukan:**
  - **Schema:** Tambahkan `@unique` pada `Report.documentNumber`.
  - **API:** Revisi query pencarian sequence di `app/api/requests/route.ts`.

---

### Revisi 5: Pemisahan Kredensial Nginx PRTG di Pengaturan
- **Masalah Alur Saat Ini:** PRTG Basic Auth meminjam `mrtgUsername` dan `mrtgPassword` milik Cacti.
- **Rancangan Alur yang Direvisi:**
  1. Tambahkan kolom khusus pada `AppConfig`: `prtgBasicUsername` dan `prtgBasicPassword`.
  2. Pada tab Pengaturan Integrasi PRTG di `/settings`, tambahkan input opsional untuk Reverse-Proxy Basic Auth.
- **Penyesuaian Fitur yang Diperlukan:**
  - **Schema:** Tambahkan field di `AppConfig`.
  - **Frontend:** Input form di `app/settings/page.tsx`.
  - **Backend:** Update `lib/discovery-service.ts` dan `lib/prtg-service.ts`.

---

## 5. RENCANA AKSI & REKOMENDASI PRIORITAS

Jika audit ini telah disetujui untuk diimplementasikan ke tahap perbaikan kode, berikut urutan prioritas yang direkomendasikan:

1. **Sprint 1 (Critical Logic & Missing Links):**
   - Mengaktifkan `onDownloadPdf` di `LivePreview` Generator (`app/page.tsx`).
   - Mengimplementasikan alur "Revisi Dokumen di Generator" dari `/history` ke `/` beserta API `PUT /api/reports`.
   - Memperbaiki alur penyelesaian tiket `BOTH` di `app/requests/page.tsx` agar tidak premature completed.
2. **Sprint 2 (Data Integrity & Safety):**
   - Menambahkan `@unique` pada `Report.documentNumber` dan atomic transaction sequence.
   - Memperbaiki penomoran tiket `ReportRequest` agar menggunakan `maxSeq`.
   - Menambahkan konfirmasi sebelum `autoSaveGraphIdToMaster` menimpa data master pelanggan.
3. **Sprint 3 (Configuration & UI Polish):**
   - Menambahkan input mandiri untuk Nginx Basic Auth PRTG di `AppConfig` dan `/settings`.
   - Menyesuaikan tampilan tombol di UI untuk role `VIEWER` (read-only enforcement di sisi client).

---
*Dokumen audit ini dibuat secara independen dan objektif sesuai standar rekayasa perangkat lunak perusahaan.*

