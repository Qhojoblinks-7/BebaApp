import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Bike, BookOpen, UserX, Wifi } from 'lucide-react';
import TrackingCard from '@/components/TrackingCard';

const STATUS_CONFIG = {
  online:    { label: 'Rider Available',     color: 'bg-emerald-500', textColor: 'text-emerald-700',  icon: Wifi },
  in_class:  { label: 'Rider In Class',       color: 'bg-amber-500',  textColor: 'text-amber-700',   icon: BookOpen },
  offline:   { label: 'Rider Offline',        color: 'bg-slate-400',  textColor: 'text-slate-600',   icon: UserX },
  on_route:  { label: 'Rider On Route',       color: 'bg-blue-500',   textColor: 'text-blue-700',    icon: Bike },
};

export default function TrackerScreen({ initialWaybill = '', onBookAnother }) {
  const safeInitial = typeof initialWaybill === 'string' && initialWaybill.trim().length > 0 ? initialWaybill.trim() : ''
  const [waybill, setWaybill] = useState(safeInitial);
  const [searching, setSearching] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [riderStatus, setRiderStatus] = useState(null);
  const [riderStatusLoading, setRiderStatusLoading] = useState(false);
  const autoSearchDone = useRef(false);

const handleSearch = useCallback(async (waybillOverride) => {
    const raw = waybillOverride ?? waybill ?? ''
    const cleanWaybill = String(raw).trim().toUpperCase()
    console.log('[Tracker] Searching for waybill:', cleanWaybill)
    if (!cleanWaybill) return

    setSearching(true);
    setError('');
    setRiderStatus(null);

    try {
      console.log('[Tracker] Query params:', { table: 'orders', column: 'order_id', value: cleanWaybill })
      const { data, error: supabaseError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', cleanWaybill)
        .maybeSingle();

      console.log('[Tracker] Query result:', { data, error: supabaseError, waybill: cleanWaybill })

      // If not found, try a broader search as fallback
      if (!data && !supabaseError) {
        console.log('[Tracker] Order not found by eq, trying ilike...')
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('orders')
          .select('order_id, status, rider_id, customer_name, delivery_address')
          .ilike('order_id', `%${cleanWaybill}%`)
          .limit(5);
        console.log('[Tracker] Fallback query result:', { fallbackData, fallbackError })
      }

      if (supabaseError) {
        console.error('[Tracker] Order lookup error:', supabaseError);
        throw supabaseError;
      }
      if (data) {
        setOrder(data);

        if (data.rider_id) {
          setRiderStatusLoading(true);
          const { data: statusData, error: statusError } = await supabase
            .from('rider_status')
            .select('rider_status')
            .eq('id', data.rider_id)
            .maybeSingle();
          if (statusError) {
            console.error('[Tracker] Rider status lookup error:', statusError);
          }
          setRiderStatus(statusData?.rider_status || 'offline');
          setRiderStatusLoading(false);
        }
      } else {
        setError('Waybill reference code not found. Please verify the code or contact support.');
        setOrder(null);
      }
    } catch (err) {
      console.error('[Tracker] Search error:', err);
      setError('System lookup interruption. Try again.');
    } finally {
      setSearching(false);
    }
  }, [waybill]);

  useEffect(() => {
    if (!initialWaybill || autoSearchDone.current) return;
    autoSearchDone.current = true;
    const timer = setTimeout(() => handleSearch(initialWaybill), 300);
    return () => clearTimeout(timer);
  }, [initialWaybill, handleSearch]);

  useEffect(() => {
    if (!order?.rider_id) {
      setRiderStatus(null);
      return;
    }

    const fetchRiderStatus = async () => {
      setRiderStatusLoading(true);
      const { data, error: statusError } = await supabase
        .from('rider_status')
        .select('rider_status')
        .eq('id', order.rider_id)
        .maybeSingle();
      if (statusError) {
        console.error('[Tracker] Rider status fetch error:', statusError);
      }
      setRiderStatus(data?.rider_status || 'offline');
      setRiderStatusLoading(false);
    };

    fetchRiderStatus();

    const channelName = `rider_status_${order.rider_id}_${order.id}`;
    const statusSubscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rider_status', filter: `id=eq.${order.rider_id}` },
        (payload) => {
          console.log('[Tracker] Real-time status update:', payload)
          setRiderStatus(payload.new.rider_status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusSubscription);
    };
  }, [order?.rider_id, order?.id]);

  // Utility to handle formatting and status display logic consistently
  const statusHelpers = {
    label: (status) => ({
      pending: 'Order Request',
      assigned: 'Rider Confirmed',
      picked_up: 'Picked Up',
      in_transit: 'In Transit',
      delivered: 'Delivered',
      cancelled: 'Cancelled / Failed'
    }[status] || status),
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="animate-in fade-in slide-in-from-top-4 duration-500 pt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Track Package</h1>
          <p className="text-xs font-semibold text-slate-500">Monitor dispatch progress in real-time.</p>
        </div>
        {onBookAnother && (
          <Button onClick={onBookAnother} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase rounded-xl text-xs">Book Another</Button>
        )}
      </div>

      <Card className="animate-in fade-in slide-in-from-bottom-6 duration-500 delay-75 border-slate-200 shadow-sm rounded-xl">
        <CardContent className="pt-5 pb-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="WAYBILL CODE"
                value={waybill}
                onChange={(e) => setWaybill(e.target.value.toUpperCase())}
                className="pl-10 h-12 font-bold uppercase"
              />
            </div>
            <Button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSearch(); }}
              disabled={searching || !waybill}
              className="bg-slate-900 h-12 px-6"
            >
              {searching ? 'Syncing...' : 'Find'}
            </Button>
          </div>
          {error && <p className="text-xs font-bold text-rose-600 mt-2">{error}</p>}
        </CardContent>
      </Card>

      {order && (
        <TrackingCard
          waybill={order.order_id}
          location={order.status === 'delivered' ? order.delivery_address : 'Tracking active'}
          status={statusHelpers.label(order.status)}
          riderStatus={riderStatusLoading ? null : riderStatus}
          riderAssigned={!!order.rider_id}
        />
      )}
    </div>
  );
}