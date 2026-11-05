// Sends email for the Netlify functions.
// Uses SMTP (e.g. Gmail with an app password) when SMTP_* is set, otherwise Resend, otherwise nothing.
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export type Mail = { to: string; subject: string; html: string };
export type Send = (m: Mail) => Promise<boolean>;

export function getMailer(): Send | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, RESEND_API_KEY, INVITE_FROM } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const port = Number(SMTP_PORT || 465);
    const transport = nodemailer.createTransport({
      host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS.replace(/\s+/g, '') },
    });
    const from = SMTP_FROM || SMTP_USER;
    return async (m) => {
      try { await transport.sendMail({ from, ...m }); return true; }
      catch (e) { console.error('[mail] SMTP send failed:', (e as Error).message); return false; }
    };
  }

  if (RESEND_API_KEY && INVITE_FROM) {
    const resend = new Resend(RESEND_API_KEY);
    return async (m) => {
      const { error } = await resend.emails.send({ from: INVITE_FROM, ...m });
      if (error) console.error('[mail] Resend send failed:', error.message);
      return !error;
    };
  }

  return null;
}
