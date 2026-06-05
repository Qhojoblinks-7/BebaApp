import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Compass, Package2 } from 'lucide-react'
import TrackerScreen from './screens/TrackerScreen'
import OrderScreen from './screens/OrderScreen'

export default function App() {
  const [tab, setTab] = useState('track')

  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col">
      <div className="flex-1 flex flex-col max-w-lg w-full mx-auto px-3 pb-24">
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col">
          <TabsContent value="track" className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch">
            <TrackerScreen />
          </TabsContent>
          <TabsContent value="order" className="flex-1 overflow-y-auto -webkit-overflow-scrolling-touch">
            <OrderScreen />
          </TabsContent>

          {/* Mobile-style bottom navigation bar */}
          <TabsList className="fixed bottom-0 left-0 right-0 h-[4.5rem] bg-white border-t border-slate-200 shadow-lg grid w-full grid-cols-2 rounded-none z-50 px-4 pt-3 pb-[env(safe-area-inset-bottom)]">
            <TabsTrigger 
              value="track" 
              className="flex flex-col items-center justify-center gap-1 h-full rounded-xl transition-all data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900 data-[state=active]:shadow-md"
            >
              <Compass size={26} className="data-[state=active]:scale-105 transition-transform" />
              <span className="text-xs font-bold">Track</span>
            </TabsTrigger>
            <TabsTrigger 
              value="order" 
              className="flex flex-col items-center justify-center gap-1 h-full rounded-xl transition-all data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900 data-[state=active]:shadow-md"
            >
              <Package2 size={26} className="data-[state=active]:scale-105 transition-transform" />
              <span className="text-xs font-bold">Request</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}