import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, PackageSearch, RefreshCw, Search } from 'lucide-react'
import TrackingCard from '@/components/TrackingCard'
import { getDocument, getDocuments, subscribeToDocument, where, limit } from '@/lib/db'

export default function TrackerScreen({ initialWaybill = '', onBookAnother }) {
  const safeInitial = typeof initialWaybill === 'string' && initialWaybill.trim().length > 0 ? initialWaybill.trim() : ''
  const [waybill, setWaybill] = useState(safeInitial)
  const [searching, setSearching] = useState(false)
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [riderStatus, setRiderStatus] = useState(null)
  const [riderStatusLoading, setRiderStatusLoading] = useState(false)
  const autoSearchDone = useRef(false)

  const handleSearch = useCallback(async (waybillOverride) => {
    const raw = waybillOverride ?? waybill ?? ''
    const cleanWaybill = String(raw).trim().toUpperCase()

    if (!cleanWaybill) return

    setSearching(true)
    setError('')
    setRiderStatus(null)

    try {
      const orderDoc = await getDocument('orders', cleanWaybill)

      if (!orderDoc) {
        const fallbackOrders = await getDocuments('orders', [
          where('order_id', '>=', cleanWaybill),
          where('order_id', '<=', cleanWaybill + '\uf8ff'),
          where('order_id', '!=', ''),
          limit(5),
        ])
        const matched = fallbackOrders.filter((o) =>
          (o.order_id || '').toUpperCase().includes(cleanWaybill)
        )

        if (matched.length > 0) {
          setOrder(matched[0])

          if (matched[0].rider_id) {
            setRiderStatusLoading(true)
            const statusDoc = await getDocument('rider_status', matched[0].rider_id)
            setRiderStatus(statusDoc?.rider_status || 'offline')
            setRiderStatusLoading(false)
          }
        } else {
          setError('Waybill reference code not found. Please verify the code or contact support.')
          setOrder(null)
        }
      } else {
        setOrder(orderDoc)

        if (orderDoc.rider_id) {
          setRiderStatusLoading(true)
          const statusDoc = await getDocument('rider_status', orderDoc.rider_id)
          setRiderStatus(statusDoc?.rider_status || 'offline')
          setRiderStatusLoading(false)
        }
      }
    } catch (err) {
      console.error('[Tracker] Search error:', err)
      setError('System lookup interruption. Try again.')
    } finally {
      setSearching(false)
    }
  }, [waybill])

  useEffect(() => {
    if (!initialWaybill || autoSearchDone.current) return

    autoSearchDone.current = true
    const timer = setTimeout(() => handleSearch(initialWaybill), 300)
    return () => clearTimeout(timer)
  }, [initialWaybill, handleSearch])

  useEffect(() => {
    if (!order?.rider_id) return

    let cancelled = false

    const fetchRiderStatus = async () => {
      setRiderStatusLoading(true)
      const statusDoc = await getDocument('rider_status', order.rider_id)
      if (cancelled) return
      setRiderStatus(statusDoc?.rider_status || 'offline')
      setRiderStatusLoading(false)
    }

    fetchRiderStatus()

    const unsubscribe = subscribeToDocument('rider_status', order.rider_id, (statusDoc) => {
      if (cancelled) return
      setRiderStatus(statusDoc?.rider_status || 'offline')
      setRiderStatusLoading(false)
    })

    return () => {
      cancelled = true
      if (unsubscribe) unsubscribe()
    }
  }, [order?.rider_id])

  const statusHelpers = {
    label: (status) => ({
      pending: 'Order Request',
      assigned: 'Rider Confirmed',
      picked_up: 'Picked Up',
      in_transit: 'In Transit',
      delivered: 'Delivered',
      cancelled: 'Cancelled / Failed',
    }[status] || status),
  }
  const displayRiderStatus = order?.rider_id && !riderStatusLoading ? riderStatus : null

  return (
    <div className="min-h-dvh bg-[#f6f7fb] px-4 pb-8 pt-4">
      <div className="mx-auto max-w-2xl space-y-4">
        <header className="flex items-start justify-between gap-4 pt-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-600">Live tracking</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Track Package</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Monitor dispatch progress in real time.</p>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition active:scale-95"
            aria-label="Tracking notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
        </header>

        <Card className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <CardContent className="p-4">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="WAYBILL CODE"
                  value={waybill}
                  onChange={(e) => setWaybill(e.target.value.toUpperCase())}
                  className="h-14 rounded-2xl border-slate-200 bg-slate-50 pl-12 font-black uppercase"
                />
              </div>
              <Button
                type="button"
                onClick={() => handleSearch()}
                disabled={searching || !waybill}
                className="h-14 shrink-0 rounded-2xl bg-slate-950 px-5 font-black uppercase"
              >
                {searching ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Find'}
              </Button>
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
                <PackageSearch className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {!order && !error && (
          <Card className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
            <CardContent className="p-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-600 text-white shadow-lg shadow-red-600/20">
                <PackageSearch className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-xl font-black text-slate-950">Enter a waybill code</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Use the reference code from your booking confirmation to view pickup, rider, and delivery status.
              </p>

              {onBookAnother && (
                <Button
                  type="button"
                  onClick={onBookAnother}
                  className="mt-5 w-full h-14 rounded-2xl bg-red-600 font-black uppercase text-white shadow-lg shadow-red-600/20"
                >
                  Book Another Delivery
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {order && (
          <TrackingCard
            waybill={order.order_id}
            location={order.status === 'delivered' ? order.delivery_address : 'Tracking active'}
            status={statusHelpers.label(order.status)}
            riderStatus={displayRiderStatus}
            riderAssigned={!!order.rider_id}
          />
        )}
      </div>
    </div>
  )
}
