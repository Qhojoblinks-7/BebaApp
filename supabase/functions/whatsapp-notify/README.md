# WhatsApp Notification Edge Function

## Setup

1. **Install Supabase CLI**
   ```bash
   npm install -g supabase
   ```

2. **Link your project**
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Set secrets**
   ```bash
   supabase secrets set WHATSAPP_SYSTEM_TOKEN=your_access_token
   ```

4. **Deploy function**
   ```bash
   supabase functions deploy whatsapp-notify
   ```

## Setup Database Webhook

### New Order Notification (INSERT)

In Supabase Dashboard → Database → Webhooks:

- **Name**: `on_order_create`
- **Table**: `orders`
- **Events**: `INSERT`
- **Type**: Supabase Edge Functions
- **Function**: `whatsapp-notify`
- **Body**: `{"record": "{{record}}"}`

### Status Change Notifications (UPDATE)

In Supabase Dashboard → Database → Webhooks:

- **Name**: `on_order_status_update`
- **Table**: `orders`
- **Events**: `UPDATE`
- **Type**: Supabase Edge Functions
- **Function**: `whatsapp-notify`
- **Body**: `{"record": "{{record}}", "old_record": "{{old_record}}"}`

The edge function handles both webhook types:
- **INSERT**: Immediately sends a WhatsApp order-confirmation message to the customer.
- **UPDATE**: Sends a WhatsApp notification when the order status changes (assigned → transit → delivered → cancelled).