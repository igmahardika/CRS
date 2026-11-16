import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getNextUniqueDocumentNumber } from '@/lib/doc-number-server';
import { generatePdfBuffer } from '@/lib/pdf-generator';
import { ReportData } from '@/lib/pdf-template';
import { sendTelegramNotification } from '@/lib/telegram';

interface BatchResultItem {
  customerId: string;
  customerName: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED_EXISTING';
  reportId?: string;
  documentNumber?: string;
  error?: string;
}

/**
 * Executes Automated Monthly MRTG Report Generation.
 * Intended to run on Day 1 between 02:00 - 05:00 WIB.
 * Paced sequentially (1.5s delay) to avoid load spikes on monitoring servers.
 */
export async function runMrtgBatchScheduler(
  specifiedMonth?: number,
  specifiedYear?: number
): Promise<{
  success: boolean;
  periodMonth: number;
  periodYear: number;
  totalCustomers: number;
  results: BatchResultItem[];
}> {
  const now = new Date();
  // Reporting month defaults to previous month
  let periodMonth = specifiedMonth || (now.getMonth() === 0 ? 12 : now.getMonth());
  let periodYear = specifiedYear || (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const reportPeriod = `${monthNames[periodMonth - 1]} ${periodYear}`;

  console.log(`[MRTG Auto-Batch] Starting automated run for ${reportPeriod}...`);

  // 1. Fetch all routine customers enrolled for MRTG or BOTH
  const routineCustomers = await prisma.customer.findMany({
    where: {
      isMonthlyRoutine: true,
      routineReportType: { in: ['MRTG', 'BOTH'] },
    },
    orderBy: { customerName: 'asc' },
  });

  const results: BatchResultItem[] = [];

  for (const c of routineCustomers) {
    console.log(`[MRTG Auto-Batch] Processing ${c.customerName} (${c.serviceId})...`);

    // Check if MRTG report already exists for this period
    const existing = await prisma.report.findFirst({
      where: {
        customerId: c.customerId,
        reportType: 'MRTG',
        periodMonth,
        periodYear,
      },
    });

    if (existing) {
      console.log(`[MRTG Auto-Batch] Report already exists for ${c.customerName}. Skipping.`);
      results.push({
        customerId: c.customerId,
        customerName: c.customerName,
        status: 'SKIPPED_EXISTING',
        reportId: existing.id,
        documentNumber: existing.documentNumber,
      });
      continue;
    }

    try {
      // 2. Identify target graph or sensor
      const engine = c.graphType === 'PRTG' ? 'PRTG' : 'MRTG';
      const targetSensorId = engine === 'PRTG' ? (c.prtgSensorId || c.graphId) : (c.cactiGraphId || c.graphId);

      if (!targetSensorId) {
        throw new Error(`Graph/Sensor ID not configured for customer ${c.customerName} (${engine}).`);
      }

      // Generate atomic, collision-free document number based on creation date
      const allocatedDoc = await getNextUniqueDocumentNumber('MRTG');
      const documentNumber = allocatedDoc.documentNumber;

      // 3. Create initial report record with PENDING_NOC_APPROVAL
      const report = await prisma.report.create({
        data: {
          reportType: 'MRTG',
          graphType: engine,
          documentNumber,
          customerName: c.customerName,
          customerId: c.customerId,
          serviceId: c.serviceId,
          serviceName: c.serviceName,
          nodeCount: c.nodeCount || 1,
          targetSla: c.targetSla || 99.5,
          reportPeriod,
          periodMonth,
          periodYear,
          graphId: targetSensorId,
          cactiGraphId: engine === 'MRTG' ? targetSensorId : null,
          prtgSensorId: engine === 'PRTG' ? targetSensorId : null,
          trafficDirection: c.trafficDirection || 'NORMAL',
          status: 'PENDING_NOC_APPROVAL',
          assignedDepartment: c.routineGroup || 'Customer Experience',
          generatedByName: 'Automated MRTG Scheduler',
        },
      });

      // 4. Update corresponding MonthlyScheduleTask if present
      await prisma.monthlyScheduleTask.updateMany({
        where: {
          customerId: c.customerId,
          reportType: 'MRTG',
          periodMonth,
          periodYear,
        },
        data: {
          status: 'COMPLETED',
          completedReportId: report.id,
          executionType: 'AUTO_SCHEDULED',
          processedByName: 'Automated MRTG Scheduler',
          completedAt: new Date(),
        },
      });

      results.push({
        customerId: c.customerId,
        customerName: c.customerName,
        status: 'SUCCESS',
        reportId: report.id,
        documentNumber,
      });

      // Throttling: Pause for 1.5 seconds to prevent server load spikes
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[MRTG Auto-Batch Error] ${c.customerName}:`, msg);

      // Flag corresponding task as failed requiring manual resolution
      await prisma.monthlyScheduleTask.updateMany({
        where: {
          customerId: c.customerId,
          reportType: 'MRTG',
          periodMonth,
          periodYear,
        },
        data: {
          status: 'FAILED_MANUAL_REQUIRED',
          errorMessage: msg,
          executionType: 'AUTO_SCHEDULED',
        },
      });

      results.push({
        customerId: c.customerId,
        customerName: c.customerName,
        status: 'FAILED',
        error: msg,
      });

      // Send failure alert to NOC Telegram topic
      sendTelegramNotification({
        text:
          `⚠️ <b>AUTO-MRTG FAILED FOR CUSTOMER</b>\n\n` +
          `• <b>Customer:</b> ${c.customerName}\n` +
          `• <b>Service ID:</b> <code>${c.serviceId}</code>\n` +
          `• <b>Period:</b> ${reportPeriod}\n` +
          `• <b>Error:</b> <i>${msg}</i>\n\n` +
          `<i>Sistem tidak melakukan failover lintas mesin. Dokumen ditandai untuk diproses manual oleh tim NOC di Generator.</i>`,
      }).catch(() => {});
    }
  }

  const successCount = results.filter((r) => r.status === 'SUCCESS').length;
  const failedCount = results.filter((r) => r.status === 'FAILED').length;

  console.log(`[MRTG Auto-Batch Finished] Success: ${successCount}, Failed: ${failedCount}, Skipped: ${results.filter((r) => r.status === 'SKIPPED_EXISTING').length}`);

  // Send summary Telegram alert
  sendTelegramNotification({
    text:
      `📊 <b>MONTHLY AUTO-MRTG BATCH COMPLETED</b>\n\n` +
      `• <b>Period:</b> ${reportPeriod}\n` +
      `• <b>Total Routine Customers:</b> ${routineCustomers.length}\n` +
      `• <b>Successfully Generated:</b> ${successCount}\n` +
      `• <b>Failed / Needs Manual:</b> ${failedCount}\n\n` +
      `<i>Laporan yang berhasil digenerate otomatis telah masuk ke antrean Approval Supervisor NOC (/approvals).</i>`,
  }).catch(() => {});

  return {
    success: true,
    periodMonth,
    periodYear,
    totalCustomers: routineCustomers.length,
    results,
  };
}
