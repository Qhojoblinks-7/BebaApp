import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const WHATSAPP_API_URL =
  "https://graph.facebook.com/v25.0/1195550833634821/messages";
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_SYSTEM_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

const formatPhoneNumber = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) return "233" + digits.slice(1);
  if (digits.startsWith("233")) return digits;
  return digits;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { record, old_record } = await req.json();

    if (old_record && record.status === old_record?.status) {
      return new Response("No status state mutation detected.", {
        status: 200,
        headers: corsHeaders,
      });
    }

    const customerPhone = formatPhoneNumber(record.customer_phone);
    const orderId = record.order_id;
    const customerName = record.customer_name;
    let messageText = "";

    if (!old_record) {
      messageText = `Hi ${customerName}, your Beba dispatch request (${orderId}) has been received and is being assigned to a rider.`;
    } else if (record.status === "assigned") {
      messageText = `Hi ${customerName}, your Beba dispatch package (${orderId}) has been claimed by our rider and is being collected right now!`;
    } else if (record.status === "picked_up") {
      messageText = `Hi ${customerName}, your Beba package (${orderId}) has been collected and is heading to you!`;
    } else if (record.status === "in_transit") {
      const pin = record.delivery_pin
        ? `Your delivery PIN is: ${record.delivery_pin}`
        : "";
      messageText = `Hi ${customerName}, your Beba package (${orderId}) is now in transit and on its way to your location! ${pin}`;
    } else if (record.status === "delivered") {
      messageText = `Your package (${orderId}) has been delivered to ${record.received_by || "recipient"}. Thank you for using Beba!`;
    } else if (record.status === "cancelled") {
      messageText = `Hi ${customerName}, your Beba dispatch (${orderId}) has been cancelled. Contact support for details.`;
    }

    if (!messageText) {
      return new Response(
        "No notification template mapped for this status state.",
        { status: 200, headers: corsHeaders },
      );
    }

    if (!customerPhone) {
      console.log("[whatsapp-notify] No valid phone, skipping send");
      return new Response(
        JSON.stringify({ success: true, skipped: "no_phone" }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 200,
        },
      );
    }

    if (!WHATSAPP_ACCESS_TOKEN) {
      console.log(
        "[whatsapp-notify] No WHATSAPP_SYSTEM_TOKEN configured, skipping send",
      );
      return new Response(
        JSON.stringify({ success: true, skipped: "no_token" }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 200,
        },
      );
    }

    const response = await fetch(WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: customerPhone,
        type: "text",
        text: { body: messageText },
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.log("[whatsapp-notify] API error:", result);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (error) {
    console.error("[whatsapp-notify] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
