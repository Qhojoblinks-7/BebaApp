import { cn } from "@/lib/utils"
import { Home, Package, ShoppingBag, Utensils } from "lucide-react"

const TABS = [
  { key: "home", label: "Home", Icon: Home },
  { key: "vendors", label: "Vendors", Icon: Utensils },
  { key: "order", label: "Orders", Icon: ShoppingBag },
  { key: "track", label: "Track", Icon: Package },
]

export function BottomTabBar({ activeTab = "home", onTabChange }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50" aria-label="Primary navigation">
      <div className="border-t border-slate-200 bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-2xl grid-cols-4 gap-1.5">
          {TABS.map((tab) => {
            const isSelected = activeTab === tab.key
            const Icon = tab.Icon

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange?.(tab.key)}
                aria-current={isSelected ? "page" : undefined}
                className={cn(
                  "group flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-200 touch-manipulation",
                  isSelected
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                    : "text-slate-500 active:bg-slate-100"
                )}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {Icon && (
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      isSelected ? "text-white" : "text-slate-500 group-active:scale-90"
                    )}
                  />
                )}
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-wide transition-colors",
                  isSelected ? "text-white" : "text-slate-500"
                )}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
