import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDocuments } from '@/lib/db'
import { Input } from '@/components/ui/input'
import { Bell, Search, X } from 'lucide-react'
import { BookingSheet } from './vendor/BookingSheet'
import { CurrentLocationButton } from './vendor/CurrentLocationButton'
import { EmptyState, ErrorState } from './vendor/EmptyState'
import { VendorCard } from './vendor/VendorCard'
import { VendorSkeletonCard } from './vendor/VendorSkeletonCard'
import { FALLBACK_VENDORS, normalizePhone, normalizeVendor } from './vendor/vendorData'

export default function VendorScreen({ onBookingSuccess, onTrackBooking }) {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [vendorsError, setVendorsError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [locationMessage, setLocationMessage] = useState('')

  // Body Scroll Fail-Safe Recovery
  useEffect(() => {
    if (!selectedVendor) {
      document.body.style.overflow = ''
    }
  }, [selectedVendor])

  // Native React Async Data Fetching System
  const loadVendors = useCallback(async (signal) => {
    setLoading(true)
    setVendorsError('')
    try {
      const docs = await getDocuments('vendors')
      
      // Stop state updates if the hook has been unmounted
      if (signal.aborted) return

      const normalized = docs.map(normalizeVendor)
      setVendors(normalized.length > 0 ? normalized : FALLBACK_VENDORS)
    } catch (err) {
      console.warn('[VendorScreen] vendors load failed, using fallback:', err.message)
      if (!signal.aborted) {
        setVendors(FALLBACK_VENDORS)
      }
    } finally {
      if (!signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadVendors(controller.signal)

    return () => {
      controller.abort()
      document.body.style.overflow = ''
    }
  }, [loadVendors])

  // Computed Search Filtering
  const filteredVendors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return vendors

    return vendors.filter((vendor) => {
      const haystack = [
        vendor.name,
        vendor.category,
        vendor.location,
        vendor.description,
        ...(vendor.popularDishes || []),
      ].join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [searchTerm, vendors])

  const handleCallVendor = useCallback((vendor) => {
    if (!vendor.phone) return
    window.location.href = `tel:${normalizePhone(vendor.phone)}`
  }, [])

  const handleClearFilters = useCallback(() => {
    setSearchTerm('')
  }, [])

  if (vendorsError) {
    return (
      <div className="min-h-dvh bg-slate-50/50 px-4 py-6">
        <div className="mx-auto max-w-3xl">
          <ErrorState onRetry={() => loadVendors({ aborted: false })} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-slate-50/60 pb-12 text-slate-900 antialiased">
      <div className="mx-auto max-w-3xl px-4 pt-6 space-y-6">
        
        {/* 1. Header Layout block */}
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Local Food Vendors
            </h1>
            <p className="mt-1 text-sm text-slate-500 font-medium">
              Support local culinary creators. Order with confidence.
            </p>
          </div>
          
          <button 
            type="button" 
            aria-label="Vendor notifications" 
            className="group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <Bell className="h-5 w-5 transition-transform group-hover:rotate-12" />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>
        </header>

        {/* 2. Controls & Filtering Deck */}
        <section className="space-y-3 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search vendors, dishes, or keywords..."
                className="h-11 rounded-xl border-slate-200 bg-slate-50/50 pl-10 pr-10 text-sm placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-red-500/20"
                autoComplete="off"
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={handleClearFilters}
                  className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg bg-slate-200/60 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            
            <CurrentLocationButton
              onDetected={(location) => setLocationMessage(location.address)}
              className="h-11 shrink-0 rounded-xl"
            />
          </div>
          
          {locationMessage && (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50/60 px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-emerald-800 ring-1 ring-emerald-600/10" aria-live="polite">
              <span className="truncate">Active Area: {locationMessage}</span>
              <button 
                onClick={() => setLocationMessage('')} 
                className="text-emerald-600 hover:text-emerald-900 font-bold"
              >
                Reset
              </button>
            </div>
          )}
        </section>

        {/* 3. Feed Display Layer */}
        <main>
          {loading && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <VendorSkeletonCard key={idx} />
              ))}
            </div>
          )}

          {!loading && filteredVendors.length === 0 && (
            <div className="py-6">
              <EmptyState 
                onClearFilters={handleClearFilters} 
                onLocationDetected={(location) => setLocationMessage(location.address)} 
              />
            </div>
          )}

          {!loading && filteredVendors.length > 0 && (
            <section className="grid grid-cols-1 gap-5 sm:grid-cols-2" aria-label="Food vendor listings">
              {filteredVendors.map((vendor) => (
                <VendorCard 
                  key={vendor.id} 
                  vendor={vendor} 
                  onCall={handleCallVendor} 
                  onAutoBook={setSelectedVendor} 
                />
              ))}
            </section>
          )}
        </main>
      </div>

      {/* Sheet Modal Layer */}
      <BookingSheet
        vendor={selectedVendor}
        onClose={() => setSelectedVendor(null)}
        onConfirmed={(booking) => onBookingSuccess?.(booking.order_id)}
        onTrackBooking={onTrackBooking}
      />
    </div>
  )
}