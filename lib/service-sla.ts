/**
 * Aturan Target SLA berdasarkan Nama Layanan (Service Name)
 * Sesuai matriks SLA resmi NEXA:
 * - 99.5%: Dedicated Enterprise, Dedicated IIX, IP Transit, Local Loop, MAXi Dedicated, Metro / Metronet, Prime, VPN
 * - 98.0%: Dedicated Lite, Pro
 * - 95.0%: Broadband Bisnis, GForce, Impressive, MAXi Easy
 * - Tanpa SLA (0%): Basic, Colocation, Lite, Nexa Stream, Premium, Rapid Stream, Smart, Ultimate,
 *                   Ultimate Stream, Ultra Stream, Zigy Karyawan, ZIGY LITE, ZIGY SMART, dll.
 */

export interface ServiceSlaMatch {
  targetSla: number;
  label: string;
  hasSla: boolean;
}

export const SLA_RULES: Array<{
  name: string;
  pattern: RegExp;
  targetSla: number;
}> = [
  // 1. Specific multi-word tiers (prioritize specific tiers over broad service categories)
  { name: 'Dedicated Lite', pattern: /\bDEDICATED\s+LITE\b/i, targetSla: 98.0 },
  { name: 'Dedicated Enterprise', pattern: /\bDEDICATED\s+ENTERPRISE\b/i, targetSla: 99.5 },
  { name: 'Dedicated IIX', pattern: /\bDEDICATED\s+IIX\b/i, targetSla: 99.5 },
  { name: 'MAXi Dedicated', pattern: /\bMAXI\s+DEDICATED\b/i, targetSla: 99.5 },
  { name: 'MAXi Easy', pattern: /\bMAXI\s+EASY\b/i, targetSla: 95.0 },
  { name: 'Broadband Bisnis', pattern: /\bBROADBAND\s+BISNIS\b/i, targetSla: 95.0 },
  { name: 'Local Loop', pattern: /\bLOCAL\s+LOOP\b/i, targetSla: 99.5 },

  // 2. 99.5% Service Categories
  { name: 'IP Transit', pattern: /\bIP\s+TRANSIT\b/i, targetSla: 99.5 },
  { name: 'Metro', pattern: /\bMETRONET\b|\bMETRO\b/i, targetSla: 99.5 },
  { name: 'Prime', pattern: /\bPRIME\b/i, targetSla: 99.5 },
  { name: 'VPN', pattern: /\bVPN\b/i, targetSla: 99.5 },

  // 3. 98.0% Single-word Services
  { name: 'Pro', pattern: /\bPRO\b/i, targetSla: 98.0 },

  // 4. 95.0% Single-word Services
  { name: 'GForce', pattern: /\bGFORCE\b/i, targetSla: 95.0 },
  { name: 'Impressive', pattern: /\bIMPRESSIVE\b/i, targetSla: 95.0 },
];

export function getSlaByServiceName(serviceName: string | null | undefined): ServiceSlaMatch {
  if (!serviceName) {
    return { targetSla: 0, label: 'Tanpa SLA', hasSla: false };
  }

  const s = serviceName.trim();
  for (const rule of SLA_RULES) {
    if (rule.pattern.test(s)) {
      return {
        targetSla: rule.targetSla,
        label: rule.name,
        hasSla: true,
      };
    }
  }

  return { targetSla: 0, label: 'Tanpa SLA', hasSla: false };
}

