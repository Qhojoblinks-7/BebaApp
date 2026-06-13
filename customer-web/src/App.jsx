import { useState, useEffect, useCallback } from 'react'
import TrackerScreen from './screens/TrackerScreen'
import OrderScreen from './screens/OrderScreen'
import HomeScreen from './screens/HomeScreen'
import LandingScreen from './screens/LandingScreen'
import VendorScreen from './screens/VendorScreen'
import { BottomTabBar } from './components/ui/bottom-tab-bar'

function InstallPrompt() {
  const [visible, setVisible] = useState(false)
  const [promptEvent, setPromptEvent] = useState(null)

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault()
      setPromptEvent(event)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = useCallback(async () => {
    if (!promptEvent) return

    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice

    if (outcome === 'accepted') setVisible(false)
    setPromptEvent(null)
  }, [promptEvent])

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-white">
            <span className="text-lg font-black">B</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900">Install Beba App</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Add Beba to your home screen for fast booking, instant tracking, and native-like delivery updates.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleInstall}
            className="flex-1 rounded-2xl bg-red-600 px-4 py-3 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-red-600/20 transition active:scale-95"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-xs font-black uppercase tracking-wide text-slate-600 transition active:scale-95"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [activeTab, setActiveTab] = useState('home')
  const [lastOrderWaybill, setLastOrderWaybill] = useState(null)

  useEffect(() => {
    if (!showSplash) return

    const timer = setTimeout(() => setShowSplash(false), 1600)
    return () => clearTimeout(timer)
  }, [showSplash])

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onOrderClick={() => setActiveTab('order')} onTrackClick={() => setActiveTab('track')} />
      case 'vendors':
        return <VendorScreen onBookingSuccess={(orderId) => setLastOrderWaybill(orderId)} onTrackBooking={() => setActiveTab('track')} />
      case 'order':
        return <OrderScreen onOrderSuccess={(orderId) => { setLastOrderWaybill(orderId); setActiveTab('track') }} />
      case 'track':
        return <TrackerScreen initialWaybill={lastOrderWaybill} onBookAnother={() => setActiveTab('order')} />
      default:
        return <HomeScreen onOrderClick={() => setActiveTab('order')} onTrackClick={() => setActiveTab('track')} />
    }
  }

  return (
    // 🌟 OPTIMIZED CONTAINER LAYER: Clean global page context alignment instead of absolute locking layout bounds
    <div className="min-h-dvh bg-[#f6f7fb] antialiased selection:bg-red-500 selection:text-white">
      
      {showSplash ? (
        <div className="fixed inset-0 z-50 bg-[#f6f7fb]">
          <LandingScreen />
        </div>
      ) : (
        // 🌟 NATURAL SCROLL LAYOUT PORT: Removed locked viewport constraints. Padding accounts perfectly for the float layout drawer.
        <main className="mx-auto max-w-2xl px-1 pb-[calc(12rem+env(safe-area-inset-bottom))] pt-2 animate-in fade-in duration-300">
          {renderScreen()}
        </main>
      )}

      {/* FIXED VISUAL SYSTEM OVERLAYS */}
      {!showSplash && (
        <>
          <BottomTabBar activeTab={activeTab} onTabChange={setActiveTab} />
          <InstallPrompt />
        </>
      )}
    </div>
  )
}