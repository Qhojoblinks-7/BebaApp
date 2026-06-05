# Beba Logistics Supabase Backend

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌───────────────────────┐
│  Rider Mobile   │────▶│   Supabase API   │────▶│ Postgres Database       │
│   (Expo App)    │     │                  │     │  - users              │
└─────────────────┘     └──────────────────┘     │  - orders             │
                                                │  - rider_status       │
┌─────────────────┐                              │  - rider_locations    │
│Customer Web/App│                              │  - revenue            │
└─────────────────┘                              └───────────────────────┘
                                                    │
                                                    ▼
                                                ┌─────────────┐
                                                │Webhooks     │
                                                └─────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────────────┐
                                            │Edge Function        │
                                            │(whatsapp-notify)     │
                                            └─────────────────────┘
                                                    │
                                                    ▼
                                            ┌─────────────────────┐
                                            │WhatsApp Business API│
                                            └─────────────────────┘
```

## Files

- **`schema.sql`** - Complete database schema with tables, indexes, triggers, and RLS policies
- **`functions/whatsapp-notify/`** - Edge function for WhatsApp notifications on order status changes

## Setup

1. Run `schema.sql` in Supabase SQL Editor
2. Deploy Edge Function:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set WHATSAPP_SYSTEM_TOKEN=your_meta_token
supabase functions deploy whatsapp-notify
```

3. Configure webhook in Supabase Dashboard → Database → Webhooks:
   - Name: `on_order_status_update`
   - Table: `orders`
   - Events: `UPDATE`
   - Type: Supabase Edge Functions
   - Function: `whatsapp-notify`