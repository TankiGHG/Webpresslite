import type { MailMessage } from './mailer';

function layout(heading: string, body: string, action?: { label: string; url: string }): string {
  const button = action
    ? `<p style="margin:24px 0"><a href="${action.url}" style="background:#111;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">${action.label}</a></p>
       <p style="color:#666;font-size:13px">Falls der Button nicht funktioniert:<br><a href="${action.url}">${action.url}</a></p>`
    : '';

  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:20px;margin:0 0 12px">${heading}</h1>
  <p style="line-height:1.6">${body}</p>
  ${button}
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
  <p style="color:#888;font-size:12px">webpresslite</p>
</div>`;
}

export function passwordResetMail(to: string, url: string): MailMessage {
  return {
    to,
    subject: 'Passwort zurücksetzen',
    text:
      `Du hast angefordert, dein Passwort zurückzusetzen.\n\n` +
      `Öffne diesen Link, um ein neues Passwort zu vergeben:\n${url}\n\n` +
      `Der Link ist eine Stunde gültig. Wenn du das nicht warst, ignoriere diese Mail.`,
    html: layout(
      'Passwort zurücksetzen',
      'Du hast angefordert, dein Passwort zurückzusetzen. Der Link ist eine Stunde gültig. Wenn du das nicht warst, kannst du diese Mail ignorieren.',
      { label: 'Neues Passwort vergeben', url },
    ),
  };
}

export function emailVerificationMail(to: string, url: string): MailMessage {
  return {
    to,
    subject: 'E-Mail-Adresse bestätigen',
    text: `Bitte bestätige deine E-Mail-Adresse:\n${url}`,
    html: layout('E-Mail-Adresse bestätigen', 'Bitte bestätige deine E-Mail-Adresse.', {
      label: 'Adresse bestätigen',
      url,
    }),
  };
}
