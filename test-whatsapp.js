// One-off check that Twilio WhatsApp sending works.
// Run: node test-whatsapp.js
// The Sandbox only delivers to numbers that joined it, within 24 hours of
// that number last messaging +1 415 523 8886.
require("dotenv").config({ path: ".env.local" });
const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendTest() {
  try {
    const message = await client.messages.create({
      from: "whatsapp:+14155238886",
      to: "whatsapp:+94776452233",
      body: "Test successful! FireVault new order alerts are working."
    });

    console.log("Message SID:", message.sid);
    console.log("Status:", message.status);
  } catch (error) {
    console.error(error.code, error.message);
  }
}

sendTest();
