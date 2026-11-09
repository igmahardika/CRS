export interface TicketItem {
  id?: string;
  noTicket: string;
  date: string;
  description: string;
  action: string;
  status: string;
}

export interface CaseItem {
  id?: string;
  noCase: string;
  date: string;
  description: string;
  action: string;
  downtimeMinutes: number;
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
