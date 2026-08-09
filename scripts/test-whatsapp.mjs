// Quick standalone test — run after filling in .env.local:
//   node scripts/test-whatsapp.mjs
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { sendWhatsAppMessage } from "../lib/whatsapp.js";

const result = await sendWhatsAppMessage(
  "✅ Test message from StockPro — if you're reading this on WhatsApp, it works!"
);

console.log(result);
if (!result.sent) {
  console.log("\nNothing sent. Check that ONE of these is fully filled in .env.local:");
  console.log("  GREENAPI_INSTANCE_ID + GREENAPI_API_TOKEN, or");
  console.log("  CALLMEBOT_API_KEY, or");
  console.log("  TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM");
  console.log("...plus NOTIFY_WHATSAPP_TO in all cases.");
}
