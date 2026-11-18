# Product Requirements Document (PRD)
## GENRE Reporting System

---

| | |
|---|---|
| **Nama Produk** | GENRE — Generator of Network Reporting |
| **Versi Dokumen** | 1.0 |
| **Status** | Final |
| **Tanggal** | 18 November 2026 |
| **Product Owner** | Network Operation Center — PT. NEXA |
| **Platform** | Web Application (Internal) |

---

## Daftar Isi

1. [Visi & Ringkasan Produk](#1-visi--ringkasan-produk)
2. [User Personas](#2-user-personas)
3. [Fitur Produk](#3-fitur-produk)
4. [Spesifikasi UI/UX per Halaman](#4-spesifikasi-uiux-per-halaman)
5. [Spesifikasi API](#5-spesifikasi-api)
6. [Model Data Produk](#6-model-data-produk)
7. [Penanganan Error & Edge Case](#7-penanganan-error--edge-case)
8. [Prioritas Fitur (MoSCoW)](#8-prioritas-fitur-moscow)
9. [Metrik Keberhasilan Produk](#9-metrik-keberhasilan-produk)
10. [Roadmap Produk](#10-roadmap-produk)

---

## 1. Visi & Ringkasan Produk

### 1.1 Visi Produk

> *"Menjadikan proses pelaporan layanan pelanggan di PT. NEXA sepenuhnya digital, terstandar, dan tertelusuri — sehingga laporan yang akurat dapat dihasilkan lebih cepat, disetujui lebih mudah, dan didistribusikan lebih andal."*

### 1.2 Ringkasan Produk

**GENRE** adalah aplikasi web internal berbasis **Next.js 15** yang diakses melalui browser oleh seluruh departemen terkait (NOC, CX, AE, Finance). Produk ini berfungsi sebagai:

- **Platform pembuatan laporan** — mengintegrasikan data langsung dari sistem monitoring jaringan
- **Workflow engine** — mengelola alur review dan approval multi-tier
- **Portal self-service** — memungkinkan departemen non-NOC mengajukan dan memantau permintaan laporan
- **Arsip digital** — menyimpan seluruh laporan dalam format PDF yang dapat dicari dan diunduh

### 1.3 Nilai Utama Produk

| Nilai | Deskripsi |
|---|---|
| ⚡ **Kecepatan** | Laporan yang sebelumnya butuh berjam-jam kini diselesaikan dalam hitungan menit |
| ✅ **Akurasi** | Kalkulasi SLA otomatis mengeliminasi risiko human error |
| 🔒 **Kepatuhan** | Setiap laporan melewati approval berlapis dan tersimpan dalam audit trail |
| 👁️ **Transparansi** | Semua pihak terkait dapat memantau status laporan secara real-time |
| 📄 **Standarisasi** | Semua laporan menggunakan template PDF resmi perusahaan |

---

## 2. User Personas

### Persona 1 — Dito, NOC Operator
> *"Saya butuh cara cepat ambil data trafik dari Cacti dan langsung bikin laporan tanpa perlu bolak-balik buka beberapa sistem."*

- **Departemen:** Network Operation
- **Role:** OPERATOR
- **Kegiatan utama:** Membuat laporan MRTG/SLA, menginput tiket & downtime, mengelola master pelanggan
- **Pain point:** Proses manual yang lambat, risiko salah input, tidak tahu status approval laporan
- **Kebutuhan kunci:** Generator yang cepat, otofetch grafik dari monitoring, preview sebelum simpan

---

### Persona 2 — Rini, NOC Supervisor
> *"Saya harus bisa review laporan dengan cepat dan pastikan kualitasnya sebelum ke departemen lain. Saya juga ingin tahu kalau ada laporan yang sudah lama belum diproses."*

- **Departemen:** Network Operation
- **Role:** SUPERVISOR
- **Kegiatan utama:** Review & approve laporan Tier 1, kickoff jadwal bulanan, pantau antrian
- **Pain point:** Tidak ada notifikasi saat laporan masuk, proses review tersebar via email/chat
- **Kebutuhan kunci:** Antrian approval terpusat, notifikasi real-time, catatan revisi yang jelas

---

### Persona 3 — Budi, Staff Customer Experience
> *"Saya sering minta laporan SLA ke NOC via chat, tapi tidak tahu sudah sampai mana prosesnya. Kalau sudah jadi, saya mau bisa langsung download sendiri."*

- **Departemen:** Customer Experience
- **Role:** STAFF
- **Kegiatan utama:** Mengajukan permintaan laporan, memantau status, mengunduh laporan approved
- **Pain point:** Tidak ada sistem tracking permintaan, harus follow-up manual ke NOC
- **Kebutuhan kunci:** Form permintaan yang mudah, tracking status real-time, notifikasi selesai

---

### Persona 4 — Hendra, CX Supervisor
> *"Saya perlu menyetujui laporan sebelum dikirim ke pelanggan, tapi harus bisa review isi laporan dulu sebelum klik approve."*

- **Departemen:** Customer Experience
- **Role:** SUPERVISOR
- **Kegiatan utama:** Review & approve laporan Tier 2 untuk departemen CX
- **Pain point:** Tidak ada mekanisme formal untuk melihat dan menyetujui laporan
- **Kebutuhan kunci:** Halaman approval khusus, preview laporan, kemampuan kembalikan dengan catatan

---

### Persona 5 — Admin System, Tim IT
> *"Saya butuh bisa atur siapa saja yang bisa akses sistem ini, serta konfigurasi koneksi ke Cacti, PRTG, dan sistem notifikasi."*

- **Departemen:** Network Operation
- **Role:** ADMIN
- **Kegiatan utama:** Manajemen user, konfigurasi sistem, monitoring kesehatan sistem
- **Pain point:** Tidak ada panel admin terpusat
- **Kebutuhan kunci:** Dashboard admin, manajemen user, konfigurasi global tanpa restart server

---

## 3. Fitur Produk

---

### F-01 — Autentikasi & Manajemen Sesi

**Deskripsi:** Sistem keamanan login berbasis cookie terenkripsi dengan kontrol akses berbasis role.

#### User Stories

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-01.1 | Semua pengguna | Login dengan username & password | Dapat mengakses sistem sesuai hak saya |
| US-01.2 | Semua pengguna | Logout dari sistem | Sesi saya berakhir dengan aman |
| US-01.3 | Semua pengguna | Diarahkan ke halaman yang sesuai setelah login | Langsung dapat memulai pekerjaan |
| US-01.4 | Sistem | Menolak sesi yang sudah expired | Keamanan data terjaga |

#### Acceptance Criteria

- [ ] Halaman login menampilkan form username dan password
- [ ] Gagal login menampilkan pesan error yang informatif (bukan pesan teknis)
- [ ] Sesi login tersimpan di HTTP-only cookie (tidak bisa diakses via JavaScript)
- [ ] Pengguna yang sesinya expired diarahkan ke halaman login dengan pesan
- [ ] Pengguna NOC diarahkan ke `/` (Generator) setelah login
- [ ] Pengguna non-NOC diarahkan ke `/requests` setelah login
- [ ] Pengguna yang dinonaktifkan Admin tidak bisa login

---

### F-02 — Generator Laporan

**Deskripsi:** Halaman utama pembuatan laporan MRTG dan SLA dengan integrasi langsung ke sistem monitoring.

#### User Stories

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-02.1 | NOC Operator | Memilih pelanggan dari direktori | Data otomatis terisi tanpa input manual |
| US-02.2 | NOC Operator | Memilih tipe laporan (MRTG/SLA) | Formulir menyesuaikan tipe laporan |
| US-02.3 | NOC Operator | Mengambil grafik trafik dari Cacti secara otomatis | Tidak perlu screenshot manual |
| US-02.4 | NOC Operator | Mengambil grafik trafik dari PRTG secara otomatis | Mendukung kedua sistem monitoring |
| US-02.5 | NOC Operator | Melihat preview laporan sebelum menyimpan | Bisa koreksi sebelum submit |
| US-02.6 | NOC Operator | Mendownload draft PDF sebelum menyimpan | Bisa review fisik terlebih dahulu |
| US-02.7 | NOC Operator | Menyimpan laporan dan menghasilkan PDF | Laporan masuk sistem dan antrian approval |
| US-02.8 | NOC Operator | Membuat laporan MRTG dan SLA sekaligus (mode BOTH) | Efisiensi untuk pelanggan yang butuh keduanya |
| US-02.9 | NOC Operator | Merevisi laporan yang dikembalikan | Bisa perbaiki laporan tanpa buat ulang |
| US-02.10 | NOC Supervisor | Langsung menyetujui laporan saat membuat (Direct Approve) | Efisiensi untuk laporan Internal NOC |

#### Acceptance Criteria

- [ ] Form Generator dapat menerima parameter dari URL (pre-fill dari Request atau Schedule)
- [ ] Pemilihan pelanggan melalui modal pencarian direktori pelanggan
- [ ] Nomor dokumen digenerate otomatis saat halaman dibuka (format: `PREFIX/TYPE/PERIOD/SEQ`)
- [ ] Nomor dokumen dapat diedit secara manual oleh operator
- [ ] Tombol "Fetch Cacti" mengambil grafik dan metadata trafik (DL Avg, DL Max, UL Avg, UL Max, Unit)
- [ ] Tombol "Fetch PRTG" mengambil data sensor dari PRTG
- [ ] Indikator status fetch menampilkan: loading, sukses (dengan data), warning, atau error
- [ ] Live Preview menampilkan tampilan PDF real-time seiring perubahan data
- [ ] Tabel Tiket dan Tabel Case dapat ditambah, diedit, dan dihapus baris-nya
- [ ] Kalkulasi SLA ditampilkan secara real-time di halaman (online%, downtime%, durasi)
- [ ] Tombol simpan aktif setelah nama pelanggan dan periode terisi
- [ ] Setelah simpan, tampil konfirmasi dengan nomor dokumen dan link ke riwayat
- [ ] Mode BOTH menjalankan wizard 2-langkah: SLA dulu → MRTG
- [ ] Mode revisi menampilkan banner catatan revisi dari Supervisor

---

### F-03 — Riwayat & Approval Laporan

**Deskripsi:** Halaman daftar laporan dengan fungsi approval, download, revisi, dan penghapusan.

#### User Stories

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-03.1 | NOC Operator | Melihat semua laporan yang saya buat | Memantau status terkini |
| US-03.2 | NOC Supervisor | Menyetujui laporan di antrian Tier 1 | Laporan lanjut ke Tier 2 |
| US-03.3 | NOC Supervisor | Mengembalikan laporan dengan catatan | Operator tahu apa yang harus diperbaiki |
| US-03.4 | CX Supervisor | Menyetujui laporan di antrian Tier 2 | Laporan resmi disetujui dan bisa diunduh |
| US-03.5 | Semua user | Mengunduh PDF laporan yang telah disetujui | Mendistribusikan laporan ke pelanggan |
| US-03.6 | Semua user | Melihat detail informasi laporan | Review isi sebelum approve/download |
| US-03.7 | NOC Operator | Menavigasi ke halaman revisi laporan | Perbaiki laporan yang dikembalikan |
| US-03.8 | Admin/Supervisor | Menghapus laporan | Bersihkan laporan yang tidak valid |

#### Acceptance Criteria

- [ ] Daftar laporan ditampilkan dalam tabel dengan kolom: No. Dokumen, Pelanggan, Tipe, Periode, Status, Dibuat oleh, Tanggal
- [ ] Filter berdasarkan: status, tipe laporan, periode, departemen
- [ ] Pencarian real-time berdasarkan nama pelanggan atau nomor dokumen
- [ ] Badge warna berbeda untuk setiap status (kuning=pending, hijau=approved, merah=revision)
- [ ] Modal detail laporan menampilkan seluruh informasi termasuk histori audit
- [ ] Tombol Approve dan Reject hanya tampil sesuai role dan status laporan
- [ ] Form catatan revisi wajib diisi saat mengembalikan laporan
- [ ] Laporan yang sudah APPROVED menampilkan tombol Download PDF
- [ ] Laporan dengan status REVISION_NEEDED menampilkan tombol Revisi yang mengarah ke Generator
- [ ] Pagination atau scroll infinite untuk daftar laporan yang panjang
- [ ] Stat cards di atas tabel menampilkan: Total, Pending, Approved, Revision

---

### F-04 — Manajemen Master Data Pelanggan

**Deskripsi:** Direktori terpusat pelanggan dengan kemampuan CRUD, import, export, dan sinkronisasi.

#### User Stories

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-04.1 | NOC Operator | Menambah data pelanggan baru | Pelanggan tersedia di Generator |
| US-04.2 | NOC Operator | Mengubah data pelanggan yang ada | Data selalu akurat dan terkini |
| US-04.3 | NOC Operator | Menghapus pelanggan yang tidak aktif | Direktori bersih dari data lama |
| US-04.4 | NOC Operator | Mengimpor banyak pelanggan sekaligus dari Excel | Tidak perlu input satu per satu |
| US-04.5 | NOC Operator | Mengekspor seluruh data pelanggan ke Excel | Backup dan pelaporan ke manajemen |
| US-04.6 | NOC Operator | Mendaftarkan pelanggan ke jadwal laporan bulanan | Laporan rutin ter-generate otomatis |
| US-04.7 | NOC Operator | Mencari dan memfilter pelanggan | Temukan pelanggan dengan cepat |
| US-04.8 | NOC Supervisor | Sinkronisasi jumlah node dari Service ID | Data node selalu konsisten |

#### Acceptance Criteria

- [ ] Tabel pelanggan menampilkan: Nama, Customer ID, Service ID, Paket Layanan, Node, Target SLA, Engine
- [ ] Sortir kolom ascending/descending pada semua kolom utama
- [ ] Filter tab: Semua, Routine, Has Cacti, Has PRTG, Has Both, No Graph
- [ ] Filter dropdown: Jenis Layanan, Target SLA
- [ ] Pencarian real-time berdasarkan nama, Customer ID, atau Service ID
- [ ] Modal form pelanggan memvalidasi format Service ID (`XX.XXXX.X`)
- [ ] Import Excel menampilkan preview dan summary sebelum konfirmasi
- [ ] Export menghasilkan file `.xlsx` dengan nama `customers-export-YYYYMMDD.xlsx`
- [ ] Bulk delete dengan konfirmasi jumlah data yang akan dihapus
- [ ] Pagination dengan navigasi first/prev/next/last

---

### F-05 — Discovery Jaringan

**Deskripsi:** Engine on-demand untuk menemukan perangkat dan interface dari Cacti/PRTG secara otomatis.

#### User Stories

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-05.1 | NOC Operator | Trigger discovery dari Cacti | Daftar grafik terupdate ke database lokal |
| US-05.2 | NOC Operator | Trigger discovery dari PRTG | Daftar sensor terupdate ke database lokal |
| US-05.3 | NOC Operator | Melihat pohon perangkat hasil discovery | Navigasi hierarki Group → Device → Interface |
| US-05.4 | NOC Operator | Mencari perangkat atau interface tertentu | Temukan ID grafik/sensor dengan cepat |
| US-05.5 | NOC Operator | Memetakan interface ke pelanggan | Hubungkan ID grafik ke Customer di direktori |
| US-05.6 | NOC Operator | Menyalin targetId (Graph ID / Sensor ID) | Paste langsung ke form Generator |

#### Acceptance Criteria

- [ ] Tombol "Sync MRTG" dan "Sync PRTG" menjalankan discovery dan menampilkan progress
- [ ] Summary setelah sync: total device ditemukan, total interface, waktu sync terakhir
- [ ] Tampilan tree: Group → Device → Interface (collapsible)
- [ ] Setiap interface menampilkan: nama, targetId, detectedSID, detectedCID, status
- [ ] Pencarian real-time memfilter seluruh tree sekaligus
- [ ] Tombol copy pada setiap targetId
- [ ] Modal pemetaan: input Service ID → cari → konfirmasi → update Customer
- [ ] Filter engine: Tampilkan MRTG saja / PRTG saja / Keduanya

---

### F-06 — Sistem Permintaan Laporan

**Deskripsi:** Portal self-service bagi departemen non-NOC untuk mengajukan dan melacak permintaan laporan.

#### User Stories

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-06.1 | Staff CX/AE/Finance | Mengajukan permintaan laporan | NOC tahu kebutuhan saya secara formal |
| US-06.2 | Staff CX/AE/Finance | Melihat status permintaan saya | Tahu kapan laporan siap tanpa follow-up manual |
| US-06.3 | Staff CX/AE/Finance | Membatalkan permintaan yang belum diproses | Fleksibilitas jika kebutuhan berubah |
| US-06.4 | NOC Operator | Melihat semua permintaan masuk | Kelola antrian kerja dengan prioritas |
| US-06.5 | NOC Operator | Memproses permintaan langsung ke Generator | Alur kerja terintegrasi tanpa salin-tempel |
| US-06.6 | NOC Operator | Menandai permintaan sebagai selesai | Status permintaan terpantau |

#### Acceptance Criteria

- [ ] Form permintaan: Nama pelanggan, Customer ID, Service ID, Tipe Laporan, Periode, Urgensi, Catatan
- [ ] Mendukung pemilihan multi-periode dalam satu permintaan
- [ ] Nomor tiket digenerate otomatis: `REQ-YYYYMM-XXXX`
- [ ] Nomor tiket dapat disalin (copy to clipboard)
- [ ] Tabel permintaan menampilkan: No. Tiket, Pemohon, Dept, Pelanggan, Tipe, Periode, Urgensi, Status
- [ ] Filter status: Semua, Pending, In Progress, Completed, Cancelled
- [ ] Badge Urgensi: NORMAL (abu-abu) / URGENT (merah)
- [ ] Tombol "Proses ke Generator" pre-fill form Generator dengan data permintaan
- [ ] Setelah Generator selesai, permintaan otomatis berubah menjadi COMPLETED
- [ ] NOC dapat melihat semua permintaan; non-NOC hanya melihat permintaan departemennya

---

### F-07 — Jadwal Laporan Bulanan (Monthly Schedule)

**Deskripsi:** Manajemen dan pemantauan task laporan rutin bulanan untuk pelanggan terdaftar.

#### User Stories

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-07.1 | NOC Supervisor | Memulai jadwal laporan bulan ini (kickoff) | Task dibuat otomatis untuk semua pelanggan Routine |
| US-07.2 | NOC Operator | Melihat daftar task jadwal bulan ini | Tahu siapa saja yang harus dibuatkan laporan |
| US-07.3 | NOC Operator | Navigasi dari task langsung ke Generator | Langsung buat laporan untuk pelanggan tersebut |
| US-07.4 | NOC Supervisor | Menambah pelanggan ad-hoc ke jadwal berjalan | Fleksibilitas jika ada penambahan mendadak |
| US-07.5 | NOC Supervisor | Menghapus task dari jadwal | Hapus task yang tidak relevan |
| US-07.6 | Semua user NOC | Melihat statistik penyelesaian jadwal | Pantau progress keseluruhan |

#### Acceptance Criteria

- [ ] Stat cards: Total Task, Selesai, Pending, Gagal, Breached, % Penyelesaian
- [ ] Tabel task menampilkan: Pelanggan, Service ID, Tipe, Dept, Kickoff, Deadline, Status, Dikerjakan oleh
- [ ] Filter: Bulan/Tahun, Departemen, Kategori (SLA/MRTG), Status
- [ ] Timer/badge deadline menampilkan sisa waktu atau status lewat
- [ ] Tombol "Kerjakan" di setiap task PENDING mengarah ke Generator dengan pre-fill
- [ ] Konfirmasi kickoff menampilkan jumlah pelanggan yang akan dibuatkan task
- [ ] Task COMPLETED menampilkan link ke laporan terkait
- [ ] Warna status: Kuning=Pending, Hijau=Completed, Merah=Breached, Abu=Failed

---

### F-08 — Notifikasi (Telegram & Email)

**Deskripsi:** Sistem notifikasi otomatis ke Telegram Bot dan email departemen.

#### User Stories

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-08.1 | NOC Supervisor | Mendapat notifikasi Telegram saat laporan masuk antrian | Segera tahu ada laporan yang perlu direview |
| US-08.2 | Dept. Supervisor | Mendapat notifikasi saat laporan menunggu approval Tier 2 | Tidak terlewat laporan yang perlu tanda tangan |
| US-08.3 | Pemohon | Mendapat notifikasi email saat laporan permintaan selesai | Tidak perlu follow-up manual |
| US-08.4 | Admin | Menguji koneksi Telegram dari halaman Settings | Verifikasi konfigurasi sebelum production |

#### Acceptance Criteria

- [ ] Notifikasi Telegram dikirim saat: laporan dibuat, disetujui, direvisi, laporan revision-needed
- [ ] Notifikasi email dikirim saat: permintaan diterima, laporan permintaan selesai
- [ ] Konten notifikasi mencantumkan: nama pelanggan, service ID, nomor dokumen, status, waktu
- [ ] Kegagalan pengiriman notifikasi tidak memblokir proses utama (silent fail dengan log)
- [ ] Tombol test Telegram di Settings mengirim pesan percobaan

---

### F-09 — Manajemen Pengguna (Admin)

**Deskripsi:** Panel administrasi untuk mengelola akun pengguna sistem.

#### User Stories

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-09.1 | Admin | Membuat akun pengguna baru | Orang yang baru bergabung bisa mengakses sistem |
| US-09.2 | Admin | Mengubah role dan departemen pengguna | Penyesuaian saat ada perubahan organisasi |
| US-09.3 | Admin | Menonaktifkan akun tanpa menghapus | Menjaga riwayat tanpa memberikan akses |
| US-09.4 | Admin | Me-reset password pengguna | Bantu pengguna yang lupa password |

#### Acceptance Criteria

- [ ] Daftar pengguna menampilkan: Username, Nama, Departemen, Role, Status, Login Terakhir
- [ ] Form tambah/edit pengguna: Username, Nama Lengkap, Email, Password, Role, Departemen
- [ ] Validasi username unik (tidak boleh duplikat)
- [ ] Toggle aktif/nonaktif pengguna dengan konfirmasi
- [ ] Password baru digenerate sistem atau diinput manual saat reset
- [ ] Filter berdasarkan departemen dan role
- [ ] Halaman ini hanya dapat diakses oleh role ADMIN

---

### F-10 — Konfigurasi Sistem (Settings)

**Deskripsi:** Panel konfigurasi global untuk koneksi monitoring, notifikasi, dan template dokumen.

#### User Stories

| ID | Sebagai | Saya ingin | Agar |
|---|---|---|---|
| US-10.1 | Admin | Mengatur URL dan kredensial Cacti | Generator dapat terhubung ke monitoring MRTG |
| US-10.2 | Admin | Mengatur URL dan kredensial PRTG | Generator dapat terhubung ke monitoring PRTG |
| US-10.3 | Admin | Mengatur konfigurasi SMTP | Notifikasi email dapat dikirim |
| US-10.4 | Admin | Mengatur Bot Token dan Chat ID Telegram | Notifikasi Telegram dapat dikirim |
| US-10.5 | Admin | Mengatur prefix nomor dokumen | Nomor dokumen sesuai format perusahaan |
| US-10.6 | Admin | Mengatur target SLA default | Nilai default terpasang di form Generator |

#### Acceptance Criteria

- [ ] Halaman Settings dibagi dalam tab/seksi: MRTG, PRTG, Dokumen, Notifikasi Telegram, Email/SMTP
- [ ] Semua field konfigurasi dapat disimpan dan dimuat kembali
- [ ] Password/secret field menggunakan input type="password" (tersembunyi)
- [ ] Tombol "Test Connection" untuk Cacti, PRTG, dan Telegram
- [ ] Perubahan konfigurasi langsung efektif tanpa restart server
- [ ] Halaman ini hanya dapat diakses oleh role ADMIN

---

## 4. Spesifikasi UI/UX per Halaman

### 4.1 Desain Sistem

| Aspek | Spesifikasi |
|---|---|
| **Font** | Inter (body), Poppins (heading) |
| **Framework CSS** | Tailwind CSS |
| **Komponen UI** | Radix UI Primitives (Dialog, Select, Checkbox, Tabs, Tooltip, Dropdown) |
| **Ikon** | Lucide React |
| **Toast** | Sonner (non-intrusive corner notification) |
| **Target Device** | Desktop browser (1280px ke atas) |
| **Bahasa UI** | Bahasa Indonesia (konten), Inggris (kode & teknis) |
| **Color Scheme** | Light mode; warna brand: Oranye (aksen), Slate (netral) |

### 4.2 Layout Global

```
┌─────────────────────────────────────────────────┐
│  [Logo GENRE]        Navigasi Top Bar    [User] │
├─────────────────────────────────────────────────┤
│                                                 │
│           Konten Halaman Utama                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

- **Navigasi:** Top navigation bar dengan link ke seluruh modul yang dapat diakses user
- **Page Header:** Setiap halaman memiliki komponen `PageHeader` dengan judul, breadcrumb, dan action button
- **Responsive:** Dioptimalkan untuk desktop; tablet/mobile sebagai best-effort

### 4.3 Komponen Reusable

| Komponen | Fungsi |
|---|---|
| `PageHeader` | Judul halaman, breadcrumb, action button kanan |
| `StatCard` | Card statistik dengan angka besar dan label |
| `Badge` | Label status berwarna (approval status, urgensi) |
| `EmptyState` | Tampilan kosong saat tidak ada data |
| `ConfirmDialog` | Dialog konfirmasi aksi destruktif |
| `InfoTooltip` | Tooltip ikon informasi tambahan |
| `SegmentedControl` | Toggle tab filter (mirip radio button visual) |
| `Spinner` | Loading indicator |
| `Table` + sub-komponen | Tabel standar dengan header sticky |

### 4.4 Komponen PDF Report

Laporan PDF digenerate menggunakan HTML → Puppeteer dengan spesifikasi:
- Ukuran kertas: **A4 Portrait** (210mm × 297mm)
- Font: Inter + Poppins (via Google Fonts)
- Halaman 1: **Cover** dengan background gambar, judul laporan, nama pelanggan, periode
- Halaman 2: Data pelanggan, grafik trafik, statistik bandwidth
- Halaman 3: Kalkulasi SLA dan tabel downtime/ticket
- Halaman 4 (opsional): Overflow tabel jika baris banyak (> 4 entries tiket+case)
- Watermark: Badge "CONFIDENTIAL" pada setiap halaman

---

## 5. Spesifikasi API

### 5.1 Autentikasi

| Method | Endpoint | Body | Response | Akses |
|---|---|---|---|---|
| `POST` | `/api/auth/login` | `{ username, password }` | `{ user, token }` | Public |
| `POST` | `/api/auth/logout` | — | `{ success }` | Authenticated |
| `GET` | `/api/auth/me` | — | `{ user }` | Authenticated |

### 5.2 Laporan

| Method | Endpoint | Deskripsi | Akses |
|---|---|---|---|
| `GET` | `/api/reports` | List laporan (dengan filter query params) | Auth + scoped |
| `GET` | `/api/reports?id={id}` | Detail satu laporan | Auth + scoped |
| `GET` | `/api/reports?id={id}&logs=1` | Detail + audit trail | Auth + scoped |
| `GET` | `/api/reports?queue=pending` | Antrian approval | Auth + role |
| `POST` | `/api/reports` | Buat laporan baru + generate PDF | `report:create` |
| `PUT` | `/api/reports` | Revisi laporan (update + regenerate PDF) | `report:create` |
| `DELETE` | `/api/reports?id={id}` | Hapus laporan + file PDF | `report:delete` |
| `POST` | `/api/reports/approve` | Approve / reject laporan | `report:approve` |
| `GET` | `/api/reports/download?id={id}` | Download file PDF | Auth + scoped |
| `GET` | `/api/reports/next-number` | Nomor dokumen berikutnya | `report:create` |

### 5.3 Pelanggan

| Method | Endpoint | Deskripsi | Akses |
|---|---|---|---|
| `GET` | `/api/customers` | List semua pelanggan | `customer:read` |
| `POST` | `/api/customers` | Tambah pelanggan | `customer:write` |
| `PUT` | `/api/customers` | Update pelanggan | `customer:write` |
| `DELETE` | `/api/customers?id={id}` | Hapus pelanggan | `customer:write` |
| `POST` | `/api/customers/import` | Import dari Excel | `customer:write` |
| `GET` | `/api/customers/export` | Export ke Excel | `customer:export` |

### 5.4 Discovery

| Method | Endpoint | Deskripsi | Akses |
|---|---|---|---|
| `GET` | `/api/discovery` | List hasil discovery (tree) | `discovery:view` |
| `POST` | `/api/discovery` | Trigger discovery MRTG/PRTG | `discovery:manage` |
| `POST` | `/api/discovery/map` | Petakan interface ke pelanggan | `discovery:manage` |

### 5.5 Monitoring (MRTG/PRTG Fetch)

| Method | Endpoint | Deskripsi | Akses |
|---|---|---|---|
| `GET` | `/api/cacti-graph` | Ambil grafik + data trafik dari Cacti | `report:create` |
| `GET` | `/api/prtg-graph` | Ambil data sensor dari PRTG | `report:create` |

### 5.6 Request, Schedule, Settings, Users

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET/POST/PATCH/DELETE` | `/api/requests` | CRUD report request |
| `GET/POST` | `/api/schedule` | List task / kickoff bulanan |
| `PATCH` | `/api/schedule` | Update status task |
| `GET/POST` | `/api/settings` | Baca / simpan AppConfig |
| `GET/POST/PUT/DELETE` | `/api/users` | CRUD user (Admin only) |
| `GET/POST/PUT/DELETE` | `/api/staff` | CRUD staf/PIC |

---

## 6. Model Data Produk

### 6.1 Entitas Utama dan Relasi

```
Customer ──────────────────────────────────────────────┐
    │ (Service ID, Graph ID, Target SLA, Routine flag) │
    │                                                  │
    ├── Report (1:N)                                   │
    │       │ (PDF, SLA result, approval status)       │
    │       └── ReportAuditLog (1:N)                   │
    │                                                  │
    ├── ReportRequest (1:N)                            │
    │       │ (ticket number, status, processed ID)    │
    │       └── links to Report                        │
    │                                                  │
    └── MonthlyScheduleTask (1:N)                      │
            (deadline, completion status)              │
                                                       │
User ──────────────────────────────────────────────────┘
    (creates Reports, processes Requests, approves)

AppConfig ── Singleton (URL, credentials, templates)
StaffMember ── Directory PIC (linked to Customer.salesPicId / cePicId)
DiscoveredItem ── Cache discovery results (engine, device, interface)
```

### 6.2 Status State Machine — Report

```
                    ┌──────────────┐
                    │   [Created]  │
                    └──────┬───────┘
                           │ POST /api/reports
                           ▼
              ┌─────────────────────────┐
              │  PENDING_NOC_APPROVAL   │◄──── Re-submit setelah revisi
              └────────────┬────────────┘
                           │ NOC Supervisor: Approve
                   ┌───────┴────────┐
                   │                │ NOC Supervisor: Reject
                   ▼                ▼
     ┌──────────────────────┐  ┌──────────────────┐
     │ PENDING_DEPT_APPROVAL│  │  REVISION_NEEDED  │
     └──────────┬───────────┘  └──────────────────┘
                │ Dept Supervisor: Approve    ▲
        ┌───────┴────────┐                   │ Dept Supervisor: Reject
        │                │                   │
        ▼                └───────────────────┘
   ┌──────────┐
   │ APPROVED │
   └──────────┘
        │
   PDF dapat diunduh
```

### 6.3 Status State Machine — ReportRequest

```
PENDING → IN_PROGRESS → COMPLETED
   │                       ▲
   │                       │ (saat report terkait APPROVED)
   └──→ CANCELLED
   └──→ SCHEDULED_ROUTINE (untuk task dari jadwal bulanan)
```

---

## 7. Penanganan Error & Edge Case

| Skenario | Penanganan Produk |
|---|---|
| **Cacti tidak dapat diakses** | Tampilkan pesan error spesifik, operator dapat input manual atau skip grafik |
| **PRTG tidak dapat diakses** | Tampilkan pesan error, fallback ke input manual |
| **Nomor dokumen duplikat** | Sistem auto-realokasi nomor unik berikutnya (hingga 3 percobaan) |
| **Race condition concurrent simpan** | Loop retry dengan nomor baru jika error P2002 (Prisma unique constraint) |
| **PDF gagal digenerate** | Laporan tetap tersimpan di DB; PDF dapat di-regenerate ulang dari halaman riwayat |
| **Notifikasi Telegram/Email gagal** | Proses utama tidak terblokir; error dicatat di server log |
| **Session expired saat mengisi form** | Redirect ke login; form state hilang (perlu isi ulang) |
| **Pengguna mencoba akses URL terlarang** | Redirect ke halaman utama atau tampilkan halaman 403 |
| **Data discovery kosong (0 grafik)** | Tampilkan pesan error spesifik dengan petunjuk troubleshoot |
| **File Excel import tidak valid** | Tampilkan baris mana yang gagal dan alasan validasinya |
| **Deadline task jadwal terlewat** | Status otomatis berubah ke BREACHED saat cek dilakukan |
| **Approval oleh user dari dept yang salah** | API menolak dengan HTTP 403 dan pesan informatif |

---

## 8. Prioritas Fitur (MoSCoW)

| Kategori | Fitur |
|---|---|
| **Must Have** ✅ | F-01 Autentikasi, F-02 Generator Laporan, F-03 Approval & Riwayat, F-09 Manajemen User |
| **Should Have** 🟡 | F-04 Master Pelanggan, F-05 Discovery, F-06 Request System, F-10 Settings |
| **Could Have** 🔵 | F-07 Jadwal Bulanan, F-08 Notifikasi Telegram/Email |
| **Won't Have (v1)** ⬜ | Pengiriman PDF ke email pelanggan, Mobile app, Integrasi billing |

---

## 9. Metrik Keberhasilan Produk

### 9.1 Metrik Efisiensi Operasional

| Metrik | Baseline (Sebelum) | Target (Setelah) | Cara Ukur |
|---|---|---|---|
| Waktu pembuatan 1 laporan | ± 60 menit | ≤ 10 menit | Rata-rata dari `createdAt` vs estimasi mulai |
| Kesalahan kalkulasi SLA | Ada (manual) | 0% | Audit berkala terhadap formula |
| Laporan yang terlewat deadline bulanan | Tidak termonitor | ≤ 5% BREACHED | Dashboard jadwal |
| Waktu rata-rata approval Tier 1 | Tidak termonitor | ≤ 1 hari kerja | `createdAt` vs `nocApprovedAt` |

### 9.2 Metrik Adopsi

| Metrik | Target 1 Bulan | Target 3 Bulan |
|---|---|---|
| % laporan dibuat via GENRE (vs manual) | ≥ 80% | 100% |
| Jumlah pengguna aktif | ≥ 5 user | Semua staf terkait |
| Permintaan laporan via sistem | ≥ 50% dari total | ≥ 90% dari total |

### 9.3 Metrik Teknis

| Metrik | Target |
|---|---|
| Uptime sistem | ≥ 99% selama jam kerja |
| Waktu load halaman (LAN) | ≤ 3 detik |
| Waktu generate PDF | ≤ 30 detik per laporan |
| Waktu discovery MRTG (30.000 grafik) | ≤ 5 menit |

---

## 10. Roadmap Produk

```
▶ FASE 1 — Core (Sudah selesai)
  ├── Autentikasi & RBAC
  ├── Generator Laporan (MRTG + SLA)
  ├── Kalkulasi SLA otomatis
  ├── Approval 2-Tier
  ├── Riwayat Laporan & Download PDF
  ├── Master Data Pelanggan (CRUD + Import/Export)
  ├── Discovery MRTG (Cacti)
  ├── Discovery PRTG
  ├── Notifikasi Telegram
  ├── Manajemen User (Admin)
  └── Konfigurasi Sistem

▶ FASE 2 — Workflow (Sudah selesai)
  ├── Sistem Permintaan Laporan (Request Queue)
  ├── Jadwal Laporan Bulanan (Monthly Routine)
  ├── Notifikasi Email (SMTP)
  ├── Mode BOTH (SLA + MRTG Wizard)
  ├── Direktori Staf/PIC
  └── Audit Trail lengkap per laporan

▶ FASE 3 — Enhancement (Direncanakan)
  ├── Dashboard KPI & statistik laporan
  ├── Regenerasi PDF dari halaman riwayat
  ├── Reminder otomatis untuk approval yang tertunda
  ├── Filter & export riwayat laporan ke Excel
  └── Pencarian global (semua modul)

▶ FASE 4 — Integrasi (Future)
  ├── Pengiriman PDF otomatis ke email pelanggan eksternal
  ├── Integrasi dengan sistem ticketing (helpdesk)
  ├── API publik untuk integrasi sistem lain
  └── Dashboard executive (read-only view untuk manajemen)
```

---

*Dokumen PRD ini disusun berdasarkan analisis codebase GENRE Reporting System pada 18 November 2026.*
*Pembaruan dokumen diperlukan setiap ada perubahan fitur atau requirement baru.*
