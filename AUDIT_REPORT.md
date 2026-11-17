# LAPORAN AUDIT KEAMANAN, KUALITAS KODE, & KESIAPAN PRODUCTION

**Repository:** Customer Reporting System (`GENRE REPORTING`)  
**Branch:** `audit/cleanup`  
**Waktu Audit:** 2026-11-17  
**Auditor:** Antigravity AI Assistant  

---

## 1. Daftar Temuan Audit (Tahap 1)

Format: `ID | Kategori | Severity | File:baris | Masalah | Saran | Effort`

| ID | Kategori | Severity | File:baris | Masalah | Saran | Effort |
|---|---|---|---|---|---|---|
| `SEC-01` | Secret & Konfigurasi | **Critical** | `lib/token-edge.ts:12`, `lib/token.ts:14` | Hardcoded fallback HMAC secret `'nexa-crs-reporting-secure-key-2026-auth-prod'` jika `AUTH_SECRET` tidak diset di environment. Memungkinkan penyerang menandatangani session token admin palsu. | Wajibkan `AUTH_SECRET` dari environment di mode production; jangan gunakan fallback statis yang terekspos di kode sumber. | Low |
| `SEC-02` | Secret & Konfigurasi | **Critical** | `app/api/schedule/kickoff/route.ts:16` | Hardcoded bypass CRON token `'crs_cron_internal_2026'` dan `'genre_cron_internal_2026'`. Siapa pun yang mengirimkan header ini dapat memicu batch scheduling tanpa otentikasi sesi. | Hapus hardcoded string; hanya terima token dari `process.env.CRON_SECRET`. | Low |
| `SEC-03` | Secret & Konfigurasi | **High** | `lib/auth.ts:288` | Default password `'admin123'` di-hardcode saat inisialisasi default admin (`ensureDefaultAdmin()`). | Gunakan `process.env.DEFAULT_ADMIN_PASSWORD` atau tandai wajib rotasi segera pada dokumen deployment. | Low |
| `SEC-04` | Secret & Konfigurasi | **High** | `app/api/config/route.ts:38` | `GET /api/config` mengembalikan seluruh password (MRTG, PRTG, SMTP, Telegram Bot Token) dalam format plaintext ke client JSON response. | Lakukan data masking (`********`) untuk password dan token sebelum dikirimkan ke client; jangan kembalikan credential plaintext. | Medium |
| `SEC-05` | Keamanan Aplikasi (SSRF) | **High** | `app/api/cacti/graph/route.ts:36`, `app/api/prtg/graph/route.ts:36` | `configOverride.mrtgBaseUrl` & `configOverride.prtgBaseUrl` diterima dari POST request body dan langsung di-request oleh backend server tanpa validasi whitelist domain internal. | Hapus `configOverride.baseUrl` dari request body; server hanya boleh menghubungi URL terdaftar dari `AppConfig` yang diset Admin. | Medium |
| `SEC-06` | Keamanan Aplikasi (XSS/HTML Injection) | **High** | `lib/pdf-template.ts:119-963`, `lib/email-templates.ts:96-135` | Variabel input (`customerName`, `documentNumber`, `notes`, `tickets`, `cases`) diinterpolasi mentah ke dalam template HTML tanpa escaping (`escapeHtml`), berpotensi memicu Server-Side XSS pada Chromium headless dan HTML injection pada email klien. | Buat fungsi `escapeHtml()` dan terapkan secara konsisten pada setiap interpolasi data teks pengguna. | Medium |
| `SEC-07` | Keamanan Aplikasi (Auth / Brute Force) | **Medium** | `app/api/auth/login/route.ts:7-82` | Endpoint login tidak memiliki mekanisme rate limiting atau penundaan saat kredensial salah, rentan terhadap brute force password. | Terapkan rate limiter sederhana berbasis in-memory map untuk membatasi frekuensi percobaan login gagal per IP/username. | Medium |
| `SEC-08` | Keamanan Aplikasi (Headers & Cookies) | **Medium** | `next.config.mjs:1`, `middleware.ts:6`, `lib/auth.ts:88` | Ketiadaan HTTP security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`). Cookie session hanya `secure: true` jika `SECURE_COOKIES === 'true'` (bukan otomatis aktif di production). | Tambahkan response security headers di `next.config.mjs` / `middleware.ts` dan set cookie `secure` default `true` saat `NODE_ENV === 'production'`. | Low |
| `SEC-09` | Keamanan Aplikasi (DoS / OOM) | **Medium** | `app/api/customers/import/route.ts:22` | Tidak ada validasi batas ukuran file (`MAX_FILE_SIZE`) sebelum file Excel di-buffer dan diparsing oleh library XLSX, berisiko kehabisan memori (OOM) atau ReDoS. | Tambahkan pemeriksaan ukuran maksimum berkas (misal: 10MB) sebelum memanggil `file.arrayBuffer()`. | Low |
| `SEC-10` | Keamanan Aplikasi (Mass Delete Guard) | **Medium** | `app/api/customers/route.ts:220` | `DELETE /api/customers` mengizinkan payload `{ all: true }` yang dapat menghapus seluruh isi tabel customer sekaligus tanpa konfirmasi token khusus atau wewenang tingkat ADMIN. | Batasi aksi hapus massal `{ all: true }` hanya untuk role ADMIN dengan proteksi konfirmasi eksplisit. | Low |
| `DEP-01` | Dependency Vulnerability | **High** | `package.json:32` | Paket `xlsx@^0.18.5` terindikasi memiliki kerentanan High (Prototype Pollution GHSA-4r6h-8v6p-xvw6, ReDoS GHSA-5pgg-2g8v-p4x9) berdasarkan `npm audit`. | Kunci penggunaan SheetJS dengan validasi ukuran file dan sanitasi data. | Low |
| `DEP-02` | Unused Dependency | **Low** | `package.json:19` | Dependensi `@radix-ui/react-slot` tercatat pada `dependencies` namun terbukti tidak pernah diimpor pada kode proyek (`depcheck`). | Hapus paket dari `package.json` untuk meringankan bundle dependency. | Low |
| `DIR-01` | Folder & Direktori | **Low** | `page_bg.png` (root), `desain.md` (root), `cookies.txt` (disk) | Terdapat artefak ter-commit yang tidak rapi: `page_bg.png` di root (duplikat dari `public/assets/templates/page_bg.png`), `desain.md` di root, serta `cookies.txt` di direktori lokal. | Hapus file duplikat di root, pastikan `.gitignore` mencakup semua file sesi dan artefak. | Low |
| `CODE-01` | Kualitas Kode (Monolith) | **Medium** | `app/page.tsx:1-2016` | File `app/page.tsx` memiliki 2016 baris kode, melanggar batas rekomendasi maintainability (>2000 baris) dengan mencampur aduk filter drawer, state reporting, dan form generator. | Ekstrak sub-bagian UI dan helper kalkulasi menjadi modul terpisah agar lebih bersih dan mudah dirawat. | High |
| `CODE-02` | Kualitas Kode (Duplikasi) | **Low** | `lib/token-edge.ts` vs `lib/token.ts` | Duplikasi logika verifikasi token dan interface `UserSession` antara runtime Edge dan Node.js (terdeteksi 118 clones oleh `jscpd`). | Gunakan shared interface dan kurangi redundansi struktur data. | Low |
| `CODE-03` | Kualitas Kode (Linting) | **Low** | `next.config.mjs:4`, `package.json:9` | Proyek mengabaikan lint saat build (`ignoreDuringBuilds: true`), dan perintah `npm run lint` belum memiliki konfigurasi flat config sehingga berjalan interaktif. | Siapkan konfigurasi ESLint standar dan aktifkan kembali pemeriksaan lint saat build. | Medium |
| `PROD-01` | Kesiapan Production | **Medium** | `app/api/health/route.ts` (missing) | Tidak tersedia endpoint Health Check (`/api/health`) untuk memeriksa kesiapan aplikasi (liveness/readiness probe untuk monitoring server). | Buat endpoint `/api/health` yang mengembalikan status sistem dan konektivitas Prisma DB. | Low |
| `PROD-02` | Kesiapan Production | **Low** | `app/error.tsx`, `app/global-error.tsx` (missing) | Tidak ada boundary penanganan error global di Next.js App Router, sehingga error render yang tak terduga akan menampilkan crash tak terformat. | Buat halaman `error.tsx` dan `global-error.tsx` dengan UI fallback yang rapi. | Low |
| `PROD-03` | Kesiapan Production | **Medium** | `.env.example` (missing) | Tidak ada file `.env.example` yang mendokumentasikan daftar variabel lingkungan yang dibutuhkan sistem di lingkungan production. | Buat template `.env.example` lengkap dengan instruksi pengisian variabel tanpa membeberkan secret asli. | Low |
| `PROD-04` | Kesiapan Production | **Medium** | `Dockerfile`, `.dockerignore`, `.github/workflows/ci.yml` (missing) | Belum tersedia kontainerisasi Dockerfile multi-stage (non-root) dan pipeline CI untuk automated testing & linting. | Siapkan `Dockerfile` production-ready yang aman dan pipeline CI GitHub Actions. | Medium |
| `PROD-05` | Kesiapan Production | **Low** | `README.md:1-4` | Dokumentasi `README.md` sangat singkat (hanya 4 baris), belum memuat panduan instalasi, panduan konfigurasi, dan runbook operasional. | Perbarui `README.md` dengan dokumentasi lengkap, runbook, dan arsitektur sistem. | Low |

---

## 2. Pemetaan Seluruh Endpoint API & Otorisasi (OWASP Top 10)

| Route | Method | Auth? | Otorisasi (Cek IDOR / Role)? | Validasi Input? | Catatan Keamanan |
|---|---|---|---|---|---|
| `/api/auth/login` | POST | Tidak (Publik) | N/A | Ada (Cek username/password) | Butuh mitigasi rate limiting brute-force |
| `/api/auth/logout` | POST | Tidak (Publik) | N/A | N/A | Menghapus cookie otentikasi |
| `/api/auth/me` | GET | Ya | Ya (Session ID) | N/A | Mengembalikan profil pengguna aktif |
| `/api/cacti/graph` | POST | Ya | Ya (`report:create`) | Sebagian (Cek `graphId`) | Rentan SSRF via `configOverride.mrtgBaseUrl` |
| `/api/prtg/graph` | POST | Ya | Ya (`report:create`) | Sebagian (Cek `sensorId`) | Rentan SSRF via `configOverride.prtgBaseUrl` |
| `/api/config` | GET | Ya | Ya (ADMIN) | N/A | Membocorkan password plaintext dalam respons |
| `/api/config` | POST | Ya | Ya (ADMIN) | Ada | Memperbarui parameter monitoring & SMTP |
| `/api/customers` | GET | Ya | Ya (`customer:read`) | Ada (Search params) | Aman, read-only customer directory |
| `/api/customers` | POST | Ya | Ya (`customer:write`) | Ada (Cek field wajib) | Membuat entri pelanggan baru |
| `/api/customers` | PUT | Ya | Ya (`customer:write`) | Ada (Cek `id`) | Memperbarui profil pelanggan |
| `/api/customers` | PATCH | Ya | Ya (`customer:write`) | Ada (Cek `id`/`serviceId`) | Update parsial mapping graph |
| `/api/customers` | DELETE | Ya | Ya (`customer:write`) | Ada (Cek ID) | Hapus massal `{ all: true }` perlu proteksi admin |
| `/api/customers/export` | GET | Ya | Ya (`customer:export`) | N/A | Ekspor data pelanggan ke Excel |
| `/api/customers/import` | POST | Ya | Ya (`customer:write`) | Parsial (Perlu batas size) | Unggah Excel pelanggan |
| `/api/customers/sync-sla` | POST | Ya | Ya (`customer:write`) | N/A | Sinkronisasi target SLA pelanggan |
| `/api/customers/template` | GET | Ya | Ya (`customer:write`) | N/A | Download template Excel |
| `/api/discovery/sync` | POST | Ya | Ya (`discovery:manage`) | Ada (Cek engine) | Sinkronisasi perangkat dari NMS |
| `/api/discovery/tree` | GET | Ya | Ya (`discovery:view`) | Ada | Mengambil pohon hierarki NMS |
| `/api/discovery/map-customer` | GET, POST | Ya | Ya (`discovery:manage`) | Ada | Mapping sensor/graph ke pelanggan |
| `/api/email/test` | POST | Ya | Ya (ADMIN) | Ada | Uji coba pengiriman email SMTP |
| `/api/generate-pdf` | POST | Ya | Ya (`report:create`) | Ada | Butuh HTML escape pada template |
| `/api/reports` | GET | Ya | Ya (`canUserAccessReport`) | Ada | Terproteksi department-scoping & IDOR check |
| `/api/reports/approve` | POST | Ya | Ya (`report:approve`) | Ada | Terproteksi Four-Eyes Principle |
| `/api/reports/reject` | POST | Ya | Ya (`report:approve`) | Ada (Min 5 karakter notes) | Terproteksi state guard & supervisor check |
| `/api/reports/download` | GET | Ya | Ya (`canUserAccessReport`) | Ada | Terproteksi path traversal & status gate |
| `/api/reports/next-number` | GET | Ya | Ya (`report:create`) | Ada | Alokasi nomor dokumen unik |
| `/api/requests` | GET | Ya | Ya (Department Scoped) | Ada | Antrean tiket request laporan |
| `/api/requests` | POST | Ya | Ya (`request:create`) | Ada | Pengajuan tiket request laporan |
| `/api/requests` | PATCH | Ya | Ya (`request:process`/own) | Ada | Update status tiket antrean |
| `/api/requests/customers` | GET | Ya | Ya (`request:create`) | Ada | Autocomplete pelanggan |
| `/api/schedule` | GET, POST | Ya | Ya (`schedule:view`/`manage`)| Ada | Antrean jadwal bulanan 24H SLA |
| `/api/schedule/kickoff` | POST | Ya / Cron | Parsial (Hardcoded token) | Ada | Bypass token statis harus dihapus |
| `/api/schedule/auto-mrtg` | POST | Ya | Ya (`schedule:manage`) | Ada | Batch scheduler MRTG otomatis |
| `/api/staff` | GET, POST, PUT, DELETE | Ya | Ya (SUPERVISOR / ADMIN) | Ada | Manajemen staf PIC departemen |
| `/api/telegram/test` | POST | Ya | Ya (ADMIN) | Ada | Uji koneksi Telegram Bot API |
| `/api/upload-template` | POST | Ya | Ya (ADMIN) | Ada (Cek magic bytes & size) | Terproteksi whitelist & extension check |
| `/api/users` | GET, POST, PUT, DELETE | Ya | Ya (ADMIN) | Ada | Terproteksi anti self-deactivation |

---

## 3. Ringkasan Temuan per Severity
- **Critical:** 2 (`SEC-01`, `SEC-02`)
- **High:** 5 (`SEC-03`, `SEC-04`, `SEC-05`, `SEC-06`, `DEP-01`)
- **Medium:** 7 (`SEC-07`, `SEC-08`, `SEC-09`, `SEC-10`, `CODE-01`, `PROD-01`, `PROD-03`, `PROD-04`)
- **Low:** 7 (`DEP-02`, `DIR-01`, `CODE-02`, `CODE-03`, `PROD-02`, `PROD-05`, dll)

---

## 4. Daftar "Tidak Bisa Diverifikasi" (Alasan Teknis / Limitasi Tool)
1. **gitleaks / trufflehog**: *TIDAK DIJALANKAN* karena kedua binary tidak terpasang di sistem operasi Windows host (`CommandNotFoundException`). Verifikasi dilakukan menggunakan git history inspection dan regex search pada commit log.
2. **semgrep**: *TIDAK DIJALANKAN* karena binary semgrep tidak terpasang di sistem host. Analisis statis keamanan dilakukan secara manual berbasis pemeriksaan mendalam seluruh route file, middleware, auth guards, dan library.
3. **hadolint / trivy**: *TIDAK DIJALANKAN* karena belum ada berkas Dockerfile awal pada repository dan binary trivy/hadolint tidak tersedia di sistem.

---

## 5. Daftar "Perlu Konfirmasi User"
1. **Folder `extracted_images/`**: Berisi 10 berkas gambar hasil ekstraksi sampel PDF (`MRTG_p1_0_X4.png`, dll) berukuran total ~1.2MB yang ter-commit ke git. *Sesuai Aturan No. 6: Folder ini tidak akan dihapus otomatis sampai ada konfirmasi eksplisit dari pengguna.*
2. **File `cookies.txt` di root**: Berisi cookie autentikasi yang tersimpan di disk lokal. File ini telah masuk `.gitignore`. Akan dibersihkan dari disk kerja lokal setelah konfirmasi atau verifikasi tidak terpakai.
