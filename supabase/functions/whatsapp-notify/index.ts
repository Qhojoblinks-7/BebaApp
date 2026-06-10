
// No external standard library http imports required - using native Deno.serve()

const WHATSAPP_API_URL =
  "https://graph.facebook.com/v25.0/1195550833634821/messages";
const deno = (globalThis as any).Deno;
const WHATSAPP_ACCESS_TOKEN = deno?.env?.get("WHATSAPP_SYSTEM_TOKEN");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, apikey, x-client-info",
};

/**
 * Normalizes local Ghanaian MSISDN numbers cleanly to standard E.164 dial formats
 */
const formatPhoneNumber = (phone: string | null | undefined): string | null => {
  if (!phone) return null;
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (hasPlus) return "+" + digits;
  if (digits.startsWith("0")) return "+233" + digits.slice(1);
  if (digits.startsWith("233")) return "+" + digits;
  if (digits.length >= 9) return "+" + digits;
  return null;
};

deno?.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { record, old_record } = await req.json();

    // Prevent redundant triggers if status field remains untouched during row mutations
    if (old_record && record.status === old_record?.status) {
      return new Response("No status state mutation detected.", {
        status: 200,
        headers: corsHeaders,
      });
    }

    const customerPhone = formatPhoneNumber(record.customer_phone);
    if (!customerPhone) {
      console.warn(
        "[whatsapp-notify] Aborting: Missing or unparseable customer destination digits.",
      );
      return new Response(
        JSON.stringify({ success: true, skipped: "no_valid_phone" }),
        {
          headers: { "Content-Type": "application/json", ...corsHeaders },
          status: 200,
        },
      );
    }

    if (!WHATSAPP_ACCESS_TOKEN) {
      console.error(
        "[whatsapp-notify] Missing WHATSAPP_SYSTEM_TOKEN configuration variable.",
      );
      return new Response(
        JSON.stringify({ error: "Server authentication misconfigured" }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    const orderId = record.order_id || record.id;
    const customerName = record.customer_name || "Customer";

    // Meta Template Configuration Payload setup
    let templateName = "";
    let templateParameters: Array<{ type: string; text: string }> = [];

    // Map database mutations cleanly onto matching Meta-registered business templates
    if (
      !old_record &&
      (record.status === "pending" || record.status === "created")
    ) {
      templateName = "beba_order_received";
      templateParameters = [
        { type: "text", text: customerName },
        { type: "text", text: orderId },
      ];
    } else if (record.status === "assigned") {
      templateName = "beba_order_assigned";
      templateParameters = [
        { type: "text", text: customerName },
        { type: "text", text: orderId },
      ];
    } else if (record.status === "picked_up") {
      templateName = "beba_order_picked_up";
      templateParameters = [
        { type: "text", text: customerName },
        { type: "text", text: orderId },
      ];
    } else if (record.status === "in_transit") {
      templateName = "beba_order_in_transit";
      const pinCode = record.delivery_pin
        ? String(record.delivery_pin)
        : "None Required";
      templateParameters = [
        { type: "text", text: customerName },
        { type: "text", text: orderId },
        { type: "text", text: pinCode },
      ];
    } else if (record.status === "delivered") {
      templateName = "beba_order_delivered";
      templateParameters = [
        { type: "text", text: orderId },
        { type: "text", text: record.received_by || "Recipient" },
      ];
    } else if (record.status === "cancelled") {
      templateName = "beba_order_cancelled";
      templateParameters = [
        { type: "text", text: customerName },
        { type: "text", text: orderId },
      ];
    }

    if (!templateName) {
      return new Response(
        "No notification template mapped for this state shift condition.",
        {
          status: 200,
          headers: corsHeaders,
        },
      );
    }

    // Constructing compliant Meta Template Component parameters payload
    const whatsappPayload = {
      messaging_product: "whatsapp",
      to: customerPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" }, // Default localized language string mapping
        components: [
          {
            type: "body",
            parameters: templateParameters,
          },
        ],
      },
    };

    console.log(
      `[whatsapp-notify] Dispatching Meta payload for template: ${templateName} to ${customerPhone}`,
    );

    const response = await fetch(WHATSAPP_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(whatsappPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(
        "[whatsapp-notify] Meta Graph API processing error response:",
        result,
      );
      return new Response(JSON.stringify({ success: false, error: result }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: response.status,
      });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
      status: 200,
    });
  } catch (error) {
    console.error(
      "[whatsapp-notify] Fatal Runtime Catch Exception:",
      error.message,
    );
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
