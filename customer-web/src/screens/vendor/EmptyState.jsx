import { AlertCircle, Utensils } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CurrentLocationButton } from './CurrentLocationButton'

export function EmptyState({ onClearFilters }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600">
        <Utensils className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">No vendors found</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">Try adjusting your search or enabling current location to see nearby food vendors.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <CurrentLocationButton onDetected={() => {}} />
        <Button type="button" onClick={onClearFilters} className="h-12 rounded-2xl bg-white font-black uppercase text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
          Clear Filters
        </Button>
      </div>
    </div>
  )
}

export function ErrorState({ onRetry }) {
  return (
    <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-red-600 shadow-sm">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Unable to load vendors</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-6 text-red-700">Check your connection and try again.</p>
      <Button type="button" onClick={onRetry} className="mt-5 h-12 rounded-2xl bg-red-600 px-6 font-black uppercase text-white shadow-lg shadow-red-600/20">
        Retry
      </Button>
    </div>
  )
}
