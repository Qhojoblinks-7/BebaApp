import { Button } from '@/components/ui/button'
import { AlertCircle, Loader2, Navigation } from 'lucide-react'
import { useCurrentLocation } from './useCurrentLocation'

export function CurrentLocationButton({ onDetected, className = '' }) {
  const { status, error, detect } = useCurrentLocation(onDetected)
  const isLoading = status === 'loading'
  const isError = status === 'error'
  const isSuccess = status === 'success'

  const label = isLoading
    ? 'Detecting location...'
    : isSuccess
      ? 'Location detected'
      : isError
        ? 'Could not detect location. Please enter manually.'
        : 'Use Current Location'

  return (
    <div className={className}>
      <Button
        type="button"
        onClick={detect}
        disabled={isLoading}
        className={`h-12 min-h-12 w-full rounded-2xl px-4 font-black uppercase tracking-wide shadow-sm transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-600/20 ${isLoading ? 'bg-slate-900 text-white' : isSuccess ? 'bg-emerald-600 text-white' : isError ? 'bg-red-600 text-white' : 'bg-white text-red-700 ring-1 ring-red-600/20 hover:bg-red-50'}`}
      >
        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : isError ? <AlertCircle className="mr-2 h-5 w-5" /> : <Navigation className="mr-2 h-5 w-5" />}
        {label}
      </Button>
      {error && <p className="mt-2 text-xs font-bold leading-5 text-red-600" aria-live="polite">{error}</p>}
    </div>
  )
}
