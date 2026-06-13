import { Bike, Box, CheckCircle2, Clock, MapPin, PackageCheck, ShieldCheck, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const STATUS_CONFIG = {
  online: { label: 'Rider Available', color: 'bg-emerald-500', textColor: 'text-emerald-700', icon: Users },
  in_class: { label: 'Rider In Class', color: 'bg-amber-500', textColor: 'text-amber-700', icon: Clock },
  offline: { label: 'Rider Offline', color: 'bg-slate-400', textColor: 'text-slate-600', icon: Users },
  on_route: { label: 'Rider On Route', color: 'bg-blue-500', textColor: 'text-blue-700', icon: Bike },
}

function getProgress(status) {
  const value = String(status || '').toLowerCase()

  if (value.includes('delivered')) return 100
  if (value.includes('in transit') || value.includes('picked')) return 70
  if (value.includes('rider') || value.includes('confirmed')) return 45
  if (value.includes('request')) return 20

  return 25
}

export default function TrackingCard({ waybill, location, status, riderStatus, riderAssigned }) {
  const conf = riderStatus ? STATUS_CONFIG[riderStatus] : null
  const progress = getProgress(status)
  const StatusIcon = progress === 100 ? CheckCircle2 : progress >= 70 ? Bike : PackageCheck

  return (
    <Card className="mx-auto max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300 overflow-hidden rounded-[2rem] border-0 bg-white shadow-xl shadow-slate-900/10">
      <div className="relative overflow-hidden bg-gradient-to-br from-amber-300 via-amber-200 to-yellow-100 px-5 pb-6 pt-5">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/40 blur-2xl" />
        <div className="absolute -left-8 bottom-4 h-28 w-28 rounded-full bg-red-200/40 blur-2xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-950/70">Current Tracking</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">#{waybill}</h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-slate-950 shadow-sm">
            <StatusIcon className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-white/60 p-3 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-950" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wide text-amber-950/70">Current Location</p>
              <p className="mt-0.5 truncate text-sm font-black text-slate-950">{location}</p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Order Status</p>
            <p className="mt-1 text-sm font-black text-slate-950">{status}</p>
          </div>
          {conf && (
            <div className={`inline-flex items-center gap-1.5 rounded-full ${conf.color} bg-opacity-20 px-3 py-2`}>
              {conf.icon && <conf.icon className={`h-3.5 w-3.5 ${conf.textColor}`} />}
              <span className={`text-[10px] font-black uppercase tracking-wide ${conf.textColor}`}>
                {conf.label}
              </span>
            </div>
          )}
          {riderStatus === null && !riderAssigned && (
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2">
              <Users className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-600">
                Awaiting Rider
              </span>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-red-600 shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-950">Secure delivery</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">Use the delivery PIN at handover</p>
              </div>
            </div>
            <Box className="h-5 w-5 text-slate-400" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-950 transition-all duration-500 ease-ios"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wide text-slate-400">
            <span>Requested</span>
            <span>Picked up</span>
            <span>In transit</span>
            <span>Delivered</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
