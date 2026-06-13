import { Bell, CheckCircle2, Clock, MapPin, Navigation, Package, ShieldCheck, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import hero20 from '../assets/hero20.png'

const quickActions = [
  {
    label: 'Order Now',
    description: 'Book a delivery in minutes',
    icon: Package,
    onClickKey: 'onOrderClick',
  },
  {
    label: 'Track Package',
    description: 'Follow your parcel live',
    icon: Navigation,
    onClickKey: 'onTrackClick',
  },
]

const trustCards = [
  {
    icon: ShieldCheck,
    title: 'Secure handover',
    text: 'PIN verification per order',
  },
  {
    icon: Clock,
    title: 'Fast dispatch',
    text: 'Live status updates',
  },
]

const activityItems = [
  {
    title: 'Latest delivery',
    meta: 'Awaiting rider assignment',
    icon: Truck,
  },
  {
    title: 'Estimated pickup',
    meta: 'Depends on rider availability',
    icon: MapPin,
  },
  {
    title: 'Payment',
    meta: 'Cash or app-managed fee',
    icon: CheckCircle2,
  },
]

export default function HomeScreen({ onOrderClick, onTrackClick }) {
  return (
    <div className="min-h-dvh bg-slate-50 px-4 pb-12 pt-6 antialiased selection:bg-red-500 selection:text-white">
      <div className="mx-auto max-w-4xl space-y-6">
        
        {/* SECTION 1: HERO & BRAND HEADER */}
        <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-950 to-red-950 p-6 shadow-xl shadow-slate-950/10 md:p-8">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,0.15),transparent_70%)]" />
          
          <div className="grid gap-6 md:grid-cols-12 md:items-center">
            <div className="relative z-10 md:col-span-7">
              <div className="flex items-center justify-between md:block">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Beba Logistics Network</p>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 shadow-md transition hover:text-white active:scale-95 md:hidden"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>
              </div>
              
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                Rapid delivery, <span className="text-red-500">Beba fast.</span>
              </h1>
              <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-slate-400">
                Reliable, fast, and secure delivery across Accra. Your items are handled with care from pickup to handover.
              </p>
            </div>
            
            {/* Visual Hero block contextually embedded */}
            <div className="relative hidden items-center justify-center md:col-span-5 md:flex">
              <div className="absolute inset-0 rounded-full bg-red-500/10 blur-3xl" />
              <img
                src={hero20}
                alt="Beba courier delivery status visual"
                className="relative h-44 w-full object-contain lg:h-52"
              />
            </div>
          </div>
        </header>

        {/* SECTION 2: CORE DASHBOARD WORKSPACE */}
        <div className="grid gap-6 md:grid-cols-5">
          
          {/* PRIMARY QUICK ACTIONS (3/5 width on desktop) */}
          <section className="flex flex-col justify-between gap-3 md:col-span-3">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 md:h-full">
              {quickActions.map((action) => {
                const Icon = action.icon
                const handleClick = action.onClickKey === 'onOrderClick' ? onOrderClick : onTrackClick

                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={handleClick}
                    className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md active:scale-[0.99] md:p-6"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white shadow-md shadow-red-600/10 transition group-hover:scale-105">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-black tracking-tight text-slate-900">{action.label}</h3>
                        <p className="mt-1 text-xs font-medium text-slate-500 leading-normal">{action.description}</p>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex items-center text-xs font-bold text-red-600 opacity-0 transition-opacity group-hover:opacity-100 sm:hidden md:flex">
                      Get started &rarr;
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* SYSTEM ACTIVITY / MONITORING (2/5 width on desktop) */}
          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Live Logistics</p>
                <h2 className="text-base font-black tracking-tight text-slate-900">Delivery snapshot</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-xl border-slate-200 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-50 hover:bg-slate-100"
                onClick={onTrackClick}
              >
                Track
              </Button>
            </div>

            <div className="mt-4 space-y-2.5">
              {activityItems.map((item) => {
                const Icon = item.icon

                return (
                  <div key={item.title} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 transition hover:bg-slate-50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm border border-slate-100">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-900">{item.title}</p>
                      <p className="truncate text-[11px] font-medium text-slate-400">{item.meta}</p>
                    </div>
                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                      Live
                    </span>
                  </div>
                )
              })}
            </div>
          </section>

        </div>

        {/* SECTION 3: BOTTOM HORIZONTAL TRUST MATRIX */}
        <section className="grid gap-3 sm:grid-cols-2">
          {trustCards.map((card) => {
            const Icon = card.icon

            return (
              <div 
                key={card.title} 
                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-black text-slate-900">{card.title}</h2>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{card.text}</p>
                </div>
              </div>
            )
          })}
        </section>

      </div>
    </div>
  )
}