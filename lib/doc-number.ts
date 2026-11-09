export function generateDocumentNumber(
  seq: number,
  reportType: 'MRTG' | 'SLA',
  month: number,
  year: number,
  prefix: string = 'IMUN.01'
): string {
  const paddedSeq = String(seq).padStart(2, '0');
  const paddedMonth = String(month).padStart(2, '0');
  return `${paddedSeq}/${prefix}/${reportType}/${paddedMonth}/${year}`;
}

export function parseDocumentNumber(docNum: string): {
  seq?: number;
  prefix?: string;
  reportType?: 'MRTG' | 'SLA';
  month?: number;
  year?: number;
} {
  const parts = docNum.split('/');
  if (parts.length >= 5) {
    return {
      seq: parseInt(parts[0], 10) || undefined,
      prefix: parts[1],
      reportType: parts[2] as 'MRTG' | 'SLA',
      month: parseInt(parts[3], 10) || undefined,
      year: parseInt(parts[4], 10) || undefined,
    };
  }
  return {};
}
