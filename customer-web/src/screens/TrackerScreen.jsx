import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Box, Bike, ShieldCheck, HelpCircle, Ban } from 'lucide-react'

export default function TrackerScreen() {
  const [waybill, setWaybill] = useState('')
  const [searching, setSearching] = useState(false)
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  // Handle clean real-time subscription lifecycle mounts
  useEffect(() => {
    if (!order?.id) return

    console.log(`[TrackerScreen] Subscribing to real-time events for Order UUID: ${order.id}`)

    const orderSubscription = supabase
      .channel(`live_order_${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          console.log('[TrackerScreen] Real-time state payload received:', payload.new)
          setOrder(payload.new)
        }
      )
      .subscribe()

    return () => {
      console.log(`[TrackerScreen] Cleaning up stream channel for Order UUID: ${order.id}`)
      supabase.removeChannel(orderSubscription)
    }
  }, [order?.id])

  const handleSearch = async () => {
    if (!waybill) return
    
    setSearching(true)
    setError('')
    
    try {
      const { data, error: supabaseError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_id', waybill.trim().toUpperCase())
        .maybeSingle()

      if (supabaseError) throw supabaseError

      if (data) {
        setOrder(data)
      } else {
        setError('Waybill reference code not found.')
        setOrder(null)
      }
    } catch (err) {
      console.error('[TrackerScreen] Database search failure context:', err.message)
      setError('System lookup interruption. Try again.')
    } finally {
      setSearching(false)
    }
  }

  // Helper to determine the dynamic text status label
  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Order Request'
      case 'assigned': return 'Rider Confirmed'
      case 'picked_up': return 'Picked Up'
      case 'in_transit': return 'In Transit'
      case 'delivered': return 'Delivered'
      case 'cancelled': return 'Cancelled / Failed'
      default: return status
    }
  };

  // Maps the current status key to a percentage track for the slider visualization
  const getSliderPercentage = (status) => {
    switch (status) {
      case 'pending': return '5%'
      case 'assigned': return '25%'
      case 'picked_up': return '50%'
      case 'in_transit': return '75%'
      case 'delivered': return '100%'
      case 'cancelled': return '100%'
      default: return '0%'
    }
  };

  // Selects an icon indicator matching the active state
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Box className="w-4 h-4 text-slate-900" />
      case 'assigned': return <ShieldCheck className="w-4 h-4 text-slate-900" />
      case 'picked_up': return <Box className="w-4 h-4 text-slate-900" fill="currentColor" />
      case 'in_transit': return <Bike className="w-4 h-4 text-slate-900" />
      case 'delivered': return <ShieldCheck className="w-4 h-4 text-slate-900" />
      case 'cancelled': return <Ban className="w-4 h-4 text-red-600" />
      default: return <HelpCircle className="w-4 h-4 text-slate-900" />
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Track Package</h1>
        <p className="text-xs font-semibold text-slate-500">Monitor your dispatch courier progress in real time.</p>
      </div>

      {/* Input Search Block */}
      <Card className="border-slate-200/80 shadow-sm rounded-xl">
        <CardContent className="pt-5 pb-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg width="18" height="18" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x1="16.65" y2="16.65" />
              </svg>
              <Input
                type="text"
                placeholder="Enter Waybill Reference Code"
                value={waybill}
                onChange={(e) => setWaybill(e.target.value)}
                className="pl-10 h-12 font-bold text-slate-800 tracking-wide placeholder-slate-400 border-slate-200 focus-visible:ring-amber-500 uppercase"
                inputMode="none"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={searching || !waybill}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 px-5 rounded-lg transition-colors active:scale-95"
            >
              {searching ? 'Syncing...' : 'Find'}
            </Button>
          </div>
          {error && <p className="text-xs font-semibold text-rose-600 mt-2.5 ml-1">{error}</p>}
        </CardContent>
      </Card>

      {/* High-Fidelity Tracking Card designed from image_e0ce01.png */}
      {order && (
        <Card className="animate-slide-up border-0 bg-[#FBBF24] shadow-lg rounded-[24px] sm:rounded-[28px] overflow-hidden relative min-h-[240px] sm:min-h-[260px] p-5 sm:p-6 text-slate-900">
          
          {/* Decorative Elements mimicking image_e0ce01.png layout */}
          <div className="absolute right-4 top-4 sm:right-6 sm:top-6 bg-white rounded-full px-3 py-1.5 shadow-sm transform rotate-12 flex items-center justify-center z-10 border border-amber-200">
            <span className="text-[10px] font-black tracking-wider uppercase text-slate-900">Fast</span>
            <div className="absolute -bottom-2 -right-1 text-white/40 text-xs font-bold select-none pointer-events-none">✨</div>
          </div>

          {/* Background Layer Artwork Positioning */}
          <div className="absolute right-[-20px] bottom-1 opacity-20 sm:opacity-25 pointer-events-none transform -rotate-6 sm:-rotate-12">
            <Box size={100} className="sm:w-[140px] sm:h-[140px] text-amber-900" strokeWidth={1} />
          </div>
          <div className="absolute right-[20px] bottom-12 opacity-30 sm:opacity-40 pointer-events-none transform rotate-3 sm:rotate-6">
            <Box size={80} className="sm:w-[110px] sm:h-[110px] text-amber-950" strokeWidth={1.5} />
          </div>

          {/* Primary Text Content Grid Layout */}
          <div className="space-y-3 sm:space-y-4 relative z-10 max-w-[70%] sm:max-w-[65%]">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-amber-950/60 uppercase tracking-wider">Current Tracking</p>
              <h2 className="text-lg sm:text-xl font-extrabold font-mono text-slate-950 tracking-tight mt-0.5">
                #{order.order_id}
              </h2>
            </div>

            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-amber-950/60 uppercase tracking-wider">Current Location</p>
              <div className="flex items-start gap-1 mt-1">
                <MapPin className="w-4 h-4 text-slate-950 mt-0.5 shrink-0" fill="currentColor" />
                 <p className="text-xs sm:text-sm font-extrabold text-slate-950 leading-tight">
                   {order.status === 'delivered' ? order.delivery_address : 
                    order.status === 'in_transit' ? 'En route to destination' :
                    order.pickup_address || 'Processing Hub'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-amber-950/60 uppercase tracking-wider">Status</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="p-1 rounded-full bg-white/80 shadow-sm">
                  {getStatusIcon(order.status)}
                </div>
                <p className="text-xs sm:text-sm font-black text-slate-950">
                  {getStatusLabel(order.status)}
                </p>
              </div>
            </div>
          </div>

          {/* Integrated Horizontal Progress Slider Component */}
          <div className="absolute bottom-5 left-5 right-5 sm:bottom-6 sm:left-6 sm:right-6 z-20 mt-5">
            <div className="relative w-full h-2 bg-amber-950/20 rounded-full overflow-visible">
              {/* Active Progress fill string segment track */}
              <div 
                className="absolute top-0 left-0 h-full bg-slate-900 rounded-full transition-all duration-500 ease-out"
                style={{ width: getSliderPercentage(order.status) }}
              />
              
              {/* Moving Delivery Bike Node Head anchor point element */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 -ml-3 w-7 h-7 bg-slate-900 rounded-full shadow-md flex items-center justify-center border-2 border-[#FBBF24] transition-all duration-500 ease-out"
                style={{ left: getSliderPercentage(order.status) }}
              >
                <Bike className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
          </div>

        </Card>
      )}
    </div>
  )
}