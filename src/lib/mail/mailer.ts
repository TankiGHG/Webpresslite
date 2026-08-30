import 'server-only';
import { createTransport, type Transporter } from 'nodemailer';
import { getEnv } from '@/lib/env';

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
    console.info(
      `[mail] SMTP_HOST is not set, logging instead of sending.\n` +
        `  to:      ${message.to}\n` +
        `  subject: ${message.subject}\n` +
        `  body:    ${message.text}`,
    );
    return;
  }

  await getTransport().sendMail({
    from: env.SMTP_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
