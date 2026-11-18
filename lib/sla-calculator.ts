export interface TicketItem {
  id?: string;
  noTicket: string;
  date: string;
  startDate?: string; // Format: "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm"
  endDate?: string;   // Format: "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm"
  description: string;
  action: string;
  status: string;
  summary?: string;   // Alias/fallback for backwards compatibility
  start?: string;     // Alias/fallback for backwards compatibility
  stop?: string;      // Alias/fallback for backwards compatibility
  duration?: string | number; // Alias/fallback for backwards compatibility
}

export interface CaseItem {
  id?: string;
  noCase: string;
  date: string;
  startDate?: string; // Format: "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm"
  endDate?: string;   // Format: "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm"
  description: string;
  action: string;
  downtimeMinutes: number;
  summary?: string;   // Alias/fallback for backwards compatibility
  start?: string;     // Alias/fallback for backwards compatibility
  stop?: string;      // Alias/fallback for backwards compatibility
  duration?: string | number; // Alias/fallback for backwards compatibility
}

export interface SlaCalculationResult {
  totalMinutesInMonth: number;
  totalDowntimeMinutes: number;
  downtimePercent: number; // e.g. 0.00
  onlinePercent: number;   // e.g. 100.00
  availabilityPercent: number; // e.g. 100.00
  downtimeDurationStr: string; // e.g. "-" or "2 Jam 30 Menit"
  ticketCount: number;
  caseCount: number;
  isTicketEmpty: boolean;
  isCaseEmpty: boolean;
}

export function getDaysInMonth(year: number, month: number): number {
  // month is 1-indexed (1 = January, 12 = December)
  return new Date(year, month, 0).getDate();
}

export function getTotalMinutesInMonth(year: number, month: number): number {
  const days = getDaysInMonth(year, month);
  return days * 24 * 60;
}

export function formatDowntimeDuration(minutes: number): string {
  if (!minutes || minutes <= 0) {
    return '-';
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours} hrs ${remainingMinutes} mins`;
  } else if (hours > 0) {
    return `${hours} hrs`;
  } else {
    return `${remainingMinutes} mins`;
  }
}

export function calculateSla(
  cases: CaseItem[],
  tickets: TicketItem[],
  year: number,
  month: number
): SlaCalculationResult {
  const totalMinutesInMonth = getTotalMinutesInMonth(year, month);
  
  // Sum downtime from all cases
  const totalDowntimeMinutes = cases.reduce((acc, curr) => {
    const val = Number(curr.downtimeMinutes) || 0;
    return acc + val;
  }, 0);

  const downtimePercentRaw = totalMinutesInMonth > 0 ? (totalDowntimeMinutes / totalMinutesInMonth) * 100 : 0;
  const downtimePercentClamped = Math.min(100, Math.max(0, downtimePercentRaw));
  const downtimePercent = Number(downtimePercentClamped.toFixed(2));
  
  const onlinePercentClamped = Math.max(0, Math.min(100, 100 - downtimePercentClamped));
  const onlinePercent = Number(onlinePercentClamped.toFixed(2));
  
  const availabilityPercent = onlinePercent;
  const downtimeDurationStr = formatDowntimeDuration(totalDowntimeMinutes);

  const ticketCount = tickets.filter(t => t.noTicket && t.noTicket.trim() !== '' && t.noTicket.trim() !== '-').length;
  const caseCount = cases.filter(c => c.noCase && c.noCase.trim() !== '' && c.noCase.trim() !== '-').length;

  return {
    totalMinutesInMonth,
    totalDowntimeMinutes,
    downtimePercent,
    onlinePercent,
    availabilityPercent,
    downtimeDurationStr,
    ticketCount,
    caseCount,
    isTicketEmpty: ticketCount === 0,
    isCaseEmpty: caseCount === 0,
  };
}

/**
 * Calculates minutes elapsed between start and end datetimes.
 * Returns 0 if either datetime is invalid or start > end.
 */
export function calculateMinutesBetween(startStr?: string, endStr?: string): number {
  if (!startStr || !endStr) return 0;
  const cleanStart = startStr.trim().replace(' ', 'T');
  const cleanEnd = endStr.trim().replace(' ', 'T');
  const s = new Date(cleanStart);
  const e = new Date(cleanEnd);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  const diffMs = e.getTime() - s.getTime();
  if (diffMs <= 0) return 0;
  return Math.round(diffMs / 60000);
}

/**
 * Formats start and optional end date/time for Option B (compact 2-line period display).
 */
export function formatPeriodDisplay(item: { date?: string; startDate?: string; endDate?: string; start?: string; stop?: string }): {
  start: string;
  end?: string;
} {
  const startRaw = (item.startDate || item.start) ? (item.startDate || item.start)!.replace('T', ' ') : (item.date || '-');
  const endRaw = (item.endDate || item.stop) ? (item.endDate || item.stop)!.replace('T', ' ') : undefined;
  return {
    start: startRaw,
    end: endRaw && endRaw !== startRaw ? endRaw : undefined,
  };
}
