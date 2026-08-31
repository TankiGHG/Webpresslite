import 'server-only';
import { createTransport, type Transporter } from 'nodemailer';
import { getEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const globalForMail = globalThis as unknown as { __webpresslite_mailer?: Transporter };

function getTransport(): Transporter {
  const env = getEnv();
  if (!env.SMTP_HOST) {
    throw new Error('SMTP_HOST is not configured.');
  }

  globalForMail.__webpresslite_mailer ??= createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
  });

  return globalForMail.__webpresslite_mailer;
}

/**
 * Sends a mail via SMTP. Without a configured `SMTP_HOST` the message is
 * written to the log instead — that keeps local development working without a
 * mail server, while production fails fast because the variable is required
 * there by the deployment documentation.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const env = getEnv();

  if (!env.SMTP_HOST) {
    // Local development without a mail server: the message goes to the log so
    // links in it stay reachable. The recipient is redacted by the logger, so
    // the body is printed separately and deliberately.
    logger.warn('SMTP_HOST is not set, logging the mail instead of sending it', {
      subject: message.subject,
    });
    console.info(`[mail] to: ${message.to}\n${message.text}`);
    return;
  }

  try {
    await getTransport().sendMail({
      from: env.SMTP_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    logger.info('Mail sent', { subject: message.subject });
  } catch (error) {
    // A failed mail must be visible in the log: the user only sees that the
    // form succeeded, because whether a mail arrives is not their doing.
    logger.error('Sending a mail failed', { subject: message.subject, error });
    throw error;
  }
}
