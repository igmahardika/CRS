/**
 * Clean, corporate, responsive HTML email templates for Customer Reporting System (Nexa)
 * Typography: Strictly font-sans (-apple-system / Inter), tabular-nums for IDs. Zero monospace fonts.
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

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  color: #1e293b;
  line-height: 1.6;
`;

/**
 * 1. Email Konfirmasi Permintaan Laporan Baru Diterima
 */
export function renderRequestReceivedHtml(p: RequestEmailProps): string {
  const isUrgent = p.urgency === 'URGENT';
  const urgencyLabel = isUrgent ? 'URGENT' : 'NORMAL';
  const urgencyBg = isUrgent ? '#ef4444' : '#10b981';

  return `
    <div style="${baseStyles} max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
      {/* Header Banner */}
      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px 32px; color: #ffffff;">
        <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #bae6fd;">NEXA &bull; CUSTOMER REPORTING SYSTEM</p>
        <h1 style="margin: 8px 0 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Network Report Request Queued</h1>
      </div>

      <div style="padding: 32px;">
        <p style="margin-top: 0; font-size: 15px; color: #0f172a;">Hello Team <strong>${p.requesterDept}</strong> &amp; <strong>NOC Helpdesk</strong>,</p>
        <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">A new network performance report request has been registered in the Customer Reporting System and placed in the processing queue with the following details:</p>

        {/* Structured Details Card */}
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 7px 0; color: #64748b; width: 140px; font-size: 13px;">Ticket No:</td>
              <td style="padding: 7px 0; font-weight: 700; color: #0284c7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-variant-numeric: tabular-nums; font-size: 15px;">${p.ticketNumber}</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-size: 13px;">Customer:</td>
              <td style="padding: 7px 0; font-weight: 700; color: #0f172a;">${p.customerName}</td>
            </tr>
            ${p.serviceId ? `
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-size: 13px;">Service ID:</td>
              <td style="padding: 7px 0; color: #334155; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-variant-numeric: tabular-nums; font-weight: 600;">${p.serviceId}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-size: 13px;">Report Type:</td>
              <td style="padding: 7px 0; font-weight: 600; color: #0f172a;">${p.reportType} Report</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-size: 13px;">Period:</td>
              <td style="padding: 7px 0; font-weight: 600; color: #334155; font-variant-numeric: tabular-nums;">${p.period}</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-size: 13px;">Priority:</td>
              <td style="padding: 7px 0;">
                <span style="background: ${urgencyBg}; color: #ffffff; padding: 2px 9px; border-radius: 9999px; font-size: 11px; font-weight: 700; display: inline-block; letter-spacing: 0.5px;">
                  ${urgencyLabel}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-size: 13px;">Requester:</td>
              <td style="padding: 7px 0; color: #334155;">${p.requesterName} <span style="color: #64748b;">(${p.requesterDept})</span></td>
            </tr>
            ${p.salesPicName ? `
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-size: 13px;">PIC Sales / AE:</td>
              <td style="padding: 7px 0; font-weight: 600; color: #334155;">${p.salesPicName}</td>
            </tr>` : ''}
            ${p.cePicName ? `
            <tr>
              <td style="padding: 7px 0; color: #64748b; font-size: 13px;">PIC CX / CE:</td>
              <td style="padding: 7px 0; font-weight: 600; color: #334155;">${p.cePicName}</td>
            </tr>` : ''}
            ${p.notes ? `
            <tr>
              <td style="padding: 7px 0; color: #64748b; vertical-align: top; font-size: 13px;">Notes:</td>
              <td style="padding: 7px 0; font-style: italic; color: #475569;">"${p.notes}"</td>
            </tr>` : ''}
          </table>
        </div>

        {/* CTA Button */}
        <div style="text-align: center; margin: 28px 0;">
          <a href="${p.appUrl}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);">
            Open Request Queue &rarr;
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 0; line-height: 1.5;">
          Helpdesk NOC will verify network telemetry and calculate SLA metrics. You will receive thread updates once the report is ready for supervisor approval.
        </p>
      </div>

      {/* Footer */}
      <div style="background: #f1f5f9; padding: 16px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
        <p style="margin: 0; font-weight: 500;">Customer Reporting System &bull; PT Internet Mulia Untuk Negeri (Nexa)</p>
        <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">Automated system notification &bull; Helpdesk NOC: helpdesk@nexa.net.id</p>
      </div>
    </div>
  `;
}

/**
 * 2. Email Action Required: Menunggu Persetujuan Supervisor
 */
export function renderApprovalNeededHtml(p: ApprovalNeededProps): string {
  return `
    <div style="${baseStyles} max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
      {/* Header Banner */}
      <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 24px 32px; color: #ffffff;">
        <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #fef3c7;">NEXA &bull; DOCUMENT APPROVAL REQUIRED</p>
        <h1 style="margin: 8px 0 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Supervisor Approval Required &bull; ${p.deptName}</h1>
      </div>

      <div style="padding: 32px;">
        <p style="margin-top: 0; font-size: 15px; color: #0f172a;">Dear <strong>${p.deptName} Supervisor</strong>,</p>
        <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
          The network performance report for <strong>${p.customerName}</strong> has passed technical verification by the NOC team${p.verifiedByNocName ? ` (${p.verifiedByNocName})` : ''} and is now awaiting your formal approval before release to the customer:
        </p>

        {/* Structured Details Card */}
        <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            ${p.ticketNumber ? `
            <tr>
              <td style="padding: 7px 0; color: #92400e; width: 140px; font-size: 13px;">Ticket No:</td>
              <td style="padding: 7px 0; font-weight: 700; color: #0284c7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-variant-numeric: tabular-nums;">${p.ticketNumber}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 7px 0; color: #92400e; width: 140px; font-size: 13px;">Document No:</td>
              <td style="padding: 7px 0; font-weight: 700; color: #b45309; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-variant-numeric: tabular-nums;">${p.documentNumber}</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #92400e; font-size: 13px;">Customer:</td>
              <td style="padding: 7px 0; font-weight: 700; color: #1e293b;">${p.customerName}</td>
            </tr>
            ${p.serviceId ? `
            <tr>
              <td style="padding: 7px 0; color: #92400e; font-size: 13px;">Service ID:</td>
              <td style="padding: 7px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-variant-numeric: tabular-nums; font-weight: 600; color: #334155;">${p.serviceId}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 7px 0; color: #92400e; font-size: 13px;">Report Type:</td>
              <td style="padding: 7px 0; font-weight: 600; color: #1e293b;">${p.reportType} Report</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #92400e; font-size: 13px;">Period:</td>
              <td style="padding: 7px 0; font-weight: 600; color: #1e293b; font-variant-numeric: tabular-nums;">${p.period}</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #92400e; font-size: 13px;">Document Status:</td>
              <td style="padding: 7px 0;">
                <span style="background: #f59e0b; color: #ffffff; padding: 2px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; display: inline-block; letter-spacing: 0.5px;">
                  PENDING SUPERVISOR APPROVAL
                </span>
              </td>
            </tr>
          </table>
        </div>

        {/* CTA Button */}
        <div style="text-align: center; margin: 28px 0;">
          <a href="${p.reviewUrl}" style="background: #d97706; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);">
            Review &amp; Approve Report &rarr;
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 0; line-height: 1.5;">
          Upon your approval, the official PDF report will be signed and published immediately for customer dispatch.
        </p>
      </div>

      {/* Footer */}
      <div style="background: #f1f5f9; padding: 16px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
        <p style="margin: 0; font-weight: 500;">Customer Reporting System &bull; PT Internet Mulia Untuk Negeri (Nexa)</p>
        <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">Automated system notification &bull; Helpdesk NOC: helpdesk@nexa.net.id</p>
      </div>
    </div>
  `;
}

/**
 * 3. Email Laporan Selesai & Approved
 */
export function renderReportApprovedHtml(p: ReportApprovedProps): string {
  return `
    <div style="${baseStyles} max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
      {/* Header Banner */}
      <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 24px 32px; color: #ffffff;">
        <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #d1fae5;">NEXA &bull; OFFICIAL REPORT PUBLISHED</p>
        <h1 style="margin: 8px 0 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Official Report Approved &amp; Published</h1>
      </div>

      <div style="padding: 32px;">
        <p style="margin-top: 0; font-size: 15px; color: #0f172a;">Hello Team <strong>${p.approvedDeptName}</strong> &amp; <strong>NOC Helpdesk</strong>,</p>
        <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
          The official network performance report for <strong>${p.customerName}</strong> has been fully approved by ${p.approvedByName} and the signed PDF document has been published:
        </p>

        {/* Structured Details Card */}
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            ${p.ticketNumber ? `
            <tr>
              <td style="padding: 7px 0; color: #166534; width: 140px; font-size: 13px;">Ticket No:</td>
              <td style="padding: 7px 0; font-weight: 700; color: #0284c7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-variant-numeric: tabular-nums;">${p.ticketNumber}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 7px 0; color: #166534; width: 140px; font-size: 13px;">Document No:</td>
              <td style="padding: 7px 0; font-weight: 700; color: #15803d; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-variant-numeric: tabular-nums; font-size: 15px;">${p.documentNumber}</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #166534; font-size: 13px;">Customer:</td>
              <td style="padding: 7px 0; font-weight: 700; color: #1e293b;">${p.customerName}</td>
            </tr>
            ${p.serviceId ? `
            <tr>
              <td style="padding: 7px 0; color: #166534; font-size: 13px;">Service ID:</td>
              <td style="padding: 7px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-variant-numeric: tabular-nums; font-weight: 600; color: #334155;">${p.serviceId}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 7px 0; color: #166534; font-size: 13px;">Report Type:</td>
              <td style="padding: 7px 0; font-weight: 600; color: #1e293b;">${p.reportType} Report</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #166534; font-size: 13px;">Period:</td>
              <td style="padding: 7px 0; font-weight: 600; color: #1e293b; font-variant-numeric: tabular-nums;">${p.period}</td>
            </tr>
            <tr>
              <td style="padding: 7px 0; color: #166534; font-size: 13px;">Approved By:</td>
              <td style="padding: 7px 0; font-weight: 600; color: #1e293b;">${p.approvedByName} <span style="color: #475569;">(${p.approvedDeptName})</span></td>
            </tr>
          </table>
        </div>

        {/* CTA Button */}
        <div style="text-align: center; margin: 28px 0;">
          <a href="${p.downloadUrl}" style="background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            &darr; Download Official PDF Report
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 0; line-height: 1.5;">
          The request ticket has been officially closed with status <strong>COMPLETED</strong>. You can review the document history anytime in the Report History menu.
        </p>
      </div>

      {/* Footer */}
      <div style="background: #f1f5f9; padding: 16px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
        <p style="margin: 0; font-weight: 500;">Customer Reporting System &bull; PT Internet Mulia Untuk Negeri (Nexa)</p>
        <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">Automated system notification &bull; Helpdesk NOC: helpdesk@nexa.net.id</p>
      </div>
    </div>
  `;
}

/**
 * 4. Email Batch Digest Kickoff 24 Jam untuk Supervisor
 */
export function renderKickoffDigestHtml(p: KickoffDigestProps): string {
  const customerRows = p.customers.map((c, i) => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 8px 12px; color: #64748b; font-variant-numeric: tabular-nums;">${i + 1}</td>
      <td style="padding: 8px 12px; font-weight: 600; color: #1e293b;">${c.customerName}</td>
      <td style="padding: 8px 12px; font-variant-numeric: tabular-nums; font-size: 12px; color: #475569;">${c.serviceId || '-'}</td>
      <td style="padding: 8px 12px;"><span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">${c.reportType}</span></td>
    </tr>
  `).join('');

  return `
    <div style="${baseStyles} max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
      {/* Header Banner */}
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 24px 32px; color: #ffffff;">
        <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; color: #c7d2fe;">NEXA &bull; 24-HOUR SLA ROUTINE SCHEDULE</p>
        <h1 style="margin: 8px 0 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Monthly Routine Kickoff &bull; ${p.deptName} Team</h1>
      </div>

      <div style="padding: 32px;">
        <p style="margin-top: 0; font-size: 15px; color: #0f172a;">Dear <strong>Supervisor &amp; Team ${p.deptName}</strong>,</p>
        <p style="font-size: 14px; color: #475569; margin-bottom: 20px;">
          The monthly routine reporting cycle for period <strong>${p.period}</strong> has been initiated by the NOC Helpdesk under the <strong>24-Hour SLA</strong> turnaround commitment:
        </p>

        {/* Metrics Summary Box */}
        <div style="background: #eef2ff; border: 1px solid #e0e7ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 5px 0; color: #4338ca; width: 170px; font-size: 13px;">Total Routine Customers:</td>
              <td style="padding: 5px 0; font-weight: 700; color: #312e81; font-variant-numeric: tabular-nums;">${p.customers.length} Customers</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #4338ca; font-size: 13px;">Target SLA Deadline:</td>
              <td style="padding: 5px 0; font-weight: 700; color: #b91c1c; font-variant-numeric: tabular-nums;">${p.deadlineStr} WIB (Strict 24-Hour SLA)</td>
            </tr>
          </table>
        </div>

        <h3 style="font-size: 14px; margin: 22px 0 10px; color: #334155; font-weight: 600;">Customer Roster (${p.deptName}):</h3>
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-height: 320px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
            <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">
              <tr>
                <th style="padding: 8px 12px; width: 30px;">#</th>
                <th style="padding: 8px 12px;">Customer</th>
                <th style="padding: 8px 12px;">Service ID</th>
                <th style="padding: 8px 12px;">Report Type</th>
              </tr>
            </thead>
            <tbody>
              ${customerRows}
            </tbody>
          </table>
        </div>

        {/* CTA Button */}
        <div style="text-align: center; margin: 28px 0;">
          <a href="${p.scheduleUrl}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);">
            Monitor Progress in Routine Schedule &rarr;
          </a>
        </div>
      </div>

      {/* Footer */}
      <div style="background: #f1f5f9; padding: 16px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
        <p style="margin: 0; font-weight: 500;">Customer Reporting System &bull; PT Internet Mulia Untuk Negeri (Nexa)</p>
        <p style="margin: 4px 0 0; font-size: 11px; color: #94a3b8;">Automated system notification &bull; Helpdesk NOC: helpdesk@nexa.net.id</p>
      </div>
    </div>
  `;
}
