import { prisma } from '@/lib/prisma';

export interface TelegramNotificationOptions {
  text: string;
  parseMode?: 'HTML' | 'MarkdownV2' | 'Markdown';
  threadId?: string | number;
  replyMarkup?: Record<string, unknown>;
  botToken?: string;
  chatId?: string;
  isTest?: boolean;
}

export interface TelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Send a notification to Telegram group or specific forum topic.
 */
export async function sendTelegramNotification(
  opts: TelegramNotificationOptions
): Promise<TelegramResult> {
  try {
    let token = opts.botToken?.trim();
    let chatId = opts.chatId?.trim();
    let threadId = opts.threadId;

    // Load from AppConfig if not passed explicitly
    if (!token || !chatId) {
      const config = await prisma.appConfig.findUnique({
        where: { id: 'default' },
      });

      if (!config) {
        return { success: false, error: 'Konfigurasi aplikasi belum diinisialisasi.' };
      }

      if (!opts.isTest && !config.telegramNotificationsEnabled) {
        return { success: false, error: 'Notifikasi Telegram dinonaktifkan di Pengaturan.' };
      }

      token = token || config.telegramBotToken?.trim();
      chatId = chatId || config.telegramChatId?.trim();
      threadId = threadId !== undefined ? threadId : config.telegramThreadId?.trim();
    }

    if (!token || !chatId) {
      return {
        success: false,
        error: 'Telegram Bot Token atau Chat ID belum dikonfigurasi di Pengaturan.',
      };
    }

    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: opts.text,
      parse_mode: opts.parseMode || 'HTML',
    };

    if (threadId && String(threadId).trim()) {
      const parsedThread = parseInt(String(threadId).trim(), 10);
      if (!isNaN(parsedThread) && parsedThread > 0) {
        payload.message_thread_id = parsedThread;
      }
    }

    if (opts.replyMarkup) {
      payload.reply_markup = opts.replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      const desc = data.description || `HTTP ${res.status}: Gagal mengirim pesan ke Telegram`;
      console.error('[Telegram Notification Error]', desc);
      return { success: false, error: desc };
    }

    return {
      success: true,
      messageId: data.result?.message_id,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Telegram Notification Exception]', msg);
    return { success: false, error: msg };
  }
}

