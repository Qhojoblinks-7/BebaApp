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
            <span className="text-slate-400">Distance fee</span>
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
  console.log('[OrderScreen] render')
  const [submitted, setSubmitted] = useState(false)
  const [submittedOrderId, setSubmittedOrderId] = useState('')
  const [submittedTotalFee, setSubmittedTotalFee] = useState(0)
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
  const addressTokenRef = useRef(0)
  const formDataRef = useRef(formData)
  formDataRef.current = formData
  console.log('[OrderScreen] ref synced:', formDataRef.current)

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
    console.log('[updateDistance] start:', { pickup, drop, key })
    if (lastDistanceKeyRef.current === key) {
      console.log('[updateDistance] skip duplicate key')
      return
    }
    lastDistanceKeyRef.current = key
    setDistanceLoading(true)
    setDistanceError('')
    setDistanceMethod('')
    setManualOverride(false)
    console.log('[updateDistance] calling calculateDistance...')
    const result = await calculateDistance(pickup, drop)
    console.log('[updateDistance] result:', result)
    if (result.allowed) {
      const km = Number(result.distanceKm)
      console.log('[updateDistance] setting distance:', km, 'method:', result.method, 'coords:', result.coordinates)
      setLocalDistance(km)
      setField('distance', km)
      setField('pickupLng', result.coordinates.pickup.lon)
      setField('pickupLat', result.coordinates.pickup.lat)
      setField('deliveryLng', result.coordinates.delivery.lon)
      setField('deliveryLat', result.coordinates.delivery.lat)
      setDistanceMethod(result.method || 'routed')
    } else {
      console.log('[updateDistance] not allowed:', result.reason)
      setDistanceError(result.reason)
    }
    setDistanceLoading(false)
    console.log('[updateDistance] done')
  }, [setField])

  const handleAddressChange = useCallback((fieldName, value) => {
    console.log('[OrderScreen] handleAddressChange:', fieldName, value)
    setField(fieldName, value)
    if (addressTimeoutRef.current) clearTimeout(addressTimeoutRef.current)
    addressTimeoutRef.current = setTimeout(() => {
      const { pickup, drop } = formDataRef.current
      console.log('[OrderScreen] debounced address check:', { pickup, drop })
      if (pickup?.length >= 5 && drop?.length >= 5) {
        updateDistance(pickup, drop)
      }
    }, 800)
  }, [setField, updateDistance])

  const onSubmit = async (e) => {
    e?.preventDefault?.()
    console.log('[OrderScreen] onSubmit called')
    if (distanceLoading) { console.log('[OrderScreen] submit blocked: distanceLoading'); return }
    const orderId = `BBA-${Math.floor(1000 + Math.random() * 9000)}-XP`
    const normalizedPhone = normalizePhone(formData.phone)
    const normalizedRecipientPhone = normalizePhone(formData.phone2)
    const distanceVal = currentDistance
    console.log('[OrderScreen] Submit payload:', { orderId, senderPhone: normalizedPhone, recipientPhone: normalizedRecipientPhone, distance: distanceVal, pricing: calculateDeliveryFee(distanceVal) })
    const validation = orderSchema.safeParse({ ...formData, phone: formData.phone, distance: distanceVal })
    if (!validation.success) {
      console.log('[OrderScreen] validation failed:', validation.error?.issues)
      alert('Please check form fields. ' + (validation.error?.issues?.[0]?.message || 'Unknown validation error'))
      return
    }
    const value = validation.data
    const pricing = calculateDeliveryFee(distanceVal)
    if (!pricing.allowed) { alert(pricing.reason); return }
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
      }
      const { id } = await insertDocument('orders', orderData)
      if (!id) throw new Error('Order creation failed')
      setSubmittedTotalFee(pricing.breakdown.totalFee)
      setSubmittedOrderId(orderId)
      setSubmitted(true)
      if (onOrderSuccess) onOrderSuccess(orderId)

      fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, orderDisplayId: orderId }),
      }).catch((err) => console.warn('[OrderScreen] push notify failed:', err.message))
    } catch (err) {
      console.error('[OrderScreen] insert failed:', err)
      alert('Failed to create order: ' + (err.message || 'Unknown error'))
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
        <Card className="animate-in zoom-in-105 duration-500 w-full max-w-sm text-center rounded-3xl border-0 shadow-lg p-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <h2 className="text-xl font-black text-slate-900 uppercase">Request Logged!</h2>
          <p className="text-xs font-bold text-slate-500 mt-1">Waybill: {submittedOrderId}</p>
          <p className="text-lg font-bold text-red-600 mt-4">Total: GH₵ {submittedTotalFee.toFixed(2)}</p>
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200 mt-6 flex flex-col gap-2">
            <Button onClick={() => onOrderSuccess?.(submittedOrderId)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase rounded-xl">Track Order</Button>
            <Button onClick={() => { setSubmitted(false); setFormData({ sender: '', recipient: '', phone: '', phone2: '', pickup: '', drop: '', item: '', instructions: '', distance: 2.0, pickupLng: undefined, pickupLat: undefined, deliveryLng: undefined, deliveryLat: undefined }); setStep(1); }} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase rounded-xl">Book Another</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-32">
      <div className="text-center pt-6 pb-8">
        <h1 className="animate-in fade-in slide-in-from-top-4 duration-500 text-3xl font-black text-slate-900 uppercase italic">Request Delivery</h1>
        <p className="animate-in fade-in duration-500 delay-75 text-red-600 font-bold uppercase text-xs tracking-widest mt-1">Beba Fleet Service</p>
      </div>

      <Card className="animate-in fade-in slide-in-from-bottom-6 duration-500 delay-100 w-full max-w-md mx-auto border-0 shadow-xl rounded-3xl mb-8">
        <CardContent className="p-6">
          <StepIndicator step={step} />
          <form id="order-form" onSubmit={onSubmit} className="space-y-5">
            {step === 1 && (
              <div className="space-y-4">
                <Field><FieldLabel>Sender Name</FieldLabel><Input className="rounded-xl border-slate-200" value={formData.sender} onChange={(e) => setField('sender', e.target.value)} placeholder="Your full name" /></Field>
                <Field><FieldLabel>Pickup Address</FieldLabel><LocationSearch className="rounded-xl" value={formData.pickup} onChange={(val) => handleAddressChange('pickup', val)} placeholder="Search pickup..." /></Field>
                <Field><FieldLabel>Contact Number</FieldLabel><Input className="rounded-xl" type="tel" value={formData.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="Mobile Number" /></Field>
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <Field><FieldLabel>Recipient Name</FieldLabel><Input className="rounded-xl" value={formData.recipient} onChange={(e) => setField('recipient', e.target.value)} placeholder="Recipient Full Name" /></Field>
                <Field><FieldLabel>Destination</FieldLabel><LocationSearch className="rounded-xl" value={formData.drop} onChange={(val) => handleAddressChange('drop', val)} placeholder="Search destination..." /></Field>
                <Field><FieldLabel>Recipient Contact</FieldLabel><Input className="rounded-xl" type="tel" value={formData.phone2} onChange={(e) => setField('phone2', e.target.value)} placeholder="Recipient Mobile Number" /></Field>
                <Field><FieldLabel>Cargo Details</FieldLabel><Input className="rounded-xl" value={formData.item} onChange={(e) => setField('item', e.target.value)} placeholder="What are you sending?" /></Field>
                {distanceLoading && <div className="p-3 text-xs font-bold text-red-700 bg-red-50 rounded-xl flex items-center"><Loader2 className="animate-spin w-4 h-4 mr-2" /> Calculating distance...</div>}
                {distanceError && <div className="p-3 text-xs text-red-600 bg-red-50 rounded-xl">{distanceError}</div>}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Auto Distance</span>
                  <button type="button" onClick={() => { setManualOverride(!manualOverride); if (!manualOverride) setDistanceMethod('manual'); else setDistanceMethod(localDistance <= 8 ? 'routed' : 'straight-line'); }} className="text-xs font-bold text-red-600 flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> {manualOverride ? 'Override ON' : 'Override'}
                  </button>
                </div>

                {manualOverride && (
                  <Field>
                    <FieldLabel>Distance override (km)</FieldLabel>
                    <Input className="rounded-xl" type="number" step="0.1" min="0.1" max="8" value={formData.distance} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v) && v > 0) { setField('distance', v); setLocalDistance(v); } }} placeholder="Enter distance in km" />
                  </Field>
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

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-50/80 backdrop-blur-md border-t border-slate-200 z-50">
        <div className="max-w-md mx-auto">
          <div className="flex gap-3">
            {step === 2 && (
              <Button type="button" onClick={() => setStep(1)} className="flex-1 h-14 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black uppercase rounded-2xl">
                <ChevronLeft className="w-5 h-5 mr-1" /> Back
              </Button>
            )}
            {step === 1 ? (
              <Button type="button" disabled={!canSubmitStep1(formData)} onClick={() => { console.log('[OrderScreen] Next click'); setStep(2); }} className="flex-[2] h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase rounded-2xl transition-all shadow-lg shadow-red-600/30 active:scale-95">
                Next <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            ) : (
              <Button type="button" disabled={distanceLoading || !canSubmitStep2(formData)} onClick={() => { console.log('[OrderScreen] Confirm click'); onSubmit(); }} className="flex-[2] h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase rounded-2xl transition-all shadow-lg shadow-red-600/30 active:scale-95">
                Confirm Request
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
