import nodemailer, { type Transporter } from "nodemailer";

/**
 * Sends email through Gmail's SMTP server with your own Gmail account.
 *
 * Setup (once): turn on 2-Step Verification for the Gmail account, then create
 * an App Password at https://myaccount.google.com/apppasswords and put it in
 * GMAIL_APP_PASSWORD. Your normal Gmail password will not work.
 *
 * SMTP_HOST / SMTP_PORT can point this at any other SMTP provider instead.
 */

let transporter: Transporter | null = null;

export function mailConfig() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ""); // Google shows it in groups of 4
  return {
    user,
    pass,
    to: process.env.ENGINEER_EMAIL || user,
    ready: Boolean(user && pass),
  };
}

function getTransporter(): Transporter {
  if (transporter) return transporter;
  const { user, pass } = mailConfig();
  const port = Number(process.env.SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure: port === 465, // 465 = TLS from the start; 587 upgrades with STARTTLS
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

export async function sendMail(msg: { subject: string; html: string; text: string }) {
  const { user, to } = mailConfig();
  return getTransporter().sendMail({
    from: { name: "Jarvis", address: user! },
    to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
}

/** Turn Gmail's error codes into something Jarvis can say. */
export function mailError(e: unknown): string {
  const err = e as { code?: string; responseCode?: number; message?: string };
  if (err.code === "EAUTH" || err.responseCode === 535) {
    // A bad login must not be retried with the same transporter.
    transporter = null;
    return "Gmail rejected the login. GMAIL_APP_PASSWORD must be a Google App Password, not the normal password.";
  }
  if (err.code === "ETIMEDOUT" || err.code === "ECONNECTION" || err.code === "ESOCKET") {
    transporter = null;
    return "Couldn't reach Gmail's mail server.";
  }
  return err.message?.slice(0, 160) ?? "Unknown email error";
}
