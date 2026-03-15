import nodemailer from 'nodemailer';

// Create transporter from env vars
// Supports Gmail, any SMTP provider (SendGrid, Brevo, Mailgun, etc.)
export function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  // SMTP_USER can be omitted if SMTP_FROM is set (they're typically the same Gmail address)
  const user = process.env.SMTP_USER || process.env.SMTP_FROM;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // Email not configured
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export const FROM_ADDRESS = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@crm.local';
