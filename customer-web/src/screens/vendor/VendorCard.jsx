import { useState, useEffect } from 'react'
import { Clock, MapPin, Phone, ShieldCheck, Star, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDistance, formatFee } from './vendorData'
import { VendorLogo } from './VendorLogo'

export function VendorCard({ vendor, onCall, onAutoBook }) {
  const [imageFailed, setImageFailed] = useState(false)
  const canAutoBook = Boolean(vendor.hasPriorOrder)
  const canCall = Boolean(vendor.phone)

  useEffect(() => {
    setImageFailed(false)
  }, [vendor.image])

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/50">
      
      {/* 1. Image Header & Badges */}
      <div className="relative h-44 w-full overflow-hidden bg-slate-50">
        {vendor.image && !imageFailed ? (
          <img 
            src={vendor.image} 
            alt={`${vendor.name} storefront`} 
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" 
            onError={() => setImageFailed(true)} 
          />
        ) : (
          <VendorLogo name={vendor.name} />
        )}
        
        {/* Floating Badges */}
        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
            vendor.isOpen 
              ? 'bg-emerald-500/90 text-white' 
              : 'bg-slate-800/90 text-slate-100'
          }`}>
            {vendor.isOpen ? 'Open' : 'Closed'}
          </span>
          
          {vendor.verificationBadge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-800 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 fill-emerald-50" />
              Verified
            </span>
          )}
        </div>
      </div>

      {/* 2. Card Content Wrapper */}
      <div className="p-5">
        
        {/* Header: Title & Past Order Status */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-red-600">{vendor.category}</p>
            <h3 className="mt-0.5 truncate text-xl font-bold tracking-tight text-slate-900" title={vendor.name}>
              {vendor.name}
            </h3>
          </div>
          
          {vendor.hasPriorOrder && (
            <span className="inline-flex shrink-0 items-center rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700 ring-1 ring-orange-600/10">
              Ordered Before
            </span>
          )}
        </div>

        {/* Core Stats Row */}
        <div className="mt-3 flex items-center gap-4 border-b border-slate-50 pb-3 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <strong className="font-bold text-slate-900">{vendor.rating ? Number(vendor.rating).toFixed(1) : 'New'}</strong>
          </span>
          <span className="h-3 w-px bg-slate-200" />
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            {formatDistance(vendor.distance)}
          </span>
          <span className="h-3 w-px bg-slate-200" />
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {vendor.estimatedTime}
          </span>
        </div>

        {/* Description Description */}
        <p className="mt-3 line-clamp-2 text-sm font-medium leading-relaxed text-slate-500 min-h-[2.5rem]">
          {vendor.description}
        </p>

        {/* Structured Secondary Metadata Grid */}
        <div className="mt-4 space-y-1.5 text-xs text-slate-500 font-medium">
          <div className="flex items-center justify-between">
            <span>Fulfillment</span>
            <span className="font-semibold text-slate-700">{vendor.deliveryAvailable ? 'Delivery & Pickup' : 'Pickup Only'}</span>
          </div>
          {vendor.openingHours && (
            <div className="flex items-center justify-between">
              <span>Hours</span>
              <span className="font-semibold text-slate-700">{vendor.openingHours}</span>
            </div>
          )}
          {vendor.deliveryAvailable && formatFee(vendor.deliveryFee) && (
            <div className="flex items-center justify-between">
              <span>Delivery Fee</span>
              <span className="font-semibold text-slate-700">{formatFee(vendor.deliveryFee)}</span>
            </div>
          )}
        </div>

        {/* Popular Dishes Section */}
        {vendor.popularDishes?.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {vendor.popularDishes.slice(0, 3).map((dish) => (
                <span key={dish} className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100">
                  {dish}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 3. Action Buttons Section */}
        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            disabled={!canCall}
            aria-label={canCall ? `Call ${vendor.name}` : 'Calling unavailable'}
            onClick={() => onCall(vendor)}
            className={`h-11 w-12 shrink-0 rounded-xl p-0 transition-all focus-visible:ring-2 focus-visible:ring-slate-400 ${
              canCall 
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                : 'bg-slate-50 text-slate-300 cursor-not-allowed'
            }`}
          >
            <Phone className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            disabled={!canAutoBook}
            aria-describedby={`auto-booking-reason-${vendor.id}`}
            onClick={() => onAutoBook(vendor)}
            className={`h-11 flex-1 rounded-xl font-bold text-sm tracking-wide transition-all focus-visible:ring-2 focus-visible:ring-red-500/20 ${
              canAutoBook 
                ? 'bg-red-600 text-white shadow-md shadow-red-600/10 hover:bg-red-700' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Zap className={`mr-1.5 h-4 w-4 ${canAutoBook ? 'fill-white' : ''}`} />
            {canAutoBook ? 'Instant Book' : 'Booking Unavailable'}
          </Button>
        </div>

        <p id={`auto-booking-reason-${vendor.id}`} className="sr-only">
          {canAutoBook ? 'Instant booking is available because you have an ordering history.' : 'Instant booking is disabled because you have not ordered from this vendor before.'}
        </p>
      </div>
    </article>
  )
}