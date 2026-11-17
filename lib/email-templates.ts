import { escapeHtml } from './utils';

/**
 * Clean, corporate, responsive HTML email templates for Customer Reporting System (Nexa)
 * Typography: Strictly font-sans (-apple-system / Inter), tabular-nums for IDs. Zero monospace fonts.
 * Email Client Compatibility: Fully table-based layout, inline styles, zero JSX comment artifacts.
 */

interface RequestEmailProps {
  ticketNumber: string;
  customerName: string;
  serviceId?: string | null;
  reportType: string;
  period: string;
  urgency: 'NORMAL' | 'URGENT';
  requesterName: string;
  requesterDept: string;
  salesPicName?: string | null;
  cePicName?: string | null;
  notes?: string | null;
  appUrl: string;
}

interface ApprovalNeededProps {
  ticketNumber?: string | null;
  customerName: string;
  serviceId?: string | null;
  reportType: string;
  period: string;
  documentNumber: string;
  deptName: string;
  verifiedByNocName?: string | null;
  reviewUrl: string;
}

interface ReportApprovedProps {
  ticketNumber?: string | null;
  customerName: string;
  serviceId?: string | null;
  reportType: string;
  period: string;
  documentNumber: string;
  approvedByName: string;
  approvedDeptName: string;
  downloadUrl: string;
  appUrl: string;
}

interface KickoffDigestProps {
  period: string;
  deptName: string;
  deadlineStr: string;
  customers: Array<{
    customerName: string;
    serviceId?: string | null;
    reportType: string;
  }>;
  scheduleUrl: string;
}

const fontStack = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/**
 * 1. Email: Permintaan Laporan Baru Diterima (Request Queued)
 */
export function renderRequestReceivedHtml(rawP: RequestEmailProps): string {
  const p: RequestEmailProps = {
    ...rawP,
    ticketNumber: escapeHtml(rawP.ticketNumber),
    customerName: escapeHtml(rawP.customerName),
    serviceId: rawP.serviceId ? escapeHtml(rawP.serviceId) : null,
    reportType: escapeHtml(rawP.reportType),
    period: escapeHtml(rawP.period),
    requesterName: escapeHtml(rawP.requesterName),
    requesterDept: escapeHtml(rawP.requesterDept),
    salesPicName: rawP.salesPicName ? escapeHtml(rawP.salesPicName) : null,
    cePicName: rawP.cePicName ? escapeHtml(rawP.cePicName) : null,
    notes: rawP.notes ? escapeHtml(rawP.notes) : null,
    appUrl: escapeHtml(rawP.appUrl),
  };
  const isUrgent = p.urgency === 'URGENT';
  const urgencyLabel = isUrgent ? 'URGENT' : 'NORMAL';
  const urgencyBg = isUrgent ? '#ef4444' : '#10b981';

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 24px 0; font-family: ${fontStack};">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
            <!-- Header Banner -->
            <tr>
              <td style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 26px 32px; color: #ffffff;">
                <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #bae6fd; margin-bottom: 6px;">NEXA &bull; CUSTOMER REPORTING SYSTEM</div>
                <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">Network Report Request Queued</h1>
              </td>
            </tr>

            <!-- Content Body -->
            <tr>
              <td style="padding: 28px 32px;">
                <p style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a; line-height: 1.5;">Hello Team <strong>${p.requesterDept}</strong> &amp; <strong>NOC Helpdesk</strong>,</p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">A new network performance report request has been registered in the Customer Reporting System and placed in the processing queue with the following details:</p>

                <!-- Structured Details Card -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 24px;">
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #64748b; font-weight: 500; width: 140px; border-bottom: 1px solid #f1f5f9;">Ticket No:</td>
                    <td style="padding: 10px 16px; font-size: 14px; font-weight: 700; color: #0284c7; font-variant-numeric: tabular-nums; border-bottom: 1px solid #f1f5f9;">${p.ticketNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">Customer:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${p.customerName}</td>
                  </tr>
                  ${p.serviceId ? `
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">Service ID:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #334155; font-variant-numeric: tabular-nums; border-bottom: 1px solid #f1f5f9;">${p.serviceId}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">Report Type:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #f1f5f9;">${p.reportType} Report</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">Period:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #334155; font-variant-numeric: tabular-nums; border-bottom: 1px solid #f1f5f9;">${p.period}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">Priority:</td>
                    <td style="padding: 10px 16px; border-bottom: 1px solid #f1f5f9;">
                      <span style="background-color: ${urgencyBg}; color: #ffffff; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; display: inline-block; letter-spacing: 0.5px;">
                        ${urgencyLabel}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">Requester:</td>
                    <td style="padding: 10px 16px; font-size: 13px; color: #334155; border-bottom: 1px solid #f1f5f9;">${p.requesterName} <span style="color: #64748b;">(${p.requesterDept})</span></td>
                  </tr>
                  ${p.salesPicName ? `
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">PIC Sales / AE:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #334155; border-bottom: 1px solid #f1f5f9;">${p.salesPicName}</td>
                  </tr>` : ''}
                  ${p.cePicName ? `
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #64748b; font-weight: 500; border-bottom: 1px solid #f1f5f9;">PIC CX / CE:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #334155; border-bottom: 1px solid #f1f5f9;">${p.cePicName}</td>
                  </tr>` : ''}
                  ${p.notes ? `
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #64748b; font-weight: 500; vertical-align: top;">Notes:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-style: italic; color: #475569;">"${p.notes}"</td>
                  </tr>` : ''}
                </table>

                <!-- CTA Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px 0;">
                  <tr>
                    <td align="center">
                      <a href="${p.appUrl}" target="_blank" style="display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #0284c7; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                        Open Request Queue &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; text-align: center;">
                  Helpdesk NOC will verify network telemetry and calculate SLA metrics. You will receive thread updates once the report is ready for supervisor approval.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #475569;">Customer Reporting System &bull; PT Internet Mulia Untuk Negeri (Nexa)</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Automated notification &bull; Helpdesk NOC: <a href="mailto:helpdesk@nexa.net.id" style="color: #64748b; text-decoration: none;">helpdesk@nexa.net.id</a> &bull; 2026</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * 2. Email: Menunggu Persetujuan Supervisor (Approval Required)
 */
export function renderApprovalNeededHtml(rawP: ApprovalNeededProps): string {
  const p: ApprovalNeededProps = {
    ...rawP,
    ticketNumber: rawP.ticketNumber ? escapeHtml(rawP.ticketNumber) : null,
    customerName: escapeHtml(rawP.customerName),
    serviceId: rawP.serviceId ? escapeHtml(rawP.serviceId) : null,
    reportType: escapeHtml(rawP.reportType),
    period: escapeHtml(rawP.period),
    documentNumber: escapeHtml(rawP.documentNumber),
    deptName: escapeHtml(rawP.deptName),
    verifiedByNocName: rawP.verifiedByNocName ? escapeHtml(rawP.verifiedByNocName) : null,
    reviewUrl: escapeHtml(rawP.reviewUrl),
  };
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 24px 0; font-family: ${fontStack};">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
            <!-- Header Banner -->
            <tr>
              <td style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 26px 32px; color: #ffffff;">
                <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #fef3c7; margin-bottom: 6px;">NEXA &bull; DOCUMENT APPROVAL REQUIRED</div>
                <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">Supervisor Approval Required &bull; ${p.deptName}</h1>
              </td>
            </tr>

            <!-- Content Body -->
            <tr>
              <td style="padding: 28px 32px;">
                <p style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a; line-height: 1.5;">Dear <strong>${p.deptName} Supervisor</strong>,</p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                  The network performance report for <strong>${p.customerName}</strong> has passed technical verification by the NOC team${p.verifiedByNocName ? ` (${p.verifiedByNocName})` : ''} and is now awaiting your formal approval before release to the customer:
                </p>

                <!-- Structured Details Card -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; margin-bottom: 24px;">
                  ${p.ticketNumber ? `
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #92400e; font-weight: 500; width: 140px; border-bottom: 1px solid #fef3c7;">Ticket No:</td>
                    <td style="padding: 10px 16px; font-size: 14px; font-weight: 700; color: #0284c7; font-variant-numeric: tabular-nums; border-bottom: 1px solid #fef3c7;">${p.ticketNumber}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #92400e; font-weight: 500; width: 140px; border-bottom: 1px solid #fef3c7;">Document No:</td>
                    <td style="padding: 10px 16px; font-size: 14px; font-weight: 700; color: #b45309; font-variant-numeric: tabular-nums; border-bottom: 1px solid #fef3c7;">${p.documentNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #92400e; font-weight: 500; border-bottom: 1px solid #fef3c7;">Customer:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #fef3c7;">${p.customerName}</td>
                  </tr>
                  ${p.serviceId ? `
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #92400e; font-weight: 500; border-bottom: 1px solid #fef3c7;">Service ID:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #334155; font-variant-numeric: tabular-nums; border-bottom: 1px solid #fef3c7;">${p.serviceId}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #92400e; font-weight: 500; border-bottom: 1px solid #fef3c7;">Report Type:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #fef3c7;">${p.reportType} Report</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #92400e; font-weight: 500; border-bottom: 1px solid #fef3c7;">Period:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #1e293b; font-variant-numeric: tabular-nums; border-bottom: 1px solid #fef3c7;">${p.period}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #92400e; font-weight: 500;">Document Status:</td>
                    <td style="padding: 10px 16px;">
                      <span style="background-color: #f59e0b; color: #ffffff; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; display: inline-block; letter-spacing: 0.5px;">
                        PENDING SUPERVISOR APPROVAL
                      </span>
                    </td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px 0;">
                  <tr>
                    <td align="center">
                      <a href="${p.reviewUrl}" target="_blank" style="display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #d97706; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                        Review &amp; Approve Report &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; text-align: center;">
                  Upon your approval, the official PDF report will be signed and published immediately for customer dispatch.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #475569;">Customer Reporting System &bull; PT Internet Mulia Untuk Negeri (Nexa)</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Automated notification &bull; Helpdesk NOC: <a href="mailto:helpdesk@nexa.net.id" style="color: #64748b; text-decoration: none;">helpdesk@nexa.net.id</a> &bull; 2026</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * 3. Email: Laporan Selesai & Approved (Official Report Published)
 */
export function renderReportApprovedHtml(rawP: ReportApprovedProps): string {
  const p: ReportApprovedProps = {
    ...rawP,
    ticketNumber: rawP.ticketNumber ? escapeHtml(rawP.ticketNumber) : null,
    customerName: escapeHtml(rawP.customerName),
    serviceId: rawP.serviceId ? escapeHtml(rawP.serviceId) : null,
    reportType: escapeHtml(rawP.reportType),
    period: escapeHtml(rawP.period),
    documentNumber: escapeHtml(rawP.documentNumber),
    approvedByName: escapeHtml(rawP.approvedByName),
    approvedDeptName: escapeHtml(rawP.approvedDeptName),
    downloadUrl: escapeHtml(rawP.downloadUrl),
    appUrl: escapeHtml(rawP.appUrl),
  };
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 24px 0; font-family: ${fontStack};">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
            <!-- Header Banner -->
            <tr>
              <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 26px 32px; color: #ffffff;">
                <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #d1fae5; margin-bottom: 6px;">NEXA &bull; OFFICIAL REPORT PUBLISHED</div>
                <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">Official Report Approved &amp; Published</h1>
              </td>
            </tr>

            <!-- Content Body -->
            <tr>
              <td style="padding: 28px 32px;">
                <p style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a; line-height: 1.5;">Hello Team <strong>${p.approvedDeptName}</strong> &amp; <strong>NOC Helpdesk</strong>,</p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                  The official network performance report for <strong>${p.customerName}</strong> has been fully approved by <strong>${p.approvedByName}</strong> and the signed PDF document has been published:
                </p>

                <!-- Structured Details Card -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 24px;">
                  ${p.ticketNumber ? `
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #166534; font-weight: 500; width: 140px; border-bottom: 1px solid #dcfce7;">Ticket No:</td>
                    <td style="padding: 10px 16px; font-size: 14px; font-weight: 700; color: #0284c7; font-variant-numeric: tabular-nums; border-bottom: 1px solid #dcfce7;">${p.ticketNumber}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #166534; font-weight: 500; width: 140px; border-bottom: 1px solid #dcfce7;">Document No:</td>
                    <td style="padding: 10px 16px; font-size: 14px; font-weight: 700; color: #15803d; font-variant-numeric: tabular-nums; border-bottom: 1px solid #dcfce7;">${p.documentNumber}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #166534; font-weight: 500; border-bottom: 1px solid #dcfce7;">Customer:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #1e293b; border-bottom: 1px solid #dcfce7;">${p.customerName}</td>
                  </tr>
                  ${p.serviceId ? `
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #166534; font-weight: 500; border-bottom: 1px solid #dcfce7;">Service ID:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #334155; font-variant-numeric: tabular-nums; border-bottom: 1px solid #dcfce7;">${p.serviceId}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #166534; font-weight: 500; border-bottom: 1px solid #dcfce7;">Report Type:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #1e293b; border-bottom: 1px solid #dcfce7;">${p.reportType} Report</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #166534; font-weight: 500; border-bottom: 1px solid #dcfce7;">Period:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #1e293b; font-variant-numeric: tabular-nums; border-bottom: 1px solid #dcfce7;">${p.period}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #166534; font-weight: 500;">Approved By:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #1e293b;">${p.approvedByName} <span style="color: #475569; font-weight: normal;">(${p.approvedDeptName})</span></td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px 0;">
                  <tr>
                    <td align="center">
                      <a href="${p.downloadUrl}" target="_blank" style="display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 700; color: #ffffff; background-color: #059669; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                        Download Official PDF Report &darr;
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; text-align: center;">
                  The request ticket has been officially closed with status <strong>COMPLETED</strong>. You can review the document history anytime in the Report History menu.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #475569;">Customer Reporting System &bull; PT Internet Mulia Untuk Negeri (Nexa)</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Automated notification &bull; Helpdesk NOC: <a href="mailto:helpdesk@nexa.net.id" style="color: #64748b; text-decoration: none;">helpdesk@nexa.net.id</a> &bull; 2026</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

/**
 * 4. Email: Batch Digest Kickoff 24 Jam untuk Supervisor (Routine Schedule Kickoff)
 */
export function renderKickoffDigestHtml(rawP: KickoffDigestProps): string {
  const p: KickoffDigestProps = {
    ...rawP,
    period: escapeHtml(rawP.period),
    deptName: escapeHtml(rawP.deptName),
    deadlineStr: escapeHtml(rawP.deadlineStr),
    scheduleUrl: escapeHtml(rawP.scheduleUrl),
    customers: rawP.customers.map((c) => ({
      customerName: escapeHtml(c.customerName),
      serviceId: c.serviceId ? escapeHtml(c.serviceId) : null,
      reportType: escapeHtml(c.reportType),
    })),
  };
  const customerRows = p.customers.map((c, i) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 9px 12px; color: #64748b; font-variant-numeric: tabular-nums; font-size: 12px;">${i + 1}</td>
      <td style="padding: 9px 12px; font-weight: 600; color: #1e293b; font-size: 13px;">${c.customerName}</td>
      <td style="padding: 9px 12px; font-variant-numeric: tabular-nums; font-size: 12px; color: #475569;">${c.serviceId || '-'}</td>
      <td style="padding: 9px 12px;"><span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">${c.reportType}</span></td>
    </tr>
  `).join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 24px 0; font-family: ${fontStack};">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 640px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
            <!-- Header Banner -->
            <tr>
              <td style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 26px 32px; color: #ffffff;">
                <div style="font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #c7d2fe; margin-bottom: 6px;">NEXA &bull; 24-HOUR SLA ROUTINE SCHEDULE</div>
                <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; line-height: 1.3;">Monthly Routine Kickoff &bull; ${p.deptName} Team</h1>
              </td>
            </tr>

            <!-- Content Body -->
            <tr>
              <td style="padding: 28px 32px;">
                <p style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a; line-height: 1.5;">Dear <strong>Supervisor &amp; Team ${p.deptName}</strong>,</p>
                <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
                  The monthly routine reporting cycle for period <strong>${p.period}</strong> has been initiated by the NOC Helpdesk under the <strong>24-Hour SLA</strong> turnaround commitment:
                </p>

                <!-- Metrics Summary Box -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #eef2ff; border: 1px solid #e0e7ff; border-radius: 8px; margin-bottom: 20px;">
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #4338ca; font-weight: 500; width: 170px; border-bottom: 1px solid #e0e7ff;">Total Routine Customers:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #312e81; font-variant-numeric: tabular-nums; border-bottom: 1px solid #e0e7ff;">${p.customers.length} Customers</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 16px; font-size: 13px; color: #4338ca; font-weight: 500;">Target SLA Deadline:</td>
                    <td style="padding: 10px 16px; font-size: 13px; font-weight: 700; color: #b91c1c; font-variant-numeric: tabular-nums;">${p.deadlineStr} WIB (Strict 24-Hour SLA)</td>
                  </tr>
                </table>

                <h3 style="font-size: 14px; margin: 20px 0 10px 0; color: #334155; font-weight: 600;">Customer Roster (${p.deptName}):</h3>
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-height: 320px; overflow-y: auto;">
                  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; text-align: left;">
                    <thead style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 12px;">
                      <tr>
                        <th style="padding: 9px 12px; width: 30px;">#</th>
                        <th style="padding: 9px 12px;">Customer</th>
                        <th style="padding: 9px 12px;">Service ID</th>
                        <th style="padding: 9px 12px;">Report Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${customerRows}
                    </tbody>
                  </table>
                </div>

                <!-- CTA Button -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px 0;">
                  <tr>
                    <td align="center">
                      <a href="${p.scheduleUrl}" target="_blank" style="display: inline-block; padding: 12px 32px; font-size: 14px; font-weight: 600; color: #ffffff; background-color: #4f46e5; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                        Monitor Progress in Routine Schedule &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
                <p style="margin: 0; font-size: 12px; font-weight: 600; color: #475569;">Customer Reporting System &bull; PT Internet Mulia Untuk Negeri (Nexa)</p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #94a3b8;">Automated notification &bull; Helpdesk NOC: <a href="mailto:helpdesk@nexa.net.id" style="color: #64748b; text-decoration: none;">helpdesk@nexa.net.id</a> &bull; 2026</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}
