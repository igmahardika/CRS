# Business Requirements Document (BRD)
## GENRE Reporting System

---

| | |
|---|---|
| **Nama Proyek** | GENRE — Generator of Network Reporting |
| **Nama Dokumen** | Business Requirements Document (BRD) |
| **Versi Dokumen** | 1.0 |
| **Status** | Final |
| **Tanggal** | 18 November 2026 |
| **Departemen Pemilik** | Network Operation Center (NOC) — PT. NEXA |
| **Dibuat oleh** | Tim Network Operation |

---

## Daftar Isi

1. [Pendahuluan](#1-pendahuluan)
2. [Latar Belakang & Permasalahan](#2-latar-belakang--permasalahan)
3. [Tujuan Bisnis](#3-tujuan-bisnis)
4. [Ruang Lingkup](#4-ruang-lingkup)
5. [Pemangku Kepentingan (Stakeholder)](#5-pemangku-kepentingan-stakeholder)
6. [Kebutuhan Bisnis (Business Requirements)](#6-kebutuhan-bisnis-business-requirements)
7. [Alur Proses Bisnis](#7-alur-proses-bisnis)
8. [Kebutuhan Non-Fungsional](#8-kebutuhan-non-fungsional)
9. [Aturan Bisnis (Business Rules)](#9-aturan-bisnis-business-rules)
10. [Asumsi & Batasan](#10-asumsi--batasan)
11. [Kriteria Keberhasilan](#11-kriteria-keberhasilan)
12. [Risiko Bisnis](#12-risiko-bisnis)
13. [Glosarium](#13-glosarium)

---

## 1. Pendahuluan

### 1.1 Tujuan Dokumen

Dokumen ini mendeskripsikan kebutuhan bisnis yang mendasari pengembangan **GENRE Reporting System** — sebuah platform internal berbasis web yang digunakan oleh PT. NEXA untuk mengotomasi proses pembuatan, pengelolaan, dan distribusi laporan layanan pelanggan secara digital.

### 1.2 Lingkup Pembaca

Dokumen ini ditujukan kepada:
- Manajemen dan Pimpinan Departemen
- Tim Network Operation Center (NOC)
- Tim Customer Experience, Account Executive, dan Finance
- Tim Pengembang Aplikasi
- Tim QA dan Tester

### 1.3 Referensi

- Technical Documentation GENRE Reporting System v1.0
- SOP Pelaporan Layanan Pelanggan PT. NEXA
- Standar SLA Layanan PT. NEXA

---

## 2. Latar Belakang & Permasalahan

### 2.1 Kondisi Sebelum Sistem

Sebelum adanya GENRE Reporting System, proses pelaporan layanan pelanggan di PT. NEXA dilakukan secara **manual** dengan karakteristik sebagai berikut:

| Aspek | Kondisi Sebelumnya |
|---|---|
| **Pembuatan Laporan** | Manual — data trafik diambil secara individual dari dashboard Cacti/PRTG |
| **Format Laporan** | Tidak standar, bergantung pada individu yang membuat |
| **Kalkulasi SLA** | Dihitung manual menggunakan spreadsheet, rawan kesalahan |
| **Proses Approval** | Via email/chat, tidak ada jejak digital yang terstruktur |
| **Distribusi** | Dikirim manual via email, berpotensi tertunda atau terlewat |
| **Penyimpanan** | Tersebar di komputer lokal, tidak terpusat |
| **Permintaan Laporan** | Via pesan/email informal, tidak ada tracking status |

### 2.2 Permasalahan Utama

1. **Inefisiensi Waktu** — Pembuatan satu laporan membutuhkan waktu lama karena harus mengakses monitoring, mengolah data, dan memformat dokumen secara manual.
2. **Risiko Kesalahan** — Kalkulasi SLA manual berpotensi menghasilkan angka yang tidak akurat dan tidak konsisten.
3. **Tidak Ada Standarisasi** — Format laporan berbeda-beda antar operator NOC, mengurangi profesionalisme.
4. **Tidak Ada Audit Trail** — Tidak ada catatan siapa yang membuat, menyetujui, atau merevisi laporan.
5. **Proses Approval Tidak Terstruktur** — Approval dilakukan via chat/email sehingga sulit dilacak dan berpotensi terlewat.
6. **Tidak Ada Visibilitas Lintas Departemen** — Departemen CX, AE, dan Finance tidak bisa memantau status laporan secara mandiri.
7. **Keterlambatan Pelaporan** — Tidak ada mekanisme jadwal dan deadline yang termonitor.

---

## 3. Tujuan Bisnis

### 3.1 Tujuan Utama

| # | Tujuan | Indikator Keberhasilan |
|---|---|---|
| BG-01 | Mempercepat proses pembuatan laporan pelanggan | Waktu pembuatan laporan ≤ 10 menit per laporan |
| BG-02 | Menstandardisasi format dan kualitas laporan | 100% laporan menggunakan template resmi perusahaan |
| BG-03 | Memastikan keakuratan perhitungan SLA | Kesalahan kalkulasi 0% (otomatis dan terverifikasi) |
| BG-04 | Mewujudkan proses approval yang terstruktur & transparan | Semua laporan melewati alur approval 2-tier yang terdokumentasi |
| BG-05 | Memberikan visibilitas status laporan kepada semua pihak | Departemen terkait dapat memantau status laporan secara real-time |
| BG-06 | Memastikan kepatuhan jadwal pelaporan bulanan | 100% laporan rutin terpenuhi sebelum deadline |
| BG-07 | Menyediakan arsip laporan terpusat dan aman | Semua laporan tersimpan terpusat dan dapat diakses kapan saja |

---

## 4. Ruang Lingkup

### 4.1 Dalam Ruang Lingkup (In Scope)

- ✅ Pembuatan laporan trafik jaringan (MRTG) berbasis data Cacti/PRTG
- ✅ Pembuatan laporan ketersediaan layanan (SLA) dengan kalkulasi otomatis
- ✅ Manajemen master data pelanggan
- ✅ Discovery otomatis perangkat dari sistem monitoring (Cacti & PRTG)
- ✅ Alur approval 2-tier (NOC Supervisor → Departemen tujuan)
- ✅ Sistem permintaan laporan oleh departemen non-NOC
- ✅ Penjadwalan laporan bulanan otomatis (Monthly Routine)
- ✅ Notifikasi otomatis via Telegram dan Email (SMTP)
- ✅ Manajemen pengguna dan hak akses (RBAC)
- ✅ Audit trail setiap tindakan pada laporan
- ✅ Unduhan laporan dalam format PDF
- ✅ Ekspor data pelanggan ke format Excel
- ✅ Direktori staf (PIC) per departemen
- ✅ Konfigurasi sistem terpusat oleh Administrator

### 4.2 Di Luar Ruang Lingkup (Out of Scope)

- ❌ Integrasi langsung dengan sistem billing/invoicing pelanggan
- ❌ Pengiriman laporan otomatis ke email eksternal pelanggan
- ❌ Sistem manajemen gangguan (ticketing) — hanya konsumsi data tiket
- ❌ Dashboard monitoring jaringan (bukan pengganti Cacti/PRTG)
- ❌ Aplikasi mobile (native Android/iOS)
- ❌ Pelaporan keuangan dan akuntansi

---

## 5. Pemangku Kepentingan (Stakeholder)

| Peran | Departemen | Kepentingan |
|---|---|---|
| **System Administrator** | Network Operation | Mengelola konfigurasi, pengguna, dan sistem secara keseluruhan |
| **NOC Supervisor** | Network Operation | Menyetujui laporan Tier 1, mengawasi kualitas laporan teknis |
| **NOC Operator / Staff** | Network Operation | Membuat laporan, mengelola data pelanggan, menjalankan discovery |
| **NOC Viewer** | Network Operation | Memantau laporan yang telah disetujui (read-only) |
| **CX Supervisor** | Customer Experience | Menyetujui laporan Tier 2 untuk departemen CX |
| **CX Staff** | Customer Experience | Mengajukan permintaan laporan, mengunduh laporan approved |
| **AE Supervisor** | Account Executive | Menyetujui laporan Tier 2 untuk departemen AE |
| **AE Staff** | Account Executive | Mengajukan permintaan laporan, mengunduh laporan approved |
| **Finance Supervisor** | Finance | Menyetujui laporan Tier 2 untuk departemen Finance |
| **Finance Staff** | Finance | Mengajukan permintaan laporan, mengunduh laporan approved |
| **Manajemen** | Semua | Memastikan laporan pelanggan tersampaikan tepat waktu dan akurat |

---

## 6. Kebutuhan Bisnis (Business Requirements)

### 6.1 BR-01 — Manajemen Master Data Pelanggan

**Prioritas:** Tinggi

**Deskripsi:**
Sistem harus menyediakan direktori terpusat untuk menyimpan dan mengelola data pelanggan yang akan dilaporkan.

**Kebutuhan Detail:**
| ID | Kebutuhan |
|---|---|
| BR-01.1 | Sistem dapat menambah, mengubah, dan menghapus data pelanggan |
| BR-01.2 | Setiap pelanggan memiliki Customer ID, Service ID, nama layanan, dan target SLA |
| BR-01.3 | Data pelanggan dapat diimpor secara massal dari file Excel (.xlsx) |
| BR-01.4 | Data pelanggan dapat diekspor ke format Excel |
| BR-01.5 | Pelanggan dapat dikonfigurasi untuk mendukung monitoring via MRTG (Cacti) atau PRTG |
| BR-01.6 | Pelanggan dapat didaftarkan ke jadwal laporan bulanan otomatis |
| BR-01.7 | Setiap pelanggan dapat ditetapkan PIC dari departemen Sales (AE) dan Customer Experience |

---

### 6.2 BR-02 — Pembuatan Laporan Otomatis

**Prioritas:** Sangat Tinggi

**Deskripsi:**
Sistem harus mampu menghasilkan laporan layanan pelanggan secara otomatis dengan mengambil data langsung dari sistem monitoring.

**Kebutuhan Detail:**
| ID | Kebutuhan |
|---|---|
| BR-02.1 | Sistem mendukung dua jenis laporan: **MRTG** (grafik trafik) dan **SLA** (ketersediaan layanan) |
| BR-02.2 | Data grafik trafik diambil secara otomatis dari sistem monitoring **Cacti (MRTG)** |
| BR-02.3 | Data grafik trafik diambil secara otomatis dari sistem monitoring **PRTG** |
| BR-02.4 | Sistem menghitung nilai SLA secara otomatis berdasarkan data downtime yang diinput |
| BR-02.5 | Laporan dihasilkan dalam format **PDF** dengan template resmi perusahaan |
| BR-02.6 | Setiap laporan mendapatkan **nomor dokumen unik** yang tidak dapat duplikat |
| BR-02.7 | Laporan mencantumkan informasi: nama pelanggan, service ID, periode, grafik trafik, nilai SLA, dan daftar insiden |
| BR-02.8 | Operator dapat menginput tiket gangguan dan kasus downtime pada setiap laporan |
| BR-02.9 | Sistem mendukung mode Draft untuk pratinjau sebelum laporan resmi disimpan |

---

### 6.3 BR-03 — Kalkulasi SLA

**Prioritas:** Sangat Tinggi

**Deskripsi:**
Sistem harus menghitung nilai SLA secara konsisten dan akurat berdasarkan data downtime yang tercatat.

**Kebutuhan Detail:**
| ID | Kebutuhan |
|---|---|
| BR-03.1 | SLA dihitung dari total menit downtime dibandingkan total menit dalam bulan laporan |
| BR-03.2 | Nilai yang dihasilkan: `Online %`, `Downtime %`, `Availability %`, dan `Durasi Downtime` |
| BR-03.3 | Sistem secara otomatis menyesuaikan total menit per bulan (termasuk bulan kabisat) |
| BR-03.4 | Downtime dihitung dari akumulasi field `downtimeMinutes` pada setiap entri Case |
| BR-03.5 | Hasil kalkulasi dapat di-override manual oleh Operator jika diperlukan |

**Formula SLA:**
```
Availability (%) = 100 - ((Total Downtime Menit / Total Menit Bulan) × 100)
```

---

### 6.4 BR-04 — Discovery Perangkat Jaringan

**Prioritas:** Tinggi

**Deskripsi:**
Sistem harus mampu menemukan dan memetakan perangkat serta interface jaringan secara otomatis dari sistem monitoring.

**Kebutuhan Detail:**
| ID | Kebutuhan |
|---|---|
| BR-04.1 | Sistem dapat melakukan discovery perangkat dari **Cacti (MRTG)** secara otomatis |
| BR-04.2 | Sistem dapat melakukan discovery sensor dari **PRTG** secara otomatis |
| BR-04.3 | Hasil discovery mencakup: nama perangkat, IP, nama interface, dan ID grafik/sensor |
| BR-04.4 | Sistem dapat mendeteksi Service ID dan Customer ID dari nama grafik/sensor secara otomatis |
| BR-04.5 | Hasil discovery disimpan lokal untuk pencarian dan pemetaan instan |
| BR-04.6 | Operator dapat memetakan hasil discovery ke data pelanggan yang ada |

---

### 6.5 BR-05 — Alur Persetujuan Laporan (Approval Workflow)

**Prioritas:** Sangat Tinggi

**Deskripsi:**
Setiap laporan yang dibuat harus melewati proses verifikasi dan persetujuan bertingkat sebelum dapat didistribusikan.

**Kebutuhan Detail:**
| ID | Kebutuhan |
|---|---|
| BR-05.1 | Laporan yang dibuat oleh Operator/Staff NOC otomatis masuk ke antrian **Tier 1 (NOC Supervisor)** |
| BR-05.2 | NOC Supervisor dapat menyetujui atau mengembalikan laporan dengan catatan revisi |
| BR-05.3 | Laporan yang disetujui Tier 1 otomatis diteruskan ke antrian **Tier 2 (Supervisor departemen tujuan)** |
| BR-05.4 | Supervisor departemen tujuan (CX/AE/Finance) dapat menyetujui atau mengembalikan laporan |
| BR-05.5 | Laporan yang dikembalikan (revisi) dapat diperbaiki oleh Operator dan disubmit ulang |
| BR-05.6 | Laporan Internal NOC hanya memerlukan 1-Tier (cukup disetujui NOC Supervisor) |
| BR-05.7 | Admin dan NOC Supervisor dapat menyetujui laporan secara langsung (Direct Approve) |
| BR-05.8 | Setiap tindakan approval/revisi dicatat dalam **audit trail** lengkap |

**Status Laporan:**

```
PENDING_NOC_APPROVAL → PENDING_DEPT_APPROVAL → APPROVED
                              ↕
                       REVISION_NEEDED
```

---

### 6.6 BR-06 — Sistem Permintaan Laporan

**Prioritas:** Tinggi

**Deskripsi:**
Departemen non-NOC harus dapat mengajukan permintaan pembuatan laporan kepada tim NOC melalui sistem yang terstruktur.

**Kebutuhan Detail:**
| ID | Kebutuhan |
|---|---|
| BR-06.1 | Staff CX, AE, dan Finance dapat mengajukan permintaan laporan melalui sistem |
| BR-06.2 | Setiap permintaan mendapatkan nomor tiket unik format `REQ-YYYYMM-XXXX` |
| BR-06.3 | Permintaan dapat mencakup tipe laporan: SLA, MRTG, atau keduanya |
| BR-06.4 | Permintaan mendukung multi-periode (lebih dari satu bulan sekaligus) |
| BR-06.5 | Tingkat urgensi permintaan: `NORMAL` atau `URGENT` |
| BR-06.6 | NOC dapat memproses permintaan langsung ke Generator laporan |
| BR-06.7 | Status permintaan dapat dipantau oleh pemohon secara real-time |
| BR-06.8 | Notifikasi otomatis dikirim ke pemohon saat status permintaan berubah |

---

### 6.7 BR-07 — Penjadwalan Laporan Bulanan

**Prioritas:** Tinggi

**Deskripsi:**
Sistem harus mendukung penjadwalan otomatis pembuatan laporan bulanan untuk pelanggan yang terdaftar dalam program routine.

**Kebutuhan Detail:**
| ID | Kebutuhan |
|---|---|
| BR-07.1 | NOC Supervisor dapat menginisiasi jadwal laporan bulanan (kickoff) |
| BR-07.2 | Setiap task jadwal memiliki deadline **24 jam** sejak kickoff |
| BR-07.3 | NOC Operator dapat menandai task sebagai selesai setelah laporan dibuat |
| BR-07.4 | Sistem mencatat task yang terlewat deadline sebagai `BREACHED` |
| BR-07.5 | Task yang gagal otomatis ditandai `FAILED_MANUAL_REQUIRED` untuk penanganan manual |
| BR-07.6 | NOC dapat menambah pelanggan khusus ke jadwal yang sedang berjalan |
| BR-07.7 | Laporan yang dihasilkan dari jadwal terhubung ke task yang sesuai |

---

### 6.8 BR-08 — Notifikasi Otomatis

**Prioritas:** Sedang

**Deskripsi:**
Sistem harus mengirimkan notifikasi otomatis kepada pihak terkait pada setiap peristiwa penting dalam alur kerja laporan.

**Kebutuhan Detail:**
| ID | Kebutuhan |
|---|---|
| BR-08.1 | Notifikasi dikirim ke **Telegram** (grup/topik yang dikonfigurasi) |
| BR-08.2 | Notifikasi dikirim via **Email (SMTP)** ke alamat departemen terkait |
| BR-08.3 | Trigger notifikasi: laporan dibuat, laporan disetujui, laporan direvisi |
| BR-08.4 | Trigger notifikasi: permintaan laporan diterima, permintaan selesai diproses |
| BR-08.5 | Template pesan notifikasi dapat dikustomisasi oleh Admin |
| BR-08.6 | Notifikasi mencantumkan detail pelanggan, nomor dokumen, dan status terkini |

---

### 6.9 BR-09 — Manajemen Pengguna & Hak Akses

**Prioritas:** Tinggi

**Deskripsi:**
Sistem harus memiliki mekanisme pengelolaan pengguna dan pembatasan akses berdasarkan peran dan departemen.

**Kebutuhan Detail:**
| ID | Kebutuhan |
|---|---|
| BR-09.1 | Sistem mendukung 5 role pengguna: Admin, Supervisor, Operator, Staff, Viewer |
| BR-09.2 | Hak akses dibatasi berdasarkan kombinasi **role** dan **departemen** |
| BR-09.3 | Admin dapat membuat, mengaktifkan, dan menonaktifkan akun pengguna |
| BR-09.4 | Password disimpan dengan enkripsi yang aman (tidak disimpan dalam bentuk plain text) |
| BR-09.5 | Sesi login memiliki durasi yang berbeda berdasarkan role |
| BR-09.6 | Pengguna non-NOC hanya dapat mengakses laporan yang relevan dengan departemennya |

---

### 6.10 BR-10 — Penyimpanan & Unduhan Laporan

**Prioritas:** Tinggi

**Deskripsi:**
Semua laporan yang dihasilkan harus tersimpan secara terpusat dan dapat diakses kembali kapan saja.

**Kebutuhan Detail:**
| ID | Kebutuhan |
|---|---|
| BR-10.1 | File PDF laporan disimpan di server secara terpusat |
| BR-10.2 | Laporan yang sudah disetujui dapat diunduh oleh pengguna yang berwenang |
| BR-10.3 | Sistem menyimpan metadata lengkap setiap laporan (pembuat, tanggal, status, periode, dll.) |
| BR-10.4 | Riwayat laporan dapat dicari dan difilter berdasarkan periode, pelanggan, tipe, dan status |
| BR-10.5 | Laporan dapat dihapus oleh pengguna dengan hak akses yang sesuai |

---

## 7. Alur Proses Bisnis

### 7.1 Alur Pembuatan Laporan Reguler

```
[NOC Operator]
    │
    ├─► Pilih pelanggan dari Master Data
    │
    ├─► Ambil grafik dari Cacti/PRTG (otomatis)
    │
    ├─► Input tiket gangguan & case downtime
    │
    ├─► Sistem kalkulasi SLA otomatis
    │
    ├─► Simpan laporan → PDF digenerate
    │
    ▼
[Status: PENDING_NOC_APPROVAL]
    │
[NOC Supervisor] Review
    ├─► Setuju → Status: PENDING_DEPT_APPROVAL
    └─► Tolak  → Status: REVISION_NEEDED → Operator revisi
    │
[Dept. Supervisor (CX/AE/Finance)] Review
    ├─► Setuju → Status: APPROVED
    └─► Tolak  → Status: REVISION_NEEDED → Operator revisi
    │
[Semua pihak terkait]
    └─► Unduh PDF laporan yang telah disetujui
```

### 7.2 Alur Permintaan Laporan (Request)

```
[Staff CX/AE/Finance]
    │
    ├─► Isi form permintaan laporan (nama pelanggan, periode, tipe)
    │
    ├─► Sistem buat tiket REQ-YYYYMM-XXXX
    │
    ├─► Notifikasi dikirim ke NOC via Telegram/Email
    │
    ▼
[NOC Operator]
    │
    ├─► Lihat permintaan masuk
    │
    ├─► Proses laporan di Generator
    │
    └─► Tandai request selesai
    │
[Pemohon]
    └─► Notifikasi & akses unduh laporan
```

### 7.3 Alur Jadwal Laporan Bulanan

```
[Awal Bulan]
    │
[NOC Supervisor]
    ├─► Kickoff jadwal bulan berjalan
    │
[Sistem]
    ├─► Buat task untuk semua pelanggan Routine
    ├─► Set deadline 24 jam
    │
[NOC Operator] (dalam 24 jam)
    ├─► Buat laporan tiap pelanggan → Task → COMPLETED
    └─► Jika lewat deadline → Task → BREACHED
```

---

## 8. Kebutuhan Non-Fungsional

| ID | Kategori | Kebutuhan |
|---|---|---|
| NFR-01 | **Keamanan** | Password di-hash menggunakan algoritma scrypt (salt acak 16-byte) |
| NFR-02 | **Keamanan** | Sesi autentikasi menggunakan token terenkripsi via HTTP-only cookie |
| NFR-03 | **Keamanan** | Semua endpoint API dilindungi oleh pemeriksaan autentikasi dan otorisasi |
| NFR-04 | **Keamanan** | Nomor dokumen laporan dijamin unik dengan mekanisme anti-collision |
| NFR-05 | **Ketersediaan** | Sistem dapat diakses selama jam operasional NOC (24/7) |
| NFR-06 | **Performa** | Halaman utama dimuat dalam waktu ≤ 3 detik pada koneksi LAN internal |
| NFR-07 | **Performa** | Discovery jaringan (Cacti) mampu memproses hingga 60.000+ grafik |
| NFR-08 | **Skalabilitas** | Discovery dilakukan secara paralel (batch 4 request bersamaan) |
| NFR-09 | **Keterpercayaan** | Kalkulasi SLA menggunakan formula yang baku dan konsisten |
| NFR-10 | **Maintainability** | Konfigurasi sistem (URL, kredensial, template) dapat diubah tanpa deployment ulang |
| NFR-11 | **Usability** | Antarmuka menggunakan Bahasa Indonesia (konten) dan responsif di desktop |
| NFR-12 | **Audit** | Setiap tindakan pada laporan tercatat dengan aktor, waktu, dan keterangan |

---

## 9. Aturan Bisnis (Business Rules)

| ID | Aturan Bisnis |
|---|---|
| RB-01 | Hanya pengguna dari departemen **Network Operation** yang dapat membuat laporan |
| RB-02 | Laporan tidak dapat diunduh oleh publik; hanya pengguna yang terautentikasi dan berwenang |
| RB-03 | NOC Operator/Staff **tidak dapat** menyetujui laporan; hak approval hanya untuk Supervisor dan Admin |
| RB-04 | Departemen non-NOC (CX, AE, Finance) **hanya dapat melihat laporan** yang ditujukan atau dimintakan oleh departemen mereka sendiri |
| RB-05 | Nomor dokumen laporan **harus unik** di seluruh sistem; sistem akan auto-generate jika terjadi duplikasi |
| RB-06 | Laporan yang berstatus **REVISION_NEEDED** tidak dapat diunduh sampai disetujui |
| RB-07 | Target SLA default adalah **99,5%**; dapat dikonfigurasi per pelanggan |
| RB-08 | Laporan dengan departemen tujuan **Internal NOC** hanya memerlukan 1 tingkat persetujuan |
| RB-09 | Setiap task jadwal bulanan memiliki batas waktu **24 jam**; task yang melewati batas otomatis BREACHED |
| RB-10 | Discovery perangkat tidak akan menggantikan data master pelanggan; hanya sebagai referensi pemetaan |
| RB-11 | Pengguna yang dinonaktifkan (isActive = false) tidak dapat login meskipun memiliki akun valid |
| RB-12 | Konfig sistem (MRTG URL, PRTG URL, SMTP, Telegram) hanya dapat diubah oleh **Admin** |

---

## 10. Asumsi & Batasan

### 10.1 Asumsi

- Sistem monitoring Cacti (MRTG) dan PRTG sudah berjalan dan dapat diakses dari server GENRE
- Jaringan internal PT. NEXA memungkinkan konektivitas antar server
- Data Service ID dan Customer ID pada nama grafik/sensor mengikuti format standar perusahaan (`XX.XXXX.X`)
- Setiap departemen memiliki minimal 1 Supervisor yang bertanggung jawab melakukan approval
- Server SMTP sudah tersedia dan terkonfigurasi untuk pengiriman email notifikasi
- Tim NOC memiliki pemahaman dasar dalam penggunaan aplikasi berbasis web

### 10.2 Batasan

- Sistem berjalan sebagai aplikasi web **internal** dan tidak dapat diakses dari internet publik
- Database menggunakan **SQLite** — tidak disarankan untuk volume data yang sangat besar (>500.000 record)
- Generasi PDF menggunakan **Puppeteer** yang membutuhkan resource CPU/RAM yang cukup di server
- Sistem ini bukan pengganti sistem monitoring jaringan (Cacti/PRTG)
- Laporan tidak secara otomatis dikirim ke email pelanggan eksternal

---

## 11. Kriteria Keberhasilan

| Kriteria | Target |
|---|---|
| Waktu pembuatan laporan per pelanggan | ≤ 10 menit (dari buka halaman hingga PDF tersimpan) |
| Akurasi kalkulasi SLA | 100% sesuai formula yang ditetapkan |
| Kelengkapan audit trail | 100% tindakan approval dan revisi tercatat |
| Ketepatan waktu laporan rutin bulanan | ≥ 95% task diselesaikan sebelum deadline |
| Adopsi sistem oleh pengguna | 100% laporan pelanggan dibuat melalui GENRE (tidak manual) |
| Uptime sistem | ≥ 99% selama jam operasional |
| Kepuasan pengguna | Feedback positif dari NOC, CX, AE, dan Finance dalam 3 bulan pertama |

---

## 12. Risiko Bisnis

| ID | Risiko | Dampak | Kemungkinan | Mitigasi |
|---|---|---|---|---|
| RK-01 | Server Cacti/PRTG tidak dapat diakses | Laporan trafik tidak dapat dibuat | Sedang | Manual input grafik atau gunakan data terakhir |
| RK-02 | Data nama grafik tidak mengikuti format standar | Discovery tidak dapat mendeteksi Service/Customer ID | Rendah | Pemetaan manual via UI Discovery |
| RK-03 | Keterlambatan proses approval oleh Supervisor | Laporan tidak dapat diunduh tepat waktu | Sedang | Notifikasi reminder otomatis via Telegram |
| RK-04 | Kapasitas database SQLite tidak mencukupi | Performa sistem menurun seiring waktu | Rendah | Migrasi ke PostgreSQL jika volume meningkat |
| RK-05 | Pengguna belum familiar dengan sistem | Resistensi adopsi | Sedang | Training onboarding dan dokumentasi panduan |
| RK-06 | Gagal generate PDF (Puppeteer crash) | Laporan tersimpan di DB tapi file PDF tidak ada | Rendah | Regenerasi PDF tersedia melalui halaman riwayat |

---

## 13. Glosarium

| Istilah | Definisi |
|---|---|
| **GENRE** | Generator of Network Reporting — nama sistem pelaporan ini |
| **MRTG** | Multi Router Traffic Grapher — laporan trafik jaringan berbasis grafik bandwidth |
| **SLA** | Service Level Agreement — perjanjian tingkat layanan yang diukur dari ketersediaan jaringan |
| **Cacti** | Platform monitoring jaringan open-source berbasis MRTG/RRDTool |
| **PRTG** | Paessler Router Traffic Grapher — platform monitoring jaringan komersial |
| **NOC** | Network Operation Center — tim teknis yang bertanggung jawab atas jaringan |
| **CX** | Customer Experience — tim yang menangani pengalaman dan kepuasan pelanggan |
| **AE** | Account Executive — tim yang menangani hubungan dan penjualan ke pelanggan |
| **Approval 2-Tier** | Proses persetujuan dua tahap: NOC Supervisor → Supervisor departemen tujuan |
| **Discovery** | Proses otomatis menemukan dan mendaftarkan perangkat dari sistem monitoring |
| **Service ID** | Identifikasi unik layanan pelanggan dengan format `XX.XXXX.X` |
| **Customer ID** | Identifikasi unik pelanggan dengan format `XX.XXXX.XXXX` |
| **Audit Trail** | Catatan kronologis setiap perubahan dan tindakan yang dilakukan pada laporan |
| **Draft** | Mode pratinjau laporan sebelum disimpan secara resmi ke sistem |
| **Routine** | Pelanggan yang terdaftar untuk pembuatan laporan bulanan terjadwal |
| **PIC** | Person in Charge — penanggung jawab untuk pelanggan tertentu |
| **RBAC** | Role-Based Access Control — sistem kontrol akses berdasarkan peran pengguna |

---

*Dokumen BRD ini disusun berdasarkan analisis codebase GENRE Reporting System pada 18 November 2026.*
*Untuk perubahan kebutuhan, hubungi pemilik dokumen di Departemen Network Operation.*
