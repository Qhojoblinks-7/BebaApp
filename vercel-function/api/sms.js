const AfricaTalking = require("africastalking")({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME || "sandbox",
});

function sendJson(res, statusCode, payload) {
  res.setHeader("Content-Type", "application/json");
  res.status(statusCode).send(payload);
}

async function readJsonBody(req) {
  if (req.body !== undefined) return req.body;
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

function isAuthorized(req) {
  const configuredSecret = process.env.SMS_API_SECRET || process.env.PUSH_API_SECRET;
  if (!configuredSecret) return true;
  const authorization = req.headers.authorization || "";
  const apiKey = req.headers["x-api-key"] || "";
  return authorization === `Bearer ${configuredSecret}` || apiKey === configuredSecret;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return sendJson(res, 401, { ok: false, error: "Unauthorized" });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendJson(res, 400, { ok: false, error: "Invalid JSON" });
  }

  const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
  const recipientPhone = typeof body?.recipientPhone === "string" ? body.recipientPhone.trim() : "";
  const deliveryPin = typeof body?.deliveryPin === "string" ? body.deliveryPin.trim() : "";

  if (!orderId) {
    return sendJson(res, 400, { ok: false, error: "orderId is required" });
  }
  if (!recipientPhone) {
    return sendJson(res, 400, { ok: false, error: "recipientPhone is required" });
  }
  if (!deliveryPin) {
    return sendJson(res, 400, { ok: false, error: "deliveryPin is required" });
  }

  if (!process.env.AT_API_KEY) {
    return sendJson(res, 500, { ok: false, error: "AT_API_KEY not configured" });
  }

  try {
    const sms = client.SMS;
    const response = await sms.send({
      message: `Your Beba delivery verification code is: ${deliveryPin}. Share this with your rider upon delivery.`,
      to: [recipientPhone],
      from: process.env.AT_SENDER_ID || "BebaApp",
    });

    const recipients = response?.SMSMessageData?.Recipients || [];
    const success = recipients[0]?.status === "Success";

    return sendJson(res, 200, {
      ok: true,
      success,
      recipients,
    });
  } catch (err) {
    console.error("[sms] send failed:", err);
    return sendJson(res, 500, {
      ok: false,
      error: "sms_failed",
      details: err?.message || String(err),
    });
  }
};