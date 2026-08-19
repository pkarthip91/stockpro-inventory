import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  NOTIFY_EMAIL_TO, // e.g. "pkarthip25@gmail.com"
} = process.env;

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Sends an email notification. Silently no-ops (with a console log) if SMTP
 * isn't configured, or if the send fails — a notification failure should
 * never break stock/product creation.
 */
export async function sendEmailNotification(subject, message) {
  if (!transporter || !NOTIFY_EMAIL_TO) {
    console.log("[Email] Not configured — skipping message:", subject);
    return { sent: false, reason: "not_configured" };
  }

  try {
    const result = await transporter.sendMail({
      from: `"StockPro — Nectar Heaven" <${SMTP_USER}>`,
      to: NOTIFY_EMAIL_TO,
      subject,
      text: message,
    });
    return { sent: true, id: result.messageId };
  } catch (err) {
    console.error("[Email] Failed to send:", err.message);
    return { sent: false, reason: err.message };
  }
}
