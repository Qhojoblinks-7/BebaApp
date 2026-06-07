import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Compass, Package2 } from 'lucide-react'
import TrackerScreen from './screens/TrackerScreen'
import OrderScreen from './screens/OrderScreen'

export default function App() {
  const [tab, setTab] = useState('track')

  return (
    // Fixed container ensures the app takes full screen space without scroll bounce
    <div className="fixed inset-0 bg-slate-100 flex flex-col">
      <div className="flex-1 overflow-hidden relative">
        <Tabs value={tab} onValueChange={setTab} className="h-full flex flex-col">
          
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto pb-24">
            <TabsContent value="track" className="m-0 h-full">
              <TrackerScreen />
            </TabsContent>
            <TabsContent value="order" className="m-0 h-full">
              <OrderScreen />
            </TabsContent>
          </div>

          {/* Fixed Bottom Navigation */}
          <TabsList className="fixed bottom-0 left-0 right-0 h-[4.5rem] bg-white border-t border-slate-200 shadow-lg grid w-full grid-cols-2 rounded-none z-50 px-4 pt-3 pb-[env(safe-area-inset-bottom)]">
            <TabsTrigger 
              value="track" 
              className="flex flex-col items-center justify-center gap-1 h-full rounded-xl transition-all data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900 data-[state=active]:shadow-md"
            >
              <Compass size={26} className="transition-transform" />
              <span className="text-xs font-bold">Track</span>
            </TabsTrigger>
            <TabsTrigger 
              value="order" 
              className="flex flex-col items-center justify-center gap-1 h-full rounded-xl transition-all data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900 data-[state=active]:shadow-md"
            >
              <Package2 size={26} className="transition-transform" />
              <span className="text-xs font-bold">Request</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}