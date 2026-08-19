// Quick standalone test — run after filling in .env.local:
//   node scripts/test-email.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL_TO } = process.env;

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFY_EMAIL_TO) {
  console.error("Missing one of SMTP_HOST, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL_TO in .env.local");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT) || 587,
  secure: Number(SMTP_PORT) === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

try {
  const result = await transporter.sendMail({
    from: `"StockPro — Nectar Heaven" <${SMTP_USER}>`,
    to: NOTIFY_EMAIL_TO,
    subject: "Test Email from StockPro",
    text: "If you're reading this, your SMTP setup works!",
  });
  console.log("SENT. Message ID:", result.messageId);
} catch (err) {
  console.error("FAILED:", err.message);
  if (err.responseCode) console.error("SMTP response code:", err.responseCode);
}
