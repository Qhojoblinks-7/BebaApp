import { useState } from 'react'
import TrackerScreen from './screens/TrackerScreen'
import OrderScreen from './screens/OrderScreen'
import LandingScreen from './screens/LandingScreen'

export default function App() {
  const [view, setView] = useState('landing')
  const [lastOrderWaybill, setLastOrderWaybill] = useState('')

  return (
    <div className="fixed inset-0 bg-white">
      {view === 'landing' && <LandingScreen onOrderClick={() => setView('order')} onTrackClick={() => setView('track')} />}
      {view === 'track' && <TrackerScreen initialWaybill={lastOrderWaybill} onBookAnother={() => setView('order')} />}
      {view === 'order' && <OrderScreen onOrderSuccess={(orderId) => { setLastOrderWaybill(orderId); setView('track') }} onBackToLanding={() => setView('landing')} />}
    </div>
  )
}
