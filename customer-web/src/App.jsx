import { useState, useEffect, useCallback } from 'react'
import TrackerScreen from './screens/TrackerScreen'
import OrderScreen from './screens/OrderScreen'
import LandingScreen from './screens/LandingScreen'

// --- PWA INSTALL PROMPT ---
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
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md max-w-sm mx-auto">
        <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Install Beba App</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Add Beba to your home screen for rapid logistics booking and instant tracking.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-red-700 transition-colors shadow-md shadow-red-600/10 active:scale-95 transform"
          >
            Install
          </button>
          <button
            onClick={() => setVisible(false)}
            className="flex-1 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-200 transition-colors active:scale-95 transform"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}

// --- MAIN ROUTER CONTROLLER ---
export default function App() {
  const [view, setView] = useState('landing')
  const [lastOrderWaybill, setLastOrderWaybill] = useState(null)

  return (
    <div className="fixed inset-0 bg-slate-50 overflow-hidden antialiased select-none">
      
      {/* Single Viewport Mounting Plane: 
        Using native CSS entry keyframes eliminates the possibility of layout ghosting.
      */}
      <div className="relative w-full h-full">
        
        {view === 'landing' && (
          <div className="absolute inset-0 w-full h-full animate-in fade-in slide-in-from-bottom-3 duration-300 ease-out">
            <LandingScreen 
              onOrderClick={() => setView('order')} 
              onTrackClick={() => setView('track')} 
            />
          </div>
        )}
        
        {view === 'track' && (
          <div className="absolute inset-0 w-full h-full animate-in fade-in slide-in-from-bottom-3 duration-300 ease-out">
            <TrackerScreen 
              initialWaybill={lastOrderWaybill} 
              onBookAnother={() => setView('order')} 
              onBackToLanding={() => setView('landing')}
            />
          </div>
        )}
        
        {view === 'order' && (
          <div className="absolute inset-0 w-full h-full animate-in fade-in slide-in-from-bottom-3 duration-300 ease-out">
            <OrderScreen 
              onOrderSuccess={(orderId) => { 
                setLastOrderWaybill(orderId)
                setView('track') 
              }} 
              onBackToLanding={() => setView('landing')} 
            />
          </div>
        )}

      </div>

      <InstallPrompt />
    </div>
  )
}