/**
 * Utility untuk logika layanan pelanggan dan ekstraksi atribut
 */

/**
 * Ekstraksi jumlah node otomatis berdasarkan Service ID.
 * Mengambil 1 digit atau 2 digit di paling belakang Service ID setelah pemisah '.' atau '-'.
 * Jika tidak ditemukan atau tidak valid, otomatis bernilai default 1.
 *
 * Contoh:
 * - "01.2180.1"    => 1
 * - "01.2180.12"   => 12
 * - "02.5512-2"    => 2
 * - "02.5512-15"   => 15
 * - "01.2180"      => 1 (2180 adalah 4 digit, bukan node)
 * - "01.2180.100"  => 1 (100 adalah 3 digit)
 * - "" / undefined => 1
 */
export function extractNodeFromServiceId(serviceId: string | null | undefined): number {
  if (!serviceId) return 1;
  const trimmed = serviceId.trim();
  // Regex mencari karakter '.' atau '-' diikuti 1 atau 2 digit persis di akhir string
  const match = trimmed.match(/[.-](\d{1,2})$/);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    return !isNaN(parsed) && parsed > 0 ? parsed : 1;
  }
  return 1;
}

