import { useState, useEffect, useCallback } from 'react'
import TrackerScreen from './screens/TrackerScreen'
import OrderScreen from './screens/OrderScreen'
import LandingScreen from './screens/LandingScreen'

function InstallPrompt({ onInstall }) {
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
    if (outcome === 'accepted') {
      onInstall?.()
    }
    setVisible(false)
    setPromptEvent(null)
  }, [promptEvent, onInstall])

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="rounded-xl border border-border bg-background/95 p-4 shadow-lg backdrop-blur">
        <p className="text-sm font-medium">Install Beba</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add Beba to your home screen for quick access.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleInstall}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Install
          </button>
          <button
            onClick={() => setVisible(false)}
            className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [view, setView] = useState('landing')
  const [lastOrderWaybill, setLastOrderWaybill] = useState(null)
  const [displayView, setDisplayView] = useState('landing')
  const [animating, setAnimating] = useState(false)
  const [progress, setProgress] = useState(0)

  const switchView = useCallback((next) => {
    if (next === view || animating) return
    setAnimating(true)
    setProgress(0)
    setDisplayView(next)
    const start = performance.now()
    const duration = 280
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      setProgress(t)
      if (t < 1) requestAnimationFrame(tick)
      else setAnimating(false)
    }
    requestAnimationFrame(tick)
    setView(next)
  }, [view, animating])

  useEffect(() => {
    if (animating) setDisplayView(view)
  }, [animating, view])

  const currentView = view

  return (
    <div className="fixed inset-0 bg-white">
      <div
        className="absolute inset-0"
        style={{
          opacity: 1 - progress,
          transform: `translateY(${progress * 18}px)`,
          transition: 'none',
          pointerEvents: animating && view !== currentView ? 'none' : 'auto',
        }}
      >
        {currentView === 'landing' && <LandingScreen onOrderClick={() => switchView('order')} onTrackClick={() => switchView('track')} />}
        {currentView === 'track' && <TrackerScreen initialWaybill={lastOrderWaybill} onBookAnother={() => switchView('order')} />}
        {currentView === 'order' && <OrderScreen onOrderSuccess={(orderId) => { setLastOrderWaybill(orderId); switchView('track') }} onBackToLanding={() => switchView('landing')} />}
      </div>
      <div
        className="absolute inset-0"
        style={{
          opacity: progress,
          transform: `translateY(${(1 - progress) * -18}px)`,
          transition: 'none',
          pointerEvents: progress >= 1 ? 'auto' : 'none',
        }}
      >
        {view === 'landing' && <LandingScreen onOrderClick={() => switchView('order')} onTrackClick={() => switchView('track')} />}
        {view === 'track' && <TrackerScreen initialWaybill={lastOrderWaybill} onBookAnother={() => switchView('order')} />}
        {view === 'order' && <OrderScreen onOrderSuccess={(orderId) => { setLastOrderWaybill(orderId); switchView('track') }} onBackToLanding={() => switchView('landing')} />}
      </div>
      <InstallPrompt />
    </div>
  )
}
