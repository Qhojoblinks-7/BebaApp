import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Box, Bike, ShieldCheck, HelpCircle, Ban, Search, Users, UserX, BookOpen, Wifi } from 'lucide-react';

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

    percentage: (status) => ({
      pending: '5%',
      assigned: '25%',
      picked_up: '50%',
      in_transit: '75%',
      delivered: '100%',
      cancelled: '100%'
    }[status] || '0%'),

    icon: (status) => {
      const icons = {
        pending: <Box className="w-4 h-4 text-slate-900" />,
        assigned: <ShieldCheck className="w-4 h-4 text-slate-900" />,
        picked_up: <Box className="w-4 h-4 text-slate-900" fill="currentColor" />,
        in_transit: <Bike className="w-4 h-4 text-slate-900" />,
        delivered: <ShieldCheck className="w-4 h-4 text-slate-900" />,
        cancelled: <Ban className="w-4 h-4 text-red-600" />
      };
      return icons[status] || <HelpCircle className="w-4 h-4 text-slate-900" />;
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto">
      <div className="pt-2 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Track Package</h1>
          <p className="text-xs font-semibold text-slate-500">Monitor dispatch progress in real-time.</p>
        </div>
        {onBookAnother && (
          <Button onClick={onBookAnother} className="bg-red-600 hover:bg-red-700 text-white font-black uppercase rounded-xl text-xs">Book Another</Button>
        )}
      </div>

      <Card className="border-slate-200 shadow-sm rounded-xl">
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
        <Card className="border-0 bg-[#FBBF24] shadow-lg rounded-[24px] p-6 relative overflow-hidden">
          {/* Tracking visualization elements */}
          <div className="space-y-4 relative z-10">
            <div>
              <p className="text-[10px] font-bold text-amber-950/60 uppercase">Waybill ID</p>
              <h2 className="text-xl font-mono font-black text-slate-950">#{order.order_id}</h2>
            </div>

            {/* Rider Status */}
            {riderStatus && !riderStatusLoading && (() => {
              const conf = STATUS_CONFIG[riderStatus] || STATUS_CONFIG.offline;
              const StatusIcon = conf.icon;
              return (
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${conf.color} bg-opacity-20`}>
                  <StatusIcon className={`w-3.5 h-3.5 ${conf.textColor}`} />
                  <span className={`text-xs font-bold uppercase tracking-wide ${conf.textColor}`}>
                    {conf.label}
                  </span>
                </div>
              );
            })()}

            {!order.rider_id && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-300/25">
                <Users className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Awaiting Rider Assignment
                </span>
              </div>
            )}

            <div className="flex items-start gap-2">
              <MapPin className="w-5 h-5 mt-0.5" />
              <p className="text-sm font-black text-slate-950">
                {order.status === 'delivered' ? order.delivery_address : 'Tracking active'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-white/70">
                {statusHelpers.icon(order.status)}
              </div>
              <p className="text-sm font-black text-slate-950">{statusHelpers.label(order.status)}</p>
            </div>
          </div>

          <div className="mt-8 relative w-full h-2 bg-amber-950/20 rounded-full">
            <div 
              className="absolute h-full bg-slate-900 rounded-full transition-all duration-700"
              style={{ width: statusHelpers.percentage(order.status) }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 -ml-3 w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center border-2 border-[#FBBF24] transition-all duration-700"
              style={{ left: statusHelpers.percentage(order.status) }}
            >
              <Bike className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}