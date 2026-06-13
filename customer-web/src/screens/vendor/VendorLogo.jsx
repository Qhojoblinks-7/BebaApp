import { getInitials } from './vendorData'

export function VendorLogo({ name }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 via-red-50 to-slate-100 text-5xl font-black tracking-tight text-red-700">
      {getInitials(name)}
    </div>
  )
}
