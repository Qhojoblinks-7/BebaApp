import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { calculateDeliveryFee } from '../lib/pricing'
import { calculateDistance } from '../lib/distanceService'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import LocationSearch from '@/components/LocationSearch'
import { ChevronLeft, ChevronRight, Loader2, Edit3 } from 'lucide-react'

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

const StepIndicator = ({ step }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
    <div className="w-8 h-1 bg-slate-200 rounded-full">
      <div className={`h-full rounded-full transition-all ${step === 2 ? 'w-full bg-red-600' : 'w-0'}`} />
    </div>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
  </div>
)

function PricePreview({ distance }) {
  const pricing = calculateDeliveryFee(distance || 0)
  console.log('[PricePreview] render:', { distance, pricing })
  if (!pricing.allowed) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
        <p className="text-xs font-bold text-red-600">{pricing.reason}</p>
      </div>
    )
  }
  return (
    <div className="p-4 bg-slate-900 rounded-2xl shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Distance</span>
        <span className="text-sm font-black text-white">{distance?.toFixed(1) || '—'} km</span>
      </div>
      <div className="space-y-1.5 mb-3">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Base fare</span>
          <span className="font-bold text-slate-200">GH₵ {pricing.breakdown.basePrice.toFixed(2)}</span>
        </div>
        {pricing.breakdown.distanceFee > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Distance ({Math.max(0, (distance || 0) - 2).toFixed(1)} km × GH₵8)</span>
            <span className="font-bold text-slate-200">+ GH₵ {pricing.breakdown.distanceFee.toFixed(2)}</span>
          </div>
        )}
      </div>
      <div className="border-t border-slate-700 pt-3 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-300">Total</span>
        <span className="text-2xl font-black text-white tracking-tight">GH₵ {pricing.breakdown.totalFee.toFixed(2)}</span>
      </div>
    </div>
  )
}

export default function OrderScreen({ onOrderSuccess }) {
  const [submitted, setSubmitted] = useState(false)
  const [submittedOrderId, setSubmittedOrderId] = useState('')
  const [submittedTotalFee, setSubmittedTotalFee] = useState(0)
  const [step, setStep] = useState(1)
  const [distanceLoading, setDistanceLoading] = useState(false)
  const [distanceError, setDistanceError] = useState('')
  const [distanceMethod, setDistanceMethod] = useState('')
  const [manualOverride, setManualOverride] = useState(false)
  const [localDistance, setLocalDistance] = useState(2.0)

  const normalizePhone = (phone) => {
    if (!phone) return phone
    const digits = phone.replace(/[^0-9]/g, '')
    if (digits.startsWith('0')) return '+233' + digits.slice(1)
    if (digits.startsWith('233')) return '+' + digits
    if (!phone.startsWith('+')) return '+' + digits
    return phone
  }

  const form = useForm({
    defaultValues: { sender: '', recipient: '', phone: '', pickup: '', drop: '', item: '', instructions: '', distance: 2.0, pickupLng: undefined, pickupLat: undefined, deliveryLng: undefined, deliveryLat: undefined },
    validators: { onSubmit: orderSchema },
    onSubmit: async ({ value }) => {
      const orderId = `BBA-${Math.floor(1000 + Math.random() * 9000)}-XP`
      const normalizedPhone = normalizePhone(value.phone)
      const distanceVal = currentDistance
      console.log('[OrderScreen] Submit payload:', { orderId, distance: distanceVal, pricing: calculateDeliveryFee(distanceVal) })
      const pricing = calculateDeliveryFee(distanceVal)
      if (!pricing.allowed) { alert(pricing.reason); return }
      try {
        const { error } = await supabase.from('orders').insert({
          order_id: orderId, sender_name: value.sender, sender_phone: normalizedPhone,
          customer_name: value.recipient, customer_phone: normalizedPhone,
          pickup_address: value.pickup, pickup_zone: value.pickup?.split(',').pop()?.trim() || 'General Accra',
          pickup_lng: value.pickupLng || null,
          pickup_lat: value.pickupLat || null,
          delivery_address: value.drop, delivery_zone: value.drop?.split(',').pop()?.trim() || 'General Accra',
          delivery_lng: value.deliveryLng || null,
          delivery_lat: value.deliveryLat || null,
          item_description: value.item, delivery_instructions: value.instructions || null,
          status: 'pending', delivery_fee: pricing.breakdown.totalFee,
          base_price: pricing.breakdown.basePrice, distance_fee: pricing.breakdown.distanceFee,
          surge_fee: pricing.breakdown.surgeFee,
        })
        if (!error) {
          try { await supabase.functions.invoke('whatsapp-notify', { body: { record: { order_id: orderId, customer_name: value.recipient, customer_phone: normalizedPhone, status: 'pending' } } }) } catch (fnErr) { console.error(fnErr) }
          setSubmittedTotalFee(pricing.breakdown.totalFee)
          setSubmittedOrderId(orderId)
          setSubmitted(true)
        } else { alert('Failed to create order: ' + error.message) }
      } catch { alert('Network error. Check connection and try again.') }
    },
  })

  const lastDistanceKeyRef = useRef('')

  const currentDistance = localDistance

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
      form.setFieldValue('distance', km)
      form.setFieldValue('pickupLng', result.coordinates.pickup.lon)
      form.setFieldValue('pickupLat', result.coordinates.pickup.lat)
      form.setFieldValue('deliveryLng', result.coordinates.delivery.lon)
      form.setFieldValue('deliveryLat', result.coordinates.delivery.lat)
      setDistanceMethod(result.method || 'routed')
    }
    else { setDistanceError(result.reason) }
    setDistanceLoading(false)
  }, [form])

  useEffect(() => {
    const { pickup, drop } = form.state.values
    if (!pickup || !drop || pickup.length < 5 || drop.length < 5) return
    const handler = setTimeout(() => { updateDistance(pickup, drop) }, 800)
    return () => clearTimeout(handler)
  }, [form.state.values.pickup, form.state.values.drop, updateDistance])

  const canSubmitStep1 = (values) => values.sender.length >= 2 && values.pickup.length >= 5 && values.phone.length >= 10
  const canSubmitStep2 = (values) => values.recipient.length >= 2 && values.drop.length >= 5 && values.item.length >= 2

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
        <Card className="w-full max-w-sm text-center rounded-3xl border-0 shadow-lg p-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase">Request Logged!</h2>
          <p className="text-xs text-slate-500 mt-1">Waybill: {submittedOrderId}</p>
          <p className="text-lg font-bold text-red-600 mt-4">Total: GH₵ {submittedTotalFee.toFixed(2)}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => onOrderSuccess?.(submittedOrderId)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase rounded-xl">Track Order</Button>
            <Button onClick={() => { setSubmitted(false); form.reset(); setStep(1); }} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase rounded-xl">Book Another</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-32">
      <div className="text-center pt-6 pb-8">
        <h1 className="text-3xl font-black text-slate-900 uppercase italic">Request Delivery</h1>
        <p className="text-red-600 font-bold uppercase text-xs tracking-widest mt-1">Beba Fleet Service</p>
      </div>

      <Card className="w-full max-w-md mx-auto border-0 shadow-xl rounded-3xl overflow-hidden mb-8">
        <CardContent className="p-6">
          <StepIndicator step={step} />
          <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); }} className="space-y-5">
            {step === 1 && (
              <div className="space-y-4">
                <form.Field name="sender" children={(field) => (<Field><FieldLabel>Sender Name</FieldLabel><Input className="rounded-xl border-slate-200" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Your full name" /></Field>)} />
                <form.Field name="pickup" children={(field) => (<Field><FieldLabel>Pickup Address</FieldLabel><LocationSearch className="rounded-xl" value={field.state.value} onChange={(val) => field.handleChange(val)} placeholder="Search pickup..." /></Field>)} />
                <form.Field name="phone" children={(field) => (<Field><FieldLabel>Contact Number</FieldLabel><Input className="rounded-xl" type="tel" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Mobile Number" /></Field>)} />
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <form.Field name="recipient" children={(field) => (<Field><FieldLabel>Recipient Name</FieldLabel><Input className="rounded-xl" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Recipient Full Name" /></Field>)} />
                <form.Field name="drop" children={(field) => (<Field><FieldLabel>Destination</FieldLabel><LocationSearch className="rounded-xl" value={field.state.value} onChange={(val) => field.handleChange(val)} placeholder="Search destination..." /></Field>)} />
                <form.Field name="item" children={(field) => (<Field><FieldLabel>Cargo Details</FieldLabel><Input className="rounded-xl" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="What are you sending?" /></Field>)} />
                {distanceLoading && <div className="p-3 text-xs font-bold text-red-700 bg-red-50 rounded-xl flex items-center"><Loader2 className="animate-spin w-4 h-4 mr-2" /> Calculating distance...</div>}
                {distanceError && <div className="p-3 text-xs text-red-600 bg-red-50 rounded-xl">{distanceError}</div>}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Auto Distance</span>
                  <button type="button" onClick={() => { setManualOverride(!manualOverride); if (!manualOverride) setDistanceMethod('manual'); else setDistanceMethod(localDistance <= 8 ? 'routed' : 'straight-line'); }} className="text-xs font-bold text-red-600 flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> {manualOverride ? 'Override ON' : 'Override'}
                  </button>
                </div>

                {manualOverride && (
                  <form.Field name="distance" children={(field) => (
                    <Field>
                      <FieldLabel>Distance (km) — manual override</FieldLabel>
                      <Input className="rounded-xl" type="number" step="0.1" min="0.1" max="8" value={field.state.value} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) { field.handleChange(v); setLocalDistance(v); } }} placeholder="Enter distance in km" />
                    </Field>
                  )} />
                )}

                {!manualOverride && distanceMethod && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    {distanceMethod === 'routed' ? '✓ Routed distance' : distanceMethod === 'straight-line' ? '⚠ Estimated (straight-line fallback)' : ''}
                  </p>
                )}

                <PricePreview distance={currentDistance} />
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-50/80 backdrop-blur-md border-t border-slate-200 z-50">
        <div className="max-w-md mx-auto">
          <form.Subscribe selector={(state) => [state.values, state.isSubmitting]} children={([values, isSubmitting]) => (
            <div className="flex gap-3">
              {step === 2 && (
                <Button type="button" onClick={() => setStep(1)} className="flex-1 h-14 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black uppercase rounded-2xl">
                  <ChevronLeft className="w-5 h-5 mr-1" /> Back
                </Button>
              )}
              <Button type="button" disabled={isSubmitting || distanceLoading || !(step === 1 ? canSubmitStep1(values) : canSubmitStep2(values))} onClick={step === 1 ? () => setStep(2) : () => form.handleSubmit()} className="flex-[2] h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase rounded-2xl transition-all shadow-lg shadow-red-600/30 active:scale-95">
                {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : step === 1 ? <>Next <ChevronRight className="w-5 h-5 ml-1" /></> : 'Confirm Request'}
              </Button>
            </div>
          )} />
        </div>
      </div>
    </div>
  )
}