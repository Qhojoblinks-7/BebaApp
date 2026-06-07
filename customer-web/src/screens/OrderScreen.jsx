import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { calculateDeliveryFee } from '../lib/pricing'
import { calculateDistance } from '../lib/distanceService'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import LocationSearch from '@/components/LocationSearch'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

const orderSchema = z.object({
  sender: z.string().min(2, 'Sender name must be at least 2 characters'),
  recipient: z.string().min(2, 'Recipient name must be at least 2 characters'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  pickup: z.string().min(5, 'Pickup address is required'),
  drop: z.string().min(5, 'Destination address is required'),
  item: z.string().min(2, 'Item description is required'),
  instructions: z.string().optional(),
  distance: z.coerce.number().min(0.1, 'Distance required').max(8, 'Max 8km for bicycles'),
})

const StepIndicator = ({ step }) => (
  <div className="flex items-center justify-center gap-2 mb-4">
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-yellow-400 text-red-900' : 'bg-yellow-400/50 text-red-900'}`}>1</div>
    <div className="w-8 h-1 bg-slate-300 rounded-full">
      <div className={`h-full rounded-full transition-all ${step === 2 ? 'w-full bg-yellow-400' : 'w-0'}`} />
    </div>
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-yellow-400 text-red-900' : 'bg-slate-200 text-slate-600'}`}>2</div>
  </div>
)

export default function OrderScreen() {
  const [submitted, setSubmitted] = useState(false)
  const [submittedOrderId, setSubmittedOrderId] = useState('')
  const [submittedTotalFee, setSubmittedTotalFee] = useState(0)
  const [step, setStep] = useState(1)
  const [distanceLoading, setDistanceLoading] = useState(false)
  const [distanceError, setDistanceError] = useState('')

  const normalizePhone = (phone) => {
    if (!phone) return phone
    const digits = phone.replace(/[^0-9]/g, '')
    if (digits.startsWith('0')) return '+233' + digits.slice(1)
    if (digits.startsWith('233')) return '+' + digits
    if (!phone.startsWith('+')) return '+' + digits
    return phone
  }

  const form = useForm({
    defaultValues: {
      sender: '', recipient: '', phone: '', pickup: '', drop: '', item: '', instructions: '', distance: 2.0,
    },
    validators: { onSubmit: orderSchema },
    onSubmit: async ({ value }) => {
      const orderId = `BBA-${Math.floor(1000 + Math.random() * 9000)}-XP`
      const normalizedPhone = normalizePhone(value.phone)
      const pricing = calculateDeliveryFee(Number(value.distance) || 0)

      if (!pricing.allowed) { alert(pricing.reason); return }

      try {
        const { error } = await supabase.from('orders').insert({
          order_id: orderId, sender_name: value.sender, sender_phone: normalizedPhone,
          customer_name: value.recipient, customer_phone: normalizedPhone,
          pickup_address: value.pickup, pickup_zone: value.pickup?.split(',').pop()?.trim() || 'General Accra',
          delivery_address: value.drop, delivery_zone: value.drop?.split(',').pop()?.trim() || 'General Accra',
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

  const updateDistance = useCallback(async (pickup, drop) => {
    if (pickup?.length < 5 || drop?.length < 5) return
    setDistanceLoading(true)
    setDistanceError('')
    const result = await calculateDistance(pickup, drop)
    if (result.allowed) { form.setFieldValue('distance', result.distanceKm) } 
    else { setDistanceError(result.reason) }
    setDistanceLoading(false)
  }, [form])

  useEffect(() => {
    const { pickup, drop } = form.state.values
    const handler = setTimeout(() => { updateDistance(pickup, drop) }, 800)
    return () => clearTimeout(handler)
  }, [form.state.values.pickup, form.state.values.drop, updateDistance])

  const canSubmitStep1 = (values) => values.sender.length >= 2 && values.pickup.length >= 5 && values.phone.length >= 10
  const canSubmitStep2 = (values) => values.recipient.length >= 2 && values.drop.length >= 5 && values.item.length >= 2

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-dvh px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-6 pb-4">
            <div className="mx-auto w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center mb-3 text-red-900">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 className="text-lg font-black text-red-600 uppercase">Request Logged!</h2>
            <p className="text-xs text-muted-foreground mt-1">Waybill: {submittedOrderId}</p>
            <p className="text-sm font-bold text-yellow-400 mt-2">Total: GH₵ {submittedTotalFee.toFixed(2)}</p>
            <Button onClick={() => { setSubmitted(false); form.reset(); setStep(1); }} className="mt-4 bg-yellow-400 hover:bg-yellow-300 text-red-900 font-black uppercase text-sm">Book Another</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-red-600 p-3">
      <div className="pt-3 pb-5 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-white italic uppercase">Beba Delivery</h1>
        <p className="text-yellow-300 font-bold uppercase text-xs mt-1">Rapid Delivery Service</p>
      </div>
      <Card className="w-full max-w-md mx-auto border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-red-600 uppercase italic">{step === 1 ? 'Pickup Details' : 'Delivery Details'}</CardTitle>
          <CardDescription className="text-red-800 font-medium">{step === 1 ? 'Who & where are we picking up from?' : 'Who & where are we delivering to?'}</CardDescription>
        </CardHeader>
        <CardContent>
          <StepIndicator step={step} />
          <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); }} className="space-y-4">
            {step === 1 && (
              <>
                <form.Field name="sender" children={(field) => (
                  <Field><FieldLabel>Sender Name</FieldLabel><Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Your full name" /></Field>
                )} />
                <form.Field name="pickup" children={(field) => (
                  <Field><FieldLabel>Pickup Address</FieldLabel><LocationSearch value={field.state.value} onChange={(val) => field.handleChange(val)} placeholder="Search pickup..." /></Field>
                )} />
                <form.Field name="phone" children={(field) => (
                  <Field><FieldLabel>Contact Number</FieldLabel><Input type="tel" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Mobile Number" /></Field>
                )} />
              </>
            )}
            {step === 2 && (
              <>
                <form.Field name="recipient" children={(field) => (
                  <Field><FieldLabel>Recipient Name</FieldLabel><Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Recipient Full Name" /></Field>
                )} />
                <form.Field name="drop" children={(field) => (
                  <Field><FieldLabel>Destination</FieldLabel><LocationSearch value={field.state.value} onChange={(val) => field.handleChange(val)} placeholder="Search destination..." /></Field>
                )} />
                <form.Field name="item" children={(field) => (
                  <Field><FieldLabel>Cargo Details</FieldLabel><Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="What are you sending?" /></Field>
                )} />
                {distanceLoading && <div className="p-2 text-xs font-bold text-red-800 bg-yellow-50 rounded">Calculating distance...</div>}
                {distanceError && <div className="p-2 text-xs text-red-600 bg-red-50 rounded">{distanceError}</div>}
              </>
            )}
          </form>
        </CardContent>
        <div className="px-6 pb-6 pt-4">
          <form.Subscribe selector={(state) => [state.values, state.isSubmitting]} children={([values, isSubmitting]) => (
            <div className="flex gap-3">
              {step === 2 && <Button type="button" onClick={() => setStep(1)} className="flex-1 bg-slate-200 text-slate-800 font-bold uppercase"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>}
              <Button type="button" disabled={isSubmitting || distanceLoading || !(step === 1 ? canSubmitStep1(values) : canSubmitStep2(values))} onClick={step === 1 ? () => setStep(2) : () => form.handleSubmit()} className="flex-1 bg-yellow-400 text-red-900 font-black uppercase">
                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : step === 1 ? <>Next <ChevronRight className="w-4 h-4 ml-1" /></> : 'Confirm Request'}
              </Button>
            </div>
          )} />
        </div>
      </Card>
    </div>
  )
}