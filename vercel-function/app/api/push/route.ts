import { Expo } from "expo-server-sdk";
import * as admin from "firebase-admin";

const expo = new Expo();
const CHANNEL = "new-orders";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}
const db = admin.firestore();

function isValidToken(token: unknown): token is string {
  return typeof token === "string" && Expo.isExpoPushToken(token);
}

export const runtime = "nodejs22.x";
export const preferredRegion = "iad1";

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
  const orderDisplayId = typeof body?.orderDisplayId === "string" && body.orderDisplayId.trim() ? body.orderDisplayId.trim() : orderId;

  if (!orderId) {
    return new Response(
      JSON.stringify({ ok: false, error: "orderId is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let tokens: string[] = [];
  try {
    const tokensSnap = await db.collection("rider_push_tokens").get();
    tokensSnap.forEach((doc) => {
      const data = doc.data() as Record<string, any>;
      const t = data?.expo_push_token;
      if (typeof t === "string" && isValidToken(t)) {
        tokens.push(t);
      }
    });
  } catch (err) {
    console.error("[push] token fetch failed:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "token_fetch_failed", details: String(err) }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }

  if (tokens.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, status: "no_tokens", recipientCount: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const messages = tokens.map((token) => ({
    to: token,
    sound: "cash_register.mp3",
    title: "New Order Available",
    body: `Order #${orderDisplayId || orderId} is ready for pickup`,
    data: { orderId, url: "JobQueueTab", channelId: CHANNEL },
    priority: "high" as const,
    channelId: CHANNEL,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: any[] = [];
  let sendError: string | null = null;

  for (const chunk of chunks) {
    try {
      const result = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...result);
    } catch (err: any) {
      sendError = err?.message ?? String(err);
      console.error("[push] send failed:", err);
    }
  }

  const okIds: string[] = [];
  const failedReceipts: string[] = [];
  for (const ticket of tickets) {
    if (ticket.status === "ok" && typeof ticket.id === "string") {
      okIds.push(ticket.id);
    } else {
      failedReceipts.push(JSON.stringify(ticket));
    }
  }

  const receiptChunks = expo.chunkPushNotificationReceiptIds(okIds);
  for (const chunk of receiptChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const [k, v] of Object.entries(receipts as any)) {
        if ((v as any)?.status !== "ok") {
          failedReceipts.push(JSON.stringify({ receiptId: k, receipt: v }));
        }
      }
    } catch (err) {
      console.error("[push] receipt check failed:", err);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      result: {
        status: "sent",
        recipientCount: tokens.length,
        ticketsSent: tickets.length,
        failedReceipts: sendError ? [sendError, ...failedReceipts] : failedReceipts,
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
