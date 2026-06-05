import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { calculateDeliveryFee } from '../lib/pricing'
import { calculateDistance } from '../lib/distanceService'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import LocationSearch from '@/components/LocationSearch'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const orderSchema = z.object({
  sender: z.string().min(2, 'Sender name must be at least 2 characters'),
  recipient: z.string().min(2, 'Recipient name must be at least 2 characters'),
  phone: z.string().min(10, 'Enter a valid phone number'),
  pickup: z.string().min(5, 'Pickup address is required'),
  drop: z.string().min(5, 'Destination address is required'),
  item: z.string().min(2, 'Item description is required'),
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
      sender: '',
      recipient: '',
      phone: '',
      pickup: '',
      drop: '',
      item: '',
      distance: 2.0,
    },
    validators: {
      onSubmit: orderSchema,
    },
    onSubmit: async ({ value }) => {
      const orderId = `BBA-${Math.floor(1000 + Math.random() * 9000)}-XP`
      const normalizedPhone = normalizePhone(value.phone)
      const pricing = calculateDeliveryFee(Number(value.distance) || 0)

      if (!pricing.allowed) {
        alert(pricing.reason)
        return
      }

      try {
        const { error } = await supabase.from('orders').insert({
          order_id: orderId,
          sender_name: value.sender,
          sender_phone: normalizedPhone,
          customer_name: value.recipient,
          customer_phone: normalizedPhone,
          pickup_address: value.pickup,
          pickup_zone: value.pickup?.split(',').pop()?.trim() || 'General Accra',
          delivery_address: value.drop,
          delivery_zone: value.drop?.split(',').pop()?.trim() || 'General Accra',
          item_description: value.item,
          status: 'pending',
          delivery_fee: pricing.breakdown.totalFee,
          base_price: pricing.breakdown.basePrice,
          distance_fee: pricing.breakdown.distanceFee,
          surge_fee: pricing.breakdown.surgeFee,
        })

        if (!error) {
          try {
            await supabase.functions.invoke('whatsapp-notify', {
              body: { record: { order_id: orderId, customer_name: value.recipient, customer_phone: normalizedPhone, status: 'pending', id: null } }
            })
          } catch (fnErr) { console.error(fnErr) }
          setSubmittedTotalFee(pricing.breakdown.totalFee)
          setSubmittedOrderId(orderId)
          setSubmitted(true)
        } else {
          alert('Failed to create order: ' + error.message)
        }
      } catch {
        alert('Network error. Check connection and try again.')
      }
    },
  })

  useEffect(() => {
    const pickup = form.state.values.pickup
    const drop = form.state.values.drop
    if (pickup && drop && pickup.length >= 5 && drop.length >= 5) {
      const calculateAndSetDistance = async () => {
        setDistanceLoading(true)
        setDistanceError('')
        const result = await calculateDistance(pickup, drop)
        if (result.allowed) {
          form.setFieldValue('distance', result.distanceKm)
        } else {
          setDistanceError(result.reason)
        }
        setDistanceLoading(false)
      }
      calculateAndSetDistance()
    }
  }, [form.state.values.pickup, form.state.values.drop, form.setFieldValue])

  const canSubmitStep1 = (values) => {
    return values.sender.length >= 2 && 
           values.pickup.length >= 5 && 
           values.phone.length >= 10
  }

  const canSubmitStep2 = (values) => {
    return values.recipient.length >= 2 && 
           values.drop.length >= 5 && 
           values.item.length >= 2
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-dvh px-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-6 pb-4">
            <div className="mx-auto w-14 h-14 bg-yellow-400 rounded-full flex items-center justify-center mb-3 text-red-900">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-lg font-black text-red-600 uppercase tracking-tight">Request Logged!</h2>
            <p className="text-xs text-muted-foreground mt-1">Waybill: {submittedOrderId}</p>
            <p className="text-sm font-bold text-yellow-400 mt-2">Total: GH₵ {submittedTotalFee.toFixed(2)}</p>
            <Button onClick={() => { setSubmitted(false); form.reset(); setStep(1); }} className="mt-4 bg-yellow-400 hover:bg-yellow-300 text-red-900 font-black uppercase text-sm active:scale-95">
              Book Another
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-red-600 p-3">
      <div className="pt-3 pb-5 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-white italic uppercase">Beba Fleet</h1>
        <p className="text-yellow-300 font-bold uppercase text-xs mt-1">Rapid Delivery Service</p>
      </div>

      <Card className="w-full max-w-md mx-auto border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-red-600 uppercase italic">
            {step === 1 ? 'Pickup Details' : 'Delivery Details'}
          </CardTitle>
          <CardDescription className="text-red-800 font-medium">
            {step === 1 ? 'Who & where are we picking up from?' : 'Who & where are we delivering to?'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StepIndicator step={step} />

          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            className="space-y-3 sm:space-y-4"
          >
            {step === 1 && (
              <form.Field
                name="sender"
                validators={{
                  onChange: ({ value }) => value.length < 2 ? 'Sender name must be at least 2 characters' : undefined,
                }}
                children={(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="sender">Sender Name</FieldLabel>
                    <Input
                      id="sender"
                      name="sender"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Your full name"
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              />
            )}

            {step === 1 && (
              <form.Field
                name="pickup"
                validators={{
                  onChange: ({ value }) => value.length < 5 ? 'Pickup address is required' : undefined,
                }}
                children={(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="pickup">Pickup Address</FieldLabel>
                    <LocationSearch
                      value={field.state.value}
                      onChange={(val) => field.handleChange(val)}
                      placeholder="Search pickup location in Accra..."
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              />
            )}

            {step === 1 && (
              <form.Field
                name="phone"
                validators={{
                  onChange: ({ value }) => value.length < 10 ? 'Enter a valid phone number' : undefined,
                }}
                children={(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="phone">Contact Number</FieldLabel>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Mobile Number"
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              />
            )}

            {step === 2 && (
              <form.Field
                name="recipient"
                validators={{
                  onChange: ({ value }) => value.length < 2 ? 'Recipient name must be at least 2 characters' : undefined,
                }}
                children={(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="recipient">Recipient Name</FieldLabel>
                    <Input
                      id="recipient"
                      name="recipient"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="Recipient Full Name"
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              />
            )}

            {step === 2 && (
              <form.Field
                name="drop"
                validators={{
                  onChange: ({ value }) => value.length < 5 ? 'Destination address is required' : undefined,
                }}
                children={(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="drop">Destination</FieldLabel>
                    <LocationSearch
                      value={field.state.value}
                      onChange={(val) => field.handleChange(val)}
                      placeholder="Search delivery location in Accra..."
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              />
            )}

            {step === 2 && (
              <form.Field
                name="item"
                validators={{
                  onChange: ({ value }) => value.length < 2 ? 'Item description is required' : undefined,
                }}
                children={(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor="item">Cargo Details</FieldLabel>
                    <Input
                      id="item"
                      name="item"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="What are you sending?"
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              />
            )}

            {step === 2 && (
              <form.Subscribe
                selector={(state) => state.values.distance}
                children={(distance) => {
                  const pricing = calculateDeliveryFee(Number(distance) || 0)
                  if (distanceLoading) {
                    return (
                      <div className="mb-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-xs font-bold text-red-800 uppercase">Calculating Distance...</p>
                      </div>
                    )
                  }
                  if (distanceError) {
                    return (
                      <div className="mb-3 p-2 bg-red-50 rounded-lg border border-red-200">
                        <p className="text-xs text-red-600 mb-2">{distanceError}</p>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="8"
                          value={distance}
                          onChange={(e) => form.setFieldValue('distance', parseFloat(e.target.value) || 0)}
                          placeholder="Enter distance manually (km)"
                          className="h-10 text-sm"
                        />
                      </div>
                    )
                  }
                  if (pricing.allowed && Number(distance) > 0) {
                    return (
                      <div className="mb-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <p className="text-xs font-bold text-red-800 uppercase">Estimated Fee</p>
                        <p className="text-lg font-black text-red-600">GH₵ {pricing.breakdown.totalFee.toFixed(2)}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          Base: GH₵ {pricing.breakdown.basePrice.toFixed(2)} + 
                          Distance: GH₵ {pricing.breakdown.distanceFee.toFixed(2)} + 
                          Surge: GH₵ {pricing.breakdown.surgeFee.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Distance: {distance} km (auto-calculated)</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
            )}
          </form>
        </CardContent>
        <div className="px-6 pb-6 pt-4">
          <form.Subscribe
            selector={(state) => [state.values, state.isSubmitting]}
            children={([values, isSubmitting]) => {
              const isStep1Valid = canSubmitStep1(values)
              const isStep2Valid = canSubmitStep2(values)
              const canProceed = step === 1 ? isStep1Valid : isStep2Valid
              
              return (
                <div className="flex gap-3">
                  {step === 2 && (
                    <Button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 h-12 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold uppercase active:scale-95"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    type="button"
                    disabled={isSubmitting || !canProceed}
                    onClick={step === 1 ? () => setStep(2) : () => form.handleSubmit()}
                    className={`${step === 2 ? 'flex-1' : 'w-full'} h-12 bg-yellow-400 hover:bg-yellow-300 text-red-900 font-black uppercase italic active:scale-95`}
                  >
                    {step === 1 ? (
                      <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
                    ) : isSubmitting ? 'Processing...' : 'Confirm Request'}
                  </Button>
                </div>
              )
            }}
          />
        </div>
      </Card>
    </div>
  )
}