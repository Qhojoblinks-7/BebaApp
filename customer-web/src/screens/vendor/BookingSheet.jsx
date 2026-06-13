import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { insertDocument } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FieldLabel } from '@/components/ui/field'
import { CheckCircle2, Loader2, X } from 'lucide-react'
import { CurrentLocationButton } from './CurrentLocationButton'
import { emptyForm, generateBookingId, normalizePhone } from './vendorData'

export function BookingSheet({ vendor, onClose, onConfirmed, onTrackBooking }) {
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [submittedBooking, setSubmittedBooking] = useState(null)
  const firstFieldRef = useRef(null)

  const updateField = useCallback((name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
  }, [])

  const canConfirm = form.recipientName.trim().length >= 2 && form.recipientPhone.replace(/\D/g, '').length >= 10 && form.deliveryAddress.trim().length >= 5
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault()
    if (!canConfirm || submitting) return

    setSubmitting(true)
    try {
      const bookingId = generateBookingId()
      const payload = {
        order_id: bookingId,
        order_type: 'vendor_auto_booking',
        sender_name: vendor.name,
        sender_phone: normalizePhone(vendor.phone),
        customer_name: form.recipientName.trim(),
        customer_phone: normalizePhone(form.recipientPhone),
        pickup_address: vendor.pickupAddress || vendor.location,
        pickup_zone: (vendor.pickupAddress || vendor.location || '').split(',').pop()?.trim() || 'Vendor service area',
        pickup_lng: vendor.pickupLng || null,
        pickup_lat: vendor.pickupLat || null,
        delivery_address: form.deliveryAddress.trim(),
        delivery_zone: form.deliveryAddress.trim().split(',').pop()?.trim() || 'General Accra',
        delivery_lng: form.deliveryLng || null,
        delivery_lat: form.deliveryLat || null,
        item_description: `Food order from ${vendor.name}`,
        delivery_instructions: form.instructions.trim() || null,
        status: 'pending',
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        vendor_phone: normalizePhone(vendor.phone),
        vendor_category: vendor.category,
        vendor_image: vendor.image || null,
        prior_order_id: vendor.priorOrderId || null,
      }

      const saved = await insertDocument('orders', payload)
      const booking = { ...payload, id: saved.id, order_id: bookingId }
      onConfirmed?.(booking)
      setSubmittedBooking(booking)
    } catch (err) {
      console.error('[BookingSheet] booking submit failed:', err)
      alert(`Failed to submit booking: ${err.message || 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }, [canConfirm, form, onConfirmed, submitting, vendor])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      firstFieldRef.current?.focus()
    }, 80)
    return () => window.clearTimeout(timer)
  }, [submittedBooking])

  if (!vendor) return null

  return createPortal(
    <div className="fixed inset-0 z-[80] bg-slate-950/45" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="automatic-booking-title"
        className="fixed inset-x-0 bottom-0 z-[90] mx-auto max-w-2xl max-h-[90dvh] overflow-y-auto rounded-t-[2rem] bg-white p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl shadow-slate-950/30"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-600">Automatic Booking</p>
            <h2 id="automatic-booking-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950">Booking with {vendor.name}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close automatic booking form" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-600/20">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!submittedBooking ? (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Pickup details are already set</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">Locked</span>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pickup Vendor</FieldLabel>
                  <Input readOnly aria-readonly="true" value={vendor.name} className="mt-1 h-12 rounded-2xl border-slate-200 bg-white text-slate-600" />
                </div>
                <div>
                  <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pickup Address</FieldLabel>
                  <Input readOnly aria-readonly="true" value={vendor.pickupAddress || vendor.location} className="mt-1 h-12 rounded-2xl border-slate-200 bg-white text-slate-600" />
                </div>
                <div>
                  <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vendor Phone</FieldLabel>
                  <Input readOnly aria-readonly="true" value={vendor.phone} className="mt-1 h-12 rounded-2xl border-slate-200 bg-white text-slate-600" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recipient Name</FieldLabel>
                <Input ref={firstFieldRef} value={form.recipientName} onChange={(event) => updateField('recipientName', event.target.value)} placeholder="Recipient Full Name" className="mt-1 h-14 rounded-2xl border-slate-200 bg-slate-50 pl-4" autoComplete="name" />
              </div>
              <div>
                <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recipient Phone Number</FieldLabel>
                <Input value={form.recipientPhone} onChange={(event) => updateField('recipientPhone', event.target.value)} placeholder="+233 XX XXX XXXX" className="mt-1 h-14 rounded-2xl border-slate-200 bg-slate-50 pl-4" type="tel" autoComplete="tel" />
              </div>
              <div>
                <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Delivery Address</FieldLabel>
                <Input value={form.deliveryAddress} onChange={(event) => updateField('deliveryAddress', event.target.value)} placeholder="Enter delivery address" className="mt-1 h-14 rounded-2xl border-slate-200 bg-slate-50 pl-4" />
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-900">Current Location</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Automatically detect your delivery location. You can still edit the address after detection.</p>
                <CurrentLocationButton
                  onDetected={(location) => {
                    updateField('deliveryAddress', location.address)
                    updateField('deliveryLat', location.lat)
                    updateField('deliveryLng', location.lon)
                  }}
                  className="mt-3"
                />
              </div>

              <div>
                <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Delivery Instructions</FieldLabel>
                <textarea
                  value={form.instructions}
                  onChange={(event) => updateField('instructions', event.target.value)}
                  placeholder="Gate code, landmark, or delivery note"
                  className="mt-1 min-h-28 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting || !canConfirm}
              className="h-14 w-full rounded-2xl bg-red-600 font-black uppercase text-white shadow-lg shadow-red-600/20 transition disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {submitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Submitting...</> : 'Confirm Booking'}
            </Button>
          </form>
        ) : (
          <div className="mt-5 rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Booking Sent</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">Your request has been sent to {submittedBooking.vendor_name}.</p>
            <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-900 ring-1 ring-emerald-200">
              Waybill: <span className="text-red-600">{submittedBooking.order_id}</span>
            </p>
            <div className="mt-5 grid gap-3">
              <Button type="button" onClick={() => { onConfirmed?.(submittedBooking); onClose?.(); onTrackBooking?.() }} className="h-14 rounded-2xl bg-red-600 font-black uppercase text-white shadow-lg shadow-red-600/20">
                Track Booking
              </Button>
              <Button type="button" onClick={() => { setSubmittedBooking(null); setForm({ ...emptyForm }) }} className="h-14 rounded-2xl bg-white font-black uppercase text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
                Book Another
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body,
  )
}
