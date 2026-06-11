import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import TrackingCard from '@/components/TrackingCard';
import { getDocument, getDocuments, subscribeToDocument, where, limit } from '@/lib/db';

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
      const orderDoc = await getDocument('orders', cleanWaybill);

      console.log('[Tracker] Query result:', { orderDoc, waybill: cleanWaybill })

      // If not found by direct ID match, try a broader search as fallback
      if (!orderDoc) {
        console.log('[Tracker] Order not found by doc ID, trying order_id field search...')
        const fallbackOrders = await getDocuments('orders', [
          where('order_id', '>=', cleanWaybill),
          where('order_id', '<=', cleanWaybill + '\uf8ff'),
          where('order_id', '!=', ''),
          limit(5),
        ]);
        const matched = fallbackOrders.filter((o) =>
          (o.order_id || '').toUpperCase().includes(cleanWaybill)
        );
        console.log('[Tracker] Fallback query result:', { matchedCount: matched.length })
        if (matched.length > 0) {
          setOrder(matched[0]);
          if (matched[0].rider_id) {
            setRiderStatusLoading(true);
            const statusDoc = await getDocument('rider_status', matched[0].rider_id);
            setRiderStatus(statusDoc?.rider_status || 'offline');
            setRiderStatusLoading(false);
          }
        } else {
          setError('Waybill reference code not found. Please verify the code or contact support.');
          setOrder(null);
        }
      } else {
        setOrder(orderDoc);

        if (orderDoc.rider_id) {
          setRiderStatusLoading(true);
          const statusDoc = await getDocument('rider_status', orderDoc.rider_id);
          setRiderStatus(statusDoc?.rider_status || 'offline');
          setRiderStatusLoading(false);
        }
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

    setRiderStatusLoading(true);
    const fetchRiderStatus = async () => {
      const statusDoc = await getDocument('rider_status', order.rider_id);
      setRiderStatus(statusDoc?.rider_status || 'offline');
      setRiderStatusLoading(false);
    };

    fetchRiderStatus();

    const unsubscribe = subscribeToDocument('rider_status', order.rider_id, (statusDoc) => {
      console.log('[Tracker] Real-time status update:', statusDoc);
      setRiderStatus(statusDoc?.rider_status || 'offline');
      setRiderStatusLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [order?.rider_id]);

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