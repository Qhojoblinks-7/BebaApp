import React from 'react';
import { MapPin, Box, Bike, Users } from 'lucide-react';

const STATUS_CONFIG = {
  online:    { label: 'Rider Available',     color: 'bg-emerald-500', textColor: 'text-emerald-700' },
  in_class:  { label: 'Rider In Class',       color: 'bg-amber-500',  textColor: 'text-amber-700' },
  offline:   { label: 'Rider Offline',        color: 'bg-slate-400',  textColor: 'text-slate-600' },
  on_route:  { label: 'Rider On Route',       color: 'bg-blue-500',   textColor: 'text-blue-700' },
};

export default function TrackingCard({ waybill, location, status, riderStatus, riderAssigned }) {
  const conf = riderStatus ? STATUS_CONFIG[riderStatus] : null;

  return (
    <div className="w-full max-w-sm bg-[#FBBF24] rounded-3xl p-6 shadow-xl relative overflow-hidden animate-slide-up">
      {/* Decorative 'Fast' badge */}
      <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-[10px] font-black uppercase text-slate-900 rotate-3">
        Fast
      </div>

      <div className="space-y-6">
        {/* Tracking ID */}
        <div>
          <p className="text-[10px] font-bold text-amber-950/70 uppercase tracking-widest">Current Tracking</p>
          <h2 className="text-xl font-black text-slate-950 italic">#{waybill}</h2>
        </div>

        {/* Rider Status */}
        {conf && (
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${conf.color} bg-opacity-20`}>
            <span className={`text-xs font-bold uppercase tracking-wide ${conf.textColor}`}>
              {conf.label}
            </span>
          </div>
        )}
        {riderStatus === null && !riderAssigned && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-300/25">
            <Users className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
              Awaiting Rider Assignment
            </span>
          </div>
        )}

        {/* Location */}
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-slate-950" />
          <div>
            <p className="text-[10px] font-bold text-amber-950/70 uppercase">Current Location</p>
            <p className="text-sm font-black text-slate-950">{location}</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <div className="bg-white/50 p-2 rounded-full">
            <Box className="w-4 h-4 text-slate-950" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-amber-950/70 uppercase">Status</p>
            <p className="text-sm font-black text-slate-950">{status}</p>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="relative w-full h-2 bg-amber-950/10 rounded-full mt-4">
          <div className="absolute h-full w-2/3 bg-slate-950 rounded-full" />
          <div className="absolute top-1/2 -translate-y-1/2 left-2/3 -ml-3 w-7 h-7 bg-slate-950 rounded-full flex items-center justify-center border-2 border-[#FBBF24]">
            <Bike className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}