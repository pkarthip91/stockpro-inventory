// WhatsApp notifications — supports three providers, tried in this order:
//   1. Green API   (instant setup — scan a QR code, no waiting on anyone)
//   2. CallMeBot    (free, but the community bot can take minutes-to-hours to reply)
//   3. Twilio       (paid/sandbox, most "official" option if you outgrow the above)
//
// Only fill in ONE of these in .env.local — whichever is configured first in
// that order wins. Never throws: if nothing is configured or a send fails,
// it logs and returns { sent: false } so it never breaks product/stock creation.

const {
  GREENAPI_INSTANCE_ID,
  GREENAPI_API_TOKEN,
  CALLMEBOT_API_KEY,
  NOTIFY_WHATSAPP_TO,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WHATSAPP_FROM,
} = process.env;

async function sendViaGreenApi(message) {
  const phone = (NOTIFY_WHATSAPP_TO || "").replace("whatsapp:", "").replace(/\D/g, ""); // digits only, no +
  const url = `https://api.green-api.com/waInstance${GREENAPI_INSTANCE_ID}/sendMessage/${GREENAPI_API_TOKEN}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId: `${phone}@c.us`, message }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Green API request failed (${res.status})`);
  }
  return { sent: true, provider: "green-api", id: data.idMessage };
}

async function sendViaCallMeBot(message) {
  const phone = (NOTIFY_WHATSAPP_TO || "").replace("whatsapp:", "").replace(/\s/g, "");
  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
    phone
  )}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(CALLMEBOT_API_KEY)}`;

  const res = await fetch(url);
  const text = await res.text();

  if (!res.ok || /error/i.test(text)) {
    throw new Error(text || `CallMeBot request failed (${res.status})`);
  }
  return { sent: true, provider: "callmebot" };
}

async function sendViaTwilio(message) {
  const twilio = (await import("twilio")).default;
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  const result = await client.messages.create({
    from: TWILIO_WHATSAPP_FROM,
    to: NOTIFY_WHATSAPP_TO,
    body: message,
  });
  return { sent: true, provider: "twilio", sid: result.sid };
}

export async function sendWhatsAppMessage(message) {
  if (!NOTIFY_WHATSAPP_TO) {
    console.log("[WhatsApp] NOTIFY_WHATSAPP_TO not set — skipping message:", message);
    return { sent: false, reason: "not_configured" };
  }

  try {
    if (GREENAPI_INSTANCE_ID && GREENAPI_API_TOKEN) {
      return await sendViaGreenApi(message);
    }
    if (CALLMEBOT_API_KEY) {
      return await sendViaCallMeBot(message);
    }
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM) {
      return await sendViaTwilio(message);
    }
    console.log("[WhatsApp] No provider configured — skipping:", message);
    return { sent: false, reason: "not_configured" };
  } catch (err) {
    console.error("[WhatsApp] Failed to send:", err.message);
    return { sent: false, reason: err.message };
  }
}
