import { useState, useEffect, useCallback, useRef } from 'react'
import { insertDocument } from '../lib/db'
import { z } from 'zod'
import { calculateDeliveryFee } from '../lib/pricing'
import { calculateDistance } from '../lib/distanceService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import LocationSearch from '@/components/LocationSearch'
import { AlertCircle, Bike, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Edit3, Loader2, MapPin, Navigation, Package, Phone, ShieldCheck, User } from 'lucide-react'

function generateSecurePin() {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return (array[0] % 9000 + 1000).toString()
}

const orderSchema = z.object({
  sender: z.string().min(2, 'Sender name must be at least 2 characters'),
  recipient: z.string().min(2, 'Recipient name must be at least 2 characters'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  pickup: z.string().min(5, 'Pickup address is required'),
  drop: z.string().min(5, 'Destination address is required'),
  item: z.string().min(2, 'Item description is required'),
  instructions: z.string().optional(),
  distance: z.coerce.number().min(0.1, 'Distance required').max(8, 'Max 8km for bicycles').optional().default(2.0),
  pickupLng: z.number().optional(),
  pickupLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  deliveryLat: z.number().optional(),
})

const steps = [
  { number: 1, label: 'Details' },
  { number: 2, label: 'Confirm' },
]

function StepIndicator({ step }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3">
      {steps.map((item, index) => {
        const isActive = step === item.number
        const isComplete = step > item.number
        const currentStyle = isActive || isComplete ? 'border-red-600 bg-red-50/50' : 'border-slate-200 bg-white'
        const badgeStyle = isActive || isComplete ? 'bg-red-600 text-white' : 'bg-slate-950 text-white'
        const textStyle = isActive || isComplete ? 'text-red-600' : 'text-slate-500'

        return (
          <div key={item.label} className="relative">
            <div className={`rounded-2xl border p-3 text-left transition duration-200 ${currentStyle}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition ${badgeStyle}`}>
                {item.number}
              </div>
              <p className={`mt-2 text-[10px] font-black uppercase tracking-wider transition ${textStyle}`}>
                {item.label}
              </p>
            </div>
            {index === 0 && (
              <div className="absolute left-full top-1/2 hidden h-0.5 w-4 -translate-y-1/2 bg-slate-200 sm:block">
                <div className={`h-full rounded-full bg-red-600 transition-all duration-300 ${step === 2 ? 'w-full' : 'w-0'}`} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PricePreview({ distance }) {
  const pricing = calculateDeliveryFee(distance || 0)

  if (!pricing.allowed) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 transition-all animate-in fade-in slide-in-from-top-2">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm font-bold leading-relaxed text-red-700">{pricing.reason}</p>
        </div>
      </div>
    )
  }

  return (
    <Card className="overflow-hidden rounded-3xl border-0 bg-slate-950 p-4 shadow-xl shadow-slate-900/15">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-600">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Estimated fare</p>
            <p className="mt-0.5 text-xs font-black text-white">{distance?.toFixed(1) || '—'} km delivery</p>
          </div>
        </div>
        <p className="text-xl font-black tracking-tight text-white">GH₵ {pricing.breakdown.totalFee.toFixed(2)}</p>
      </div>

      <div className="mt-3 space-y-2 rounded-2xl bg-white/5 p-3 text-[11px]">
        <div className="flex justify-between font-semibold">
          <span className="text-slate-400">Base fare</span>
          <span className="text-white">GH₵ {pricing.breakdown.basePrice.toFixed(2)}</span>
        </div>
        {pricing.breakdown.distanceFee > 0 && (
          <div className="flex justify-between font-semibold">
            <span className="text-slate-400">Distance fee</span>
            <span className="text-white">+ GH₵ {pricing.breakdown.distanceFee.toFixed(2)}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

export default function OrderScreen({ onOrderSuccess }) {
  const [submitted, setSubmitted] = useState(false)
  const [submittedOrderId, setSubmittedOrderId] = useState('')
  const [submittedTotalFee, setSubmittedTotalFee] = useState(0)
  const [submittedDeliveryPin, setSubmittedDeliveryPin] = useState('')
  const [pinVisible, setPinVisible] = useState(true)
  const [pinCountdown, setPinCountdown] = useState(30)
  const [step, setStep] = useState(1)
  const [distanceLoading, setDistanceLoading] = useState(false)
  const [distanceError, setDistanceError] = useState('')
  const [distanceMethod, setDistanceMethod] = useState('')
  const [manualOverride, setManualOverride] = useState(false)
  const [localDistance, setLocalDistance] = useState(2.0)
  const [formData, setFormData] = useState({
    sender: '',
    recipient: '',
    phone: '',
    phone2: '',
    pickup: '',
    drop: '',
    item: '',
    instructions: '',
    distance: 2.0,
    pickupLng: undefined,
    pickupLat: undefined,
    deliveryLng: undefined,
    deliveryLat: undefined,
  })

  const lastDistanceKeyRef = useRef('')
  const addressTimeoutRef = useRef(null)

  const effectivePinVisible = pinVisible && pinCountdown > 1
  const currentDistance = localDistance

  const setField = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }, [])

  const normalizePhone = (phone) => {
    if (!phone) return phone
    const digits = phone.replace(/[^0-9]/g, '')
    if (digits.startsWith('0')) return '+233' + digits.slice(1)
    if (digits.startsWith('233')) return '+' + digits
    if (!phone.startsWith('+')) return '+' + digits
    return phone
  }

  const canSubmitStep1 = (values) => values.sender.length >= 2 && values.pickup.length >= 5 && values.phone.length >= 10
  const canSubmitStep2 = (values) => values.recipient.length >= 2 && values.drop.length >= 5 && values.item.length >= 2 && values.phone2?.replace(/[^0-9]/g, '').length >= 10

  const updateDistance = useCallback(async (pickup, drop) => {
    if (pickup?.length < 5 || drop?.length < 5) return

    const key = `${pickup}|${drop}`
    if (lastDistanceKeyRef.current === key) return

    lastDistanceKeyRef.current = key
    setDistanceLoading(true)
    setDistanceError('')
    setDistanceMethod('')
    setManualOverride(false)

    const result = await calculateDistance(pickup, drop)

    if (result.allowed) {
      const km = Number(result.distanceKm)
      setLocalDistance(km)
      setField('distance', km)
      setField('pickupLng', result.coordinates.pickup.lon)
      setField('pickupLat', result.coordinates.pickup.lat)
      setField('deliveryLng', result.coordinates.delivery.lon)
      setField('deliveryLat', result.coordinates.delivery.lat)
      setDistanceMethod(result.method || 'routed')
    } else {
      setDistanceError(result.reason)
    }

    setDistanceLoading(false)
  }, [setField])

  const handleAddressChange = useCallback((fieldName, value) => {
    setFormData((prev) => {
      const next = { ...prev, [fieldName]: value }
      if (addressTimeoutRef.current) clearTimeout(addressTimeoutRef.current)

      if (next.pickup?.length >= 5 && next.drop?.length >= 5) {
        addressTimeoutRef.current = setTimeout(() => {
          updateDistance(next.pickup, next.drop)
        }, 800)
      }
      return next
    })
  }, [updateDistance])

  const onSubmit = async (e) => {
    e?.preventDefault?.()
    if (distanceLoading) return

    const orderId = `BBA-${Math.floor(1000 + Math.random() * 9000)}-XP`
    const deliveryPin = generateSecurePin()
    const normalizedPhone = normalizePhone(formData.phone)
    const normalizedRecipientPhone = normalizePhone(formData.phone2)
    const distanceVal = currentDistance
    const validation = orderSchema.safeParse({ ...formData, phone: formData.phone, distance: distanceVal })

    if (!validation.success) {
      alert('Please check form fields. ' + (validation.error?.issues?.[0]?.message || 'Unknown validation error'))
      return
    }

    const value = validation.data
    const pricing = calculateDeliveryFee(distanceVal)

    if (!pricing.allowed) {
      alert(pricing.reason)
      return
    }

    try {
      const orderData = {
        order_id: orderId,
        sender_name: value.sender,
        sender_phone: normalizedPhone,
        customer_name: value.recipient,
        customer_phone: normalizedRecipientPhone,
        pickup_address: value.pickup,
        pickup_zone: value.pickup?.split(',').pop()?.trim() || 'General Accra',
        pickup_lng: value.pickupLng || null,
        pickup_lat: value.pickupLat || null,
        delivery_address: value.drop,
        delivery_zone: value.drop?.split(',').pop()?.trim() || 'General Accra',
        delivery_lng: value.deliveryLng || null,
        delivery_lat: value.deliveryLat || null,
        item_description: value.item,
        delivery_instructions: value.instructions || null,
        status: 'pending',
        delivery_fee: pricing.breakdown.totalFee,
        base_price: pricing.breakdown.basePrice,
        distance_fee: pricing.breakdown.distanceFee,
        surge_fee: pricing.breakdown.surgeFee,
        delivery_pin: deliveryPin,
      }

      const { id } = await insertDocument('orders', orderData)
      if (!id) throw new Error('Order creation failed')

      setSubmittedTotalFee(pricing.breakdown.totalFee)
      setSubmittedOrderId(orderId)
      setSubmittedDeliveryPin(deliveryPin)
      setPinVisible(true)
      setPinCountdown(30)
      setSubmitted(true)

      if (onOrderSuccess) onOrderSuccess(orderId)

      fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, orderDisplayId: orderId }),
      }).catch((err) => console.warn('[OrderScreen] push notify failed:', err.message))

      if (normalizedRecipientPhone) {
        fetch('/api/sms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, recipientPhone: normalizedRecipientPhone, deliveryPin }),
        }).catch((err) => console.warn('[OrderScreen] SMS notify failed:', err.message))
      }
    } catch (err) {
      console.error('[OrderScreen] insert failed:', err)
      alert('Failed to create order: ' + (err.message || 'Unknown error'))
    }
  }

  useEffect(() => {
    if (!submitted || !pinVisible || pinCountdown <= 1) return
    const timer = setTimeout(() => setPinCountdown(pinCountdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [submitted, pinVisible, pinCountdown])

  if (submitted) {
    return (
      <div className="min-h-dvh bg-[#f6f7fb] px-4 pb-8 pt-6">
        <div className="mx-auto max-w-sm">
          <Card className="overflow-hidden rounded-[2rem] border-0 bg-white p-6 text-center shadow-xl shadow-slate-900/10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Request Logged!</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">Waybill: <span className="text-slate-950">{submittedOrderId}</span></p>

            {effectivePinVisible ? (
              <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-red-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-600">Delivery Verification PIN</p>
                <p className="mt-2 text-4xl font-black tracking-[0.18em] text-red-600">{submittedDeliveryPin}</p>
                <p className="mt-3 text-xs font-bold text-red-500">{pinCountdown}s remaining - Give this code to your recipient</p>
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-500">Verification code hidden - Check with sender for the PIN</p>
            )}

            <p className="mt-5 text-lg font-black text-red-600">Total: GH₵ {submittedTotalFee.toFixed(2)}</p>

            <div className="mt-6 grid gap-3">
              <Button type="button" onClick={() => onOrderSuccess?.(submittedOrderId)} className="h-14 rounded-2xl bg-slate-950 font-black uppercase text-white shadow-lg shadow-slate-900/15">
                Track Order
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setSubmitted(false)
                  setFormData({ sender: '', recipient: '', phone: '', phone2: '', pickup: '', drop: '', item: '', instructions: '', distance: 2.0, pickupLng: undefined, pickupLat: undefined, deliveryLng: undefined, deliveryLat: undefined })
                  setStep(1)
                }}
                className="h-14 rounded-2xl bg-red-600 font-black uppercase text-white shadow-lg shadow-red-600/20"
              >
                Book Another
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    // 🌟 REMAPPED FORM CONTAINER: The form context wrapper encapsulates the absolute height tree context safely
    <form className="min-h-dvh bg-[#f6f7fb] px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-4" onSubmit={onSubmit}>
      <div className="mx-auto max-w-2xl">
        <header className="pt-2">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-600">Beba Fleet Service</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Request Delivery</h1>
          <p className="mt-1 max-w-md text-xs font-semibold leading-relaxed text-slate-500">Complete the details below and confirm your delivery request.</p>
        </header>

        <Card className="mt-5 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <CardContent className="p-0">
            <StepIndicator step={step} />
            
            {step === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Sender Name</FieldLabel>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input className="h-14 rounded-2xl border-slate-200 bg-slate-50/70 pl-12 focus:bg-white transition" value={formData.sender} onChange={(e) => setField('sender', e.target.value)} placeholder="Your full name" />
                  </div>
                </Field>

                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pickup Address</FieldLabel>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 z-10 text-slate-400" />
                    <LocationSearch key={formData.pickup ? 'pickup-filled' : 'pickup-empty'} className="h-14 rounded-2xl border-slate-200 bg-slate-50/70" value={formData.pickup} onChange={(val) => handleAddressChange('pickup', val)} placeholder="Search pickup location in Accra..." />
                  </div>
                </Field>

                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Contact Number</FieldLabel>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input className="h-14 rounded-2xl border-slate-200 bg-slate-50/70 pl-12 focus:bg-white transition" type="tel" value={formData.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="Mobile Number" />
                  </div>
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recipient Name</FieldLabel>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input className="h-14 rounded-2xl border-slate-200 bg-slate-50/70 pl-12 focus:bg-white transition" value={formData.recipient} onChange={(e) => setField('recipient', e.target.value)} placeholder="Recipient Full Name" />
                  </div>
                </Field>

                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Destination Address</FieldLabel>
                  <div className="relative">
                    <Navigation className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 z-10 text-slate-400" />
                    <LocationSearch key={formData.drop ? 'drop-filled' : 'drop-empty'} className="h-14 rounded-2xl border-slate-200 bg-slate-50/70" value={formData.drop} onChange={(val) => handleAddressChange('drop', val)} placeholder="Search destination location..." />
                  </div>
                </Field>

                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recipient Contact</FieldLabel>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input className="h-14 rounded-2xl border-slate-200 bg-slate-50/70 pl-12 focus:bg-white transition" type="tel" value={formData.phone2} onChange={(e) => setField('phone2', e.target.value)} placeholder="Recipient Mobile Number" />
                  </div>
                </Field>

                <Field className="flex flex-col gap-1.5">
                  <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cargo Details</FieldLabel>
                  <div className="relative">
                    <Package className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <Input className="h-14 rounded-2xl border-slate-200 bg-slate-50/70 pl-12 focus:bg-white transition" value={formData.item} onChange={(e) => setField('item', e.target.value)} placeholder="What are you sending?" />
                  </div>
                </Field>

                {distanceLoading && (
                  <div className="flex items-center rounded-xl bg-slate-900 text-white p-3 text-xs font-bold shadow-inner">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-red-500" />
                    Calculating distance footprint...
                  </div>
                )}

                {distanceError && (
                  <div className="flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{distanceError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 border border-slate-100">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Auto Distance</span>
                    <p className="mt-0.5 text-xs font-bold text-slate-700">{currentDistance.toFixed(1)} km</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setManualOverride(!manualOverride)
                      setDistanceMethod(!manualOverride ? 'manual' : localDistance <= 8 ? 'routed' : 'straight-line')
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <Edit3 className="h-3 w-3 text-red-600" />
                    {manualOverride ? 'Override On' : 'Override'}
                  </button>
                </div>

                {manualOverride && (
                  <Field className="flex flex-col gap-1.5 animate-in fade-in duration-150">
                    <FieldLabel className="text-[10px] font-black uppercase tracking-wider text-slate-400">Distance override (km)</FieldLabel>
                    <Input
                      className="h-14 rounded-2xl border-slate-200 bg-slate-50"
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="8"
                      value={formData.distance}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v) && v > 0) {
                          setField('distance', v)
                          setLocalDistance(v)
                        }
                      }}
                      placeholder="Enter distance manually"
                    />
                  </Field>
                )}

                {!manualOverride && distanceMethod && (
                  <p className="rounded-xl bg-slate-100 p-2 text-center text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    {distanceMethod === 'routed' ? '⚡ Native Routed distance' : '📍 Straight-line estimation'}
                  </p>
                )}

                <PricePreview distance={currentDistance} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FIXED BASE FOOTER COMPONENT DIALOGUE */}
      <div className="fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] border-t border-slate-200 bg-white/80 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl">
          <div className="flex gap-3">
            {step === 2 && (
              <Button type="button" onClick={() => setStep(1)} className="h-14 flex-1 rounded-2xl bg-slate-100 font-black uppercase text-slate-700 hover:bg-slate-200 transition">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}

            {step === 1 ? (
              <Button
                type="button"
                disabled={!canSubmitStep1(formData)}
                onClick={() => setStep(2)}
                className="flex-[2] h-14 rounded-2xl bg-red-600 font-black uppercase text-white shadow-lg shadow-red-600/20 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit" // 🔥 CHANGED TO SEMANTIC SUBMIT: Triggers your main standard onSubmit framework natively
                disabled={distanceLoading || !canSubmitStep2(formData)}
                className="flex-[2] h-14 rounded-2xl bg-red-600 font-black uppercase text-white shadow-lg shadow-red-600/20 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all"
              >
                Confirm Request
              </Button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>{currentDistance.toFixed(1)} km Radius</span>
            <span>•</span>
            <Bike className="h-3.5 w-3.5 text-red-600" />
            <span>Eco Bicycle Dispatch</span>
          </div>
        </div>
      </div>
    </form>
  )
}