#!/bin/bash
# Deploy WhatsApp notification function to Supabase

echo "Deploying WhatsApp notification Edge Function..."

# Link project (update with your actual project ref)
supabase link --project-ref your-project-ref

# Set environment secrets
supabase secrets set WHATSAPP_SYSTEM_TOKEN=your_whatsapp_access_token_here

# Deploy function
supabase functions deploy whatsapp-notify

echo "Done! Configure webhook in Supabase Dashboard → Database → Webhooks"