import nodemailer, { SendMailOptions } from 'nodemailer';
import { prisma } from '@/lib/prisma';

export interface EmailAttachment {
  filename: string;
  path?: string;
  content?: string | Buffer;
  contentType?: string;
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  subject: string;
  html: string;
  text?: string;
  ticketNumber?: string;
  isFollowUp?: boolean;
  messageId?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: EmailAttachment[];
  isTest?: boolean;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
}

/**
 * Returns the configured distribution list email for a given department.
 */
export async function getDepartmentEmail(department: string): Promise<string> {
  const config = await prisma.appConfig.findUnique({ where: { id: 'default' } });
  const d = (department || '').trim();

  if (d === 'Account Executive' || d === 'Sales') {
    return config?.emailDeptSales?.trim() || 'sls@nexa.net.id';
  }
  if (d === 'Customer Experience' || d === 'CE' || d === 'CX') {
    return config?.emailDeptCe?.trim() || 'cxe@nexa.net.id';
  }
  if (d === 'Finance') {
    return config?.emailDeptFinance?.trim() || 'finc@nexa.net.id';
  }
  return config?.emailDeptHelpdesk?.trim() || 'helpdesk@nexa.net.id';
}

/**
 * Returns Helpdesk / NOC email
 */
export async function getHelpdeskEmail(): Promise<string> {
  const config = await prisma.appConfig.findUnique({ where: { id: 'default' } });
  return config?.emailDeptHelpdesk?.trim() || 'helpdesk@nexa.net.id';
}

/**
 * Replaces {{placeholder}} tokens with runtime values
 */
export function renderEmailTemplate(
  template: string,
  variables: Record<string, string | number | undefined | null>
): string {
  let result = template;
  for (const [key, val] of Object.entries(variables)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, val !== undefined && val !== null ? String(val) : '');
  }
  return result;
}

/**
 * Sends a transactional email with RFC 2822 Conversation Threading support
 */
export async function sendEmail(opts: EmailOptions): Promise<EmailResult> {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      return { success: false, error: 'Konfigurasi aplikasi belum diinisialisasi.' };
    }

    if (!opts.isTest && !config.emailNotificationsEnabled) {
      return { success: false, skipped: true, error: 'Notifikasi Email dinonaktifkan di Pengaturan.' };
    }

    const host = config.smtpHost?.trim();
    const port = config.smtpPort || 587;
    const user = config.smtpUser?.trim();
    const pass = config.smtpPassword || '';
    const secure = Boolean(config.smtpSecure);

    if (!host) {
      return { success: false, error: 'SMTP Host belum dikonfigurasi di Pengaturan.' };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized: false, // Internal telco relays often use self-signed certs
      },
      connectionTimeout: 10000,
    });

    const fromAddress = config.smtpFromEmail?.trim() || 'noreply-reports@nexa.net.id';
    const fromName = config.smtpFromName?.trim() || 'Nexa Customer Reporting System';

    // Threading headers
    let messageId = opts.messageId;
    let inReplyTo = opts.inReplyTo;
    let references = opts.references;
    let subject = opts.subject;

    if (opts.ticketNumber) {
      const cleanTicket = opts.ticketNumber.trim().replace(/[^a-zA-Z0-9_-]/g, '');
      const rootThreadId = `<${cleanTicket}@crs.nexa.net.id>`;

      if (opts.isFollowUp || inReplyTo) {
        inReplyTo = inReplyTo || rootThreadId;
        references = references || rootThreadId;
        if (!subject.toLowerCase().startsWith('re:')) {
          subject = `Re: ${subject}`;
        }
      } else {
        messageId = messageId || rootThreadId;
      }
    }

    const mailOptions: SendMailOptions = {
      from: `"${fromName}" <${fromAddress}>`,
      to: opts.to,
      cc: opts.cc,
      subject,
      html: opts.html,
      text: opts.text || opts.html.replace(/<[^>]*>?/gm, ''),
      headers: {
        ...(messageId ? { 'Message-ID': messageId } : {}),
        ...(inReplyTo ? { 'In-Reply-To': inReplyTo } : {}),
        ...(references ? { References: references } : {}),
        'X-Entity-Ref-ID': opts.ticketNumber || 'crs-report',
      },
      attachments: opts.attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sendEmail Error]', err);
    return {
      success: false,
      error: msg,
    };
  }
}

/**
 * Test SMTP connection & send test email
 */
export async function testSmtpConnection(params: {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
}): Promise<EmailResult> {
  try {
    const transporter = nodemailer.createTransport({
      host: params.host.trim(),
      port: params.port,
      secure: params.secure,
      auth: params.user?.trim() ? { user: params.user.trim(), pass: params.pass || '' } : undefined,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
    });

    // 1. Verify connection
    await transporter.verify();

    // 2. Send test email
    const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const info = await transporter.sendMail({
      from: `"${params.fromName || 'Nexa Customer Reporting System'}" <${params.fromEmail || 'noreply-reports@nexa.net.id'}>`,
      to: params.toEmail,
      subject: `[TEST EMAIL] SMTP Connection Test Successful (${nowStr} WIB)`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0284c7; margin-top: 0;">SMTP Connection Test Successful</h2>
          <p>Hello,</p>
          <p>This automated email was sent by <strong>Customer Reporting System (Nexa)</strong> to verify your SMTP server configuration.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b;">SMTP Host:</td><td style="font-weight: 600;">${params.host}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Port:</td><td style="font-weight: 600;">${params.port} (${params.secure ? 'SSL/TLS' : 'STARTTLS/Plain'})</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">User:</td><td style="font-weight: 600;">${params.user || '(None)'}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Sender:</td><td style="font-weight: 600;">${params.fromName} &lt;${params.fromEmail}&gt;</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Timestamp:</td><td style="font-weight: 600;">${nowStr} WIB</td></tr>
          </table>
          <p style="color: #10b981; font-weight: 600;">The email dispatch system is operational and ready for report notifications.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; margin: 0;">Customer Reporting System &copy; 2026 PT Internet Mulia Untuk Negeri (Nexa)</p>
        </div>
      `,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: msg,
    };
  }
}

