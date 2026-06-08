import hero20 from "../assets/hero20.png"

export default function LandingScreen({ onOrderClick, onTrackClick }) {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-10 pb-12 flex flex-col items-center text-center lg:text-left lg:flex-row">
        <div className="lg:w-1/2 space-y-5">
          <span className="animate-in fade-in slide-in-from-top-4 duration-500 inline-block bg-yellow-100 text-red-600 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Beba Delivery
          </span>
          <h1 className="animate-in fade-in slide-in-from-top-6 duration-700 text-4xl sm:text-5xl lg:text-7xl font-black text-slate-900 leading-[1.1]">
            We Are Best In <span className="text-red-600">Rapid</span> Delivery
          </h1>
          <p className="animate-in fade-in slide-in-from-top-8 duration-700 delay-100 text-slate-600 text-base sm:text-lg max-w-md mx-auto lg:mx-0">
            Reliable, fast, and secure delivery across Accra. Your items, handled with care.
          </p>

          {/* Dual Action Buttons */}
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 delay-200 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
            <button
              onClick={onOrderClick}
              className="w-full sm:w-auto bg-red-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-red-700 transition active:scale-95 shadow-lg shadow-red-600/20"
            >
              Order Now
            </button>
            <button
              onClick={onTrackClick}
              className="w-full sm:w-auto bg-white border-2 border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-bold hover:bg-slate-50 transition active:scale-95"
            >
              Track Package
            </button>
          </div>
        </div>

        {/* Hero Image */}
        <div className="animate-in fade-in zoom-in duration-700 delay-300 lg:w-1/2 mt-10 lg:mt-0 flex justify-center relative">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-72 h-72 sm:w-150 sm:h-150 bg-red-300 rounded-full animate-pulse opacity-70" />
            <div className="absolute w-60 h-60 sm:w-130 sm:h-130 bg-red-400 rounded-full translate-x-4 translate-y-4" />
            <div className="relative">
              <img
                src={hero20}
                alt="Courier"
                className="relative z-10 w-84 h-84 sm:w-150 sm:h-150 object-contain"
              />
              <div className="absolute inset-x-0 bottom-0 h-15 sm:h-40 bg-gradient-to-t from-white to-transparent z-20" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
