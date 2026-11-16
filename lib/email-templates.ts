/**
 * Clean, corporate, responsive HTML email templates for NEXA GENRE REPORTING
 */

interface RequestEmailProps {
  ticketNumber: string;
  customerName: string;
  serviceId?: string | null;
  reportType: string;
  period: string;
  urgency: string;
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
 * 1. Email Konfirmasi Permintaan Laporan Baru Diterima (Milestone 1)
 */
export function renderRequestReceivedHtml(p: RequestEmailProps): string {
  const isUrgent = p.urgency === 'URGENT';
  const urgencyLabel = isUrgent ? 'URGENT (Butuh Cepat)' : 'Normal';
  const urgencyBg = isUrgent ? '#ef4444' : '#10b981';

  return `
    <div style="${baseStyles} max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px 32px; color: #ffffff;">
        <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #bae6fd;">NEXA GENRE &bull; Generator & Reporting</p>
        <h1 style="margin: 8px 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">Permintaan Laporan Jaringan Diterima</h1>
      </div>

      <div style="padding: 32px;">
        <p style="margin-top: 0; font-size: 15px;">Halo Rekan Tim <strong>${p.requesterDept}</strong> &amp; <strong>Helpdesk NOC</strong>,</p>
        <p style="font-size: 14px; color: #475569;">Permintaan laporan performa jaringan telah berhasil tercatat dalam antrean sistem GENRE dengan rincian sebagai berikut:</p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 140px;">No. Tiket:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0284c7; font-family: monospace; font-size: 15px;">${p.ticketNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Pelanggan:</td>
              <td style="padding: 6px 0; font-weight: 700;">${p.customerName}</td>
            </tr>
            ${p.serviceId ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Service ID:</td>
              <td style="padding: 6px 0; font-family: monospace;">${p.serviceId}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Tipe Laporan:</td>
              <td style="padding: 6px 0; font-weight: 600;">Laporan ${p.reportType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Periode:</td>
              <td style="padding: 6px 0; font-weight: 600;">${p.period}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Urgensi:</td>
              <td style="padding: 6px 0;">
                <span style="background: ${urgencyBg}; color: #ffffff; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700; display: inline-block;">
                  ${urgencyLabel}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Pemohon:</td>
              <td style="padding: 6px 0;">${p.requesterName} (${p.requesterDept})</td>
            </tr>
            ${p.salesPicName ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">PIC Sales / AE:</td>
              <td style="padding: 6px 0; font-weight: 600;">${p.salesPicName}</td>
            </tr>` : ''}
            ${p.cePicName ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">PIC CX / CE:</td>
              <td style="padding: 6px 0; font-weight: 600;">${p.cePicName}</td>
            </tr>` : ''}
            ${p.notes ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; vertical-align: top;">Catatan:</td>
              <td style="padding: 6px 0; font-style: italic; color: #334155;">"${p.notes}"</td>
            </tr>` : ''}
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${p.appUrl}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
            Buka Antrean di Sistem GENRE &rarr;
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
          Tim Helpdesk NOC akan segera memverifikasi grafik dan kalkulasi SLA. Anda akan menerima pembaruan di rantai email ini begitu laporan siap ditinjau.
        </p>
      </div>

      <div style="background: #f1f5f9; padding: 16px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        <p style="margin: 0;">NEXA GENRE System &bull; Helpdesk NOC: helpdesk@nexa.net.id</p>
      </div>
    </div>
  `;
}

/**
 * 2. Email Action Required: Menunggu Persetujuan SPV Departemen (Milestone 2)
 */
export function renderApprovalNeededHtml(p: ApprovalNeededProps): string {
  return `
    <div style="${baseStyles} max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 24px 32px; color: #ffffff;">
        <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #fef3c7;">NEXA GENRE &bull; PERSETUJUAN DOKUMEN</p>
        <h1 style="margin: 8px 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">Menunggu Persetujuan Supervisor ${p.deptName}</h1>
      </div>

      <div style="padding: 32px;">
        <p style="margin-top: 0; font-size: 15px;">Yth. <strong>Supervisor ${p.deptName}</strong>,</p>
        <p style="font-size: 14px; color: #475569;">
          Laporan performa jaringan berikut telah <strong>lolos verifikasi teknis oleh tim NOC</strong> ${p.verifiedByNocName ? `(${p.verifiedByNocName})` : ''} dan saat ini <strong>membutuhkan persetujuan resmi Anda</strong> sebelum dapat dirilis ke pelanggan:
        </p>

        <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #92400e; width: 140px;">No. Dokumen:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #b45309; font-family: monospace;">${p.documentNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #92400e;">Pelanggan:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #1e293b;">${p.customerName}</td>
            </tr>
            ${p.serviceId ? `
            <tr>
              <td style="padding: 6px 0; color: #92400e;">Service ID:</td>
              <td style="padding: 6px 0; font-family: monospace;">${p.serviceId}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #92400e;">Tipe Laporan:</td>
              <td style="padding: 6px 0; font-weight: 600;">Laporan ${p.reportType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #92400e;">Periode:</td>
              <td style="padding: 6px 0; font-weight: 600;">${p.period}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #92400e;">Status Dokumen:</td>
              <td style="padding: 6px 0;">
                <span style="background: #f59e0b; color: #ffffff; padding: 3px 10px; border-radius: 9999px; font-size: 12px; font-weight: 700;">
                  PENDING APPROVAL DEPT
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${p.reviewUrl}" style="background: #d97706; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
            Tinjau &amp; Setujui Laporan &rarr;
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
          Setelah Anda menyetujui laporan ini di sistem, dokumen PDF resmi akan langsung diterbitkan dan siap diunduh oleh staf untuk dikirimkan kepada pelanggan.
        </p>
      </div>

      <div style="background: #f1f5f9; padding: 16px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        <p style="margin: 0;">NEXA GENRE System &bull; Menjaga Kualitas &amp; Akurasi Layanan Pelanggan</p>
      </div>
    </div>
  `;
}

/**
 * 3. Email Laporan Selesai & Approved (Milestone 3)
 */
export function renderReportApprovedHtml(p: ReportApprovedProps): string {
  return `
    <div style="${baseStyles} max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px 32px; color: #ffffff;">
        <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #d1fae5;">NEXA GENRE &bull; LAPORAN RESMI DISAHKAN</p>
        <h1 style="margin: 8px 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">Laporan Selesai &amp; Siap Diunduh</h1>
      </div>

      <div style="padding: 32px;">
        <p style="margin-top: 0; font-size: 15px;">Halo Rekan Tim <strong>${p.approvedDeptName}</strong> &amp; <strong>Helpdesk</strong>,</p>
        <p style="font-size: 14px; color: #475569;">
          Kabar baik! Laporan performa jaringan resmi untuk <strong>${p.customerName}</strong> telah <strong>disetujui penuh</strong> oleh ${p.approvedByName} dan dokumen resmi telah diterbitkan:
        </p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 6px 0; color: #166534; width: 140px;">No. Dokumen Resmi:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #15803d; font-family: monospace; font-size: 15px;">${p.documentNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #166534;">Pelanggan:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #1e293b;">${p.customerName}</td>
            </tr>
            ${p.serviceId ? `
            <tr>
              <td style="padding: 6px 0; color: #166534;">Service ID:</td>
              <td style="padding: 6px 0; font-family: monospace;">${p.serviceId}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; color: #166534;">Tipe Laporan:</td>
              <td style="padding: 6px 0; font-weight: 600;">Laporan ${p.reportType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #166534;">Periode:</td>
              <td style="padding: 6px 0; font-weight: 600;">${p.period}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #166534;">Disahkan oleh:</td>
              <td style="padding: 6px 0; font-weight: 600;">${p.approvedByName} (${p.approvedDeptName})</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${p.downloadUrl}" style="background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            &darr; Unduh Dokumen PDF Resmi
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
          Tiket permohonan ini telah resmi ditutup dengan status <strong>COMPLETED</strong>. Anda dapat melihat riwayat dokumen kapan saja di menu Riwayat Laporan GENRE.
        </p>
      </div>

      <div style="background: #f1f5f9; padding: 16px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        <p style="margin: 0;">NEXA GENRE System &bull; Dokumen resmi ketersediaan &amp; trafik jaringan</p>
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
      <td style="padding: 8px 12px; color: #64748b;">${i + 1}</td>
      <td style="padding: 8px 12px; font-weight: 600; color: #1e293b;">${c.customerName}</td>
      <td style="padding: 8px 12px; font-family: monospace; font-size: 12px;">${c.serviceId || '-'}</td>
      <td style="padding: 8px 12px;"><span style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">${c.reportType}</span></td>
    </tr>
  `).join('');

  return `
    <div style="${baseStyles} max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 24px 32px; color: #ffffff;">
        <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #c7d2fe;">NEXA GENRE &bull; JADWAL BULANAN SLA 24 JAM</p>
        <h1 style="margin: 8px 0 0; font-size: 20px; font-weight: 700; color: #ffffff;">Kickoff Laporan Rutin Bulanan: Tim ${p.deptName}</h1>
      </div>

      <div style="padding: 32px;">
        <p style="margin-top: 0; font-size: 15px;">Yth. <strong>Supervisor &amp; Tim ${p.deptName}</strong>,</p>
        <p style="font-size: 14px; color: #475569;">
          Proses pembuatan laporan rutin bulanan periode <strong>${p.period}</strong> telah resmi dimulai oleh Helpdesk NOC dengan batas SLA penyelesaian <strong>24 Jam</strong>:
        </p>

        <div style="background: #eef2ff; border: 1px solid #e0e7ff; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #4338ca; width: 160px;">Total Pelanggan Rutin:</td>
              <td style="padding: 4px 0; font-weight: 700; color: #312e81;">${p.customers.length} Pelanggan</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #4338ca;">Batas Waktu (Deadline):</td>
              <td style="padding: 4px 0; font-weight: 700; color: #b91c1c;">${p.deadlineStr} WIB (Tepat 24 Jam)</td>
            </tr>
          </table>
        </div>

        <h3 style="font-size: 14px; margin: 20px 0 10px; color: #334155;">Daftar Pelanggan Departemen ${p.deptName}:</h3>
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; max-height: 320px; overflow-y: auto;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
            <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">
              <tr>
                <th style="padding: 8px 12px; width: 30px;">#</th>
                <th style="padding: 8px 12px;">Pelanggan</th>
                <th style="padding: 8px 12px;">Service ID</th>
                <th style="padding: 8px 12px;">Laporan</th>
              </tr>
            </thead>
            <tbody>
              ${customerRows}
            </tbody>
          </table>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${p.scheduleUrl}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
            Pantau Progress di Dashboard GENRE &rarr;
          </a>
        </div>
      </div>

      <div style="background: #f1f5f9; padding: 16px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        <p style="margin: 0;">NEXA GENRE System &bull; Menjamin Pemenuhan Standar Layanan (SLA 24 Jam)</p>
      </div>
    </div>
  `;
}

