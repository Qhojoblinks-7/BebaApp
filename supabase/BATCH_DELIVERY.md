# Batch Delivery & Routing Optimization

## Overview

This document explains the batch delivery system implemented for the Beba rider app.

## How Batching Works

### Job Discovery (`JobQueueScreen.js`)
- Fetches all pending orders without assigned riders
- Groups orders by **`delivery_zone`** (e.g., "Airport Residential Area", "East Legon")
- Displays clusters as "Batch Runs" with total fee and package count
- Rider claims entire batch with one tap

### Route Sequencing
When claiming a batch, orders are assigned sequential route numbers:
```sql
route_sequence = index + 1  -- Stop 1, Stop 2, Stop 3, etc.
```

### Active Delivery (`ActiveDeliveryScreen.js`)
- Fetches all orders assigned to rider where status is `assigned` or `transit`
- **Ordered by `route_sequence` ascending** for optimal stop order
- Each stop shows:
  - Sequence number (Stop 1, Stop 2, etc.)
  - Current status badge
  - Customer name and delivery address
  - Action buttons: Call, Map, Mark Delivered

## Database Schema Changes

The `orders` table now includes:
- `delivery_zone TEXT` - Zone/area for batch grouping
- `route_sequence INTEGER DEFAULT 0` - Stop order in rider's itinerary
- `batch_id UUID` - Optional explicit batch grouping (future enhancement)

## Workflow

```
1. Rider goes online → Dashboard shows quick actions
2. Rider taps "Available Jobs" → JobQueueScreen
3. Rider claims batch → All orders updated with rider_id + route_sequence
4. Rider taps "My Active Run" → ActiveDeliveryScreen (ordered list)
5. For each stop:
   - Tap "Map" → Opens native maps navigation
   - Tap "Call" → Dials recipient
   - Tap "Deliver" → Updates status (assigned → transit → delivered via closure screen)
```

## WhatsApp Notification Integration

Status changes trigger automatic WhatsApp messages via Edge Function:
- `assigned` → Customer notified: "Rider claimed your package"
- `transit` → Customer notified: "Package is in transit with tracking link"
- `delivered` → Customer notified: "Package delivered successfully"

## Future Enhancements

1. **Geospatial Sorting**: Use PostGIS to sort stops by actual distance
2. **Explicit Batches**: Dedicated `batches` table for admin-created routes
3. **Real-time Location Sharing**: Push rider location to customers during transit
4. **ETA Calculations**: Integrate with mapping APIs for precise timing