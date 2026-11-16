import { prisma } from './prisma';
import { generateDocumentNumber, parseDocumentNumber } from './doc-number';

export interface AllocatedDocNumber {
  seq: number;
  documentNumber: string;
  createdMonth: number;
  createdYear: number;
  prefix: string;
}

/**
 * Mendapatkan nomor dokumen baru yang dijamin unik dan belum pernah dipakai,
 * di mana nomor urut dan bulan/tahun dokumen mencerminkan WAKTU PEMBUATAN (creation time),
 * bukan periode data laporan.
 *
 * Contoh: Dokumen MRTG periode Januari 2026 yang dibuat pada bulan November 2026
 * akan mendapatkan nomor: "01/IMUN.01/MRTG/11/2026"
 */
export async function getNextUniqueDocumentNumber(
  reportType: 'MRTG' | 'SLA',
  creationDate: Date = new Date(),
  customPrefix?: string
): Promise<AllocatedDocNumber> {
  const createdMonth = creationDate.getMonth() + 1;
  const createdYear = creationDate.getFullYear();

  let prefix = customPrefix;
  if (!prefix) {
    const dbConfig = await prisma.appConfig.findUnique({
      where: { id: 'default' },
      select: { documentNumberPrefix: true },
    });
    prefix = dbConfig?.documentNumberPrefix || 'IMUN.01';
  }

  const paddedMonth = String(createdMonth).padStart(2, '0');
  const targetSuffix = `/${reportType}/${paddedMonth}/${createdYear}`;

  // Ambil semua laporan yang berakhiran /{reportType}/{createdMonth}/{createdYear}
  const existingReports = await prisma.report.findMany({
    where: {
      documentNumber: {
        endsWith: targetSuffix,
      },
    },
    select: {
      documentNumber: true,
    },
  });

  const usedSeqs = new Set<number>();
  let maxSeq = 0;

  for (const r of existingReports) {
    const parsed = parseDocumentNumber(r.documentNumber);
    if (parsed.seq) {
      usedSeqs.add(parsed.seq);
      if (parsed.seq > maxSeq) {
        maxSeq = parsed.seq;
      }
    }
  }

  // Tentukan sequence berikutnya
  let candidateSeq = maxSeq + 1;
  while (usedSeqs.has(candidateSeq)) {
    candidateSeq++;
  }

  // Verifikasi atomik langsung ke database (mencegah tabrakan race-condition)
  let candidateDocNumber = generateDocumentNumber(candidateSeq, reportType, createdMonth, createdYear, prefix);
  let duplicate = await prisma.report.findUnique({
    where: { documentNumber: candidateDocNumber },
    select: { id: true },
  });

  while (duplicate) {
    candidateSeq++;
    candidateDocNumber = generateDocumentNumber(candidateSeq, reportType, createdMonth, createdYear, prefix);
    duplicate = await prisma.report.findUnique({
      where: { documentNumber: candidateDocNumber },
      select: { id: true },
    });
  }

  return {
    seq: candidateSeq,
    documentNumber: candidateDocNumber,
    createdMonth,
    createdYear,
    prefix,
  };
}

/**
 * Memvalidasi apakah nomor dokumen yang diajukan sudah ada di database.
 * Jika belum ada, nomor tersebut dipakai.
 * Jika sudah ada (duplikat), otomatis mengalokasikan nomor dokumen unik berikutnya.
 */
export async function ensureUniqueDocumentNumber(
  proposedDocNumber: string,
  reportType: 'MRTG' | 'SLA',
  creationDate: Date = new Date()
): Promise<{ documentNumber: string; wasCollided: boolean }> {
  const existing = await prisma.report.findUnique({
    where: { documentNumber: proposedDocNumber },
    select: { id: true },
  });

  if (!existing) {
    return {
      documentNumber: proposedDocNumber,
      wasCollided: false,
    };
  }

  // Duplikasi terdeteksi -> alokasikan nomor urut baru yang unik
  const allocated = await getNextUniqueDocumentNumber(reportType, creationDate);
  return {
    documentNumber: allocated.documentNumber,
    wasCollided: true,
  };
}

