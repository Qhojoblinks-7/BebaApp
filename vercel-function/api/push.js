const { Expo } = require("expo-server-sdk");
const admin = require("firebase-admin");

const CHANNEL = "new-orders";
const expo = new Expo();

let dbPromise;

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

function getDb() {
  if (!dbPromise) {
    dbPromise = Promise.resolve().then(() => {
      if (!admin.apps.length) {
        const credential = process.env.FIREBASE_SERVICE_ACCOUNT
          ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
          : admin.credential.applicationDefault();

        admin.initializeApp({ credential });
      }

      return admin.firestore();
    });
  }

  return dbPromise;
}

function isValidToken(token) {
  return typeof token === "string" && Expo.isExpoPushToken(token);
}

function isAuthorized(req) {
  const configuredSecret = process.env.PUSH_API_SECRET;
  if (!configuredSecret) return true;

  const authorization = req.headers.authorization || "";
  const apiKey = req.headers["x-api-key"] || "";
  return authorization === `Bearer ${configuredSecret}` || apiKey === configuredSecret;
}

async function getRiderPushTokens(db) {
  const snapshot = await db.collection("rider_push_tokens").get();
  const tokens = new Set();

  snapshot.forEach((doc) => {
    const data = doc.data();
    const token = data?.expo_push_token;

    if (isValidToken(token)) {
      tokens.add(token);
    }
  });

  return Array.from(tokens);
}

function buildPushMessages(tokens, orderId, orderDisplayId) {
  return tokens.map((token) => ({
    to: token,
    sound: "cash_register.mp3",
    title: "New Order Available",
    body: `Order #${orderDisplayId || orderId} is ready for pickup`,
    data: { orderId, url: "JobQueueTab", channelId: CHANNEL },
    priority: "high",
    channelId: CHANNEL,
  }));
}

async function sendPushMessages(messages) {
  const tickets = [];
  const sendErrors = [];

  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const result = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...result);
    } catch (err) {
      console.error("[push] send failed:", err);
      sendErrors.push(err?.message || String(err));
    }
  }

  return { tickets, sendErrors };
}

async function collectFailedReceipts(ticketIds) {
  const failedReceipts = [];

  for (const chunk of expo.chunkPushNotificationReceiptIds(ticketIds)) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

      for (const [receiptId, receipt] of Object.entries(receipts)) {
        if (receipt?.status !== "ok") {
          failedReceipts.push({ receiptId, receipt });
        }
      }
    } catch (err) {
      console.error("[push] receipt check failed:", err);
      failedReceipts.push({ receiptError: err?.message || String(err) });
    }
  }

  return failedReceipts;
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
  const orderDisplayId =
    typeof body?.orderDisplayId === "string" && body.orderDisplayId.trim()
      ? body.orderDisplayId.trim()
      : orderId;

  if (!orderId) {
    return sendJson(res, 400, { ok: false, error: "orderId is required" });
  }

  try {
    const db = await getDb();
    const tokens = await getRiderPushTokens(db);

    if (tokens.length === 0) {
      return sendJson(res, 200, {
        ok: true,
        status: "no_tokens",
        recipientCount: 0,
      });
    }

    const messages = buildPushMessages(tokens, orderId, orderDisplayId);
    const { tickets, sendErrors } = await sendPushMessages(messages);
    const okTicketIds = tickets
      .filter((ticket) => ticket.status === "ok" && typeof ticket.id === "string")
      .map((ticket) => ticket.id);
    const failedReceipts = await collectFailedReceipts(okTicketIds);
    const failedTickets = tickets
      .filter((ticket) => !(ticket.status === "ok" && typeof ticket.id === "string"))
      .map((ticket) => ({ ticket }));

    return sendJson(res, 200, {
      ok: true,
      result: {
        status: "sent",
        recipientCount: tokens.length,
        ticketsSent: tickets.length,
        failedReceipts: [...sendErrors, ...failedReceipts, ...failedTickets],
      },
    });
  } catch (err) {
    console.error("[push] request failed:", err);
    return sendJson(res, 500, {
      ok: false,
      error: "push_failed",
      details: err?.message || String(err),
    });
  }
};
