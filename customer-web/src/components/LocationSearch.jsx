import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';

export default function LocationSearch({ value, onChange, placeholder, className, id, ...props }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [portalRect, setPortalRect] = useState(null);

  const timeoutRef = useRef();
  const wrapperRef = useRef();
  const inputRef = useRef(null);

  const updatePortalRect = useCallback(() => {
    if (!inputRef.current) return;

    const rect = inputRef.current.getBoundingClientRect();
    setPortalRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    updatePortalRect();
  }, [updatePortalRect]);

  useEffect(() => {
    if (!query || query.length < 3) {
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const controller = new AbortController();
    
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=GH&format=json&limit=5&addressdetails=1`,
          {
            signal: controller.signal,
            headers: { 'User-Agent': 'BebaApp/1.0 (contact@beba.app)' },
          }
        );
        if (!response.ok) throw new Error('Failed to fetch locations');
        const data = await response.json();
        setResults(data || []);
        setShowResults(true);
        setActiveIndex(-1);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Location search error:', err);
          setError('Could not load locations.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timeoutRef.current);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const dropdown = document.getElementById('location-search-portal');
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target) &&
        (!dropdown || !dropdown.contains(e.target))
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCoordsFromItem = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { lat, lon };
    }
    return null;
  };

  const handleSelect = (item) => {
    const displayName = (item.display_name || '').trim();
    const coords = getCoordsFromItem(item);
    
    setQuery(displayName);
    setResults([]);
    setShowResults(false);
    setActiveIndex(-1);
    
    onChange?.(displayName, coords); 
  };

  const handleKeyDown = (e) => {
    if (!showResults || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const getPortalStyle = () => {
    if (!portalRect) return {};

    return {
      position: 'fixed',
      top: portalRect.top,
      left: portalRect.left,
      width: portalRect.width,
      zIndex: 9999,
    };
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        id={id}
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => { 
          setQuery(e.target.value); 
          onChange?.(e.target.value); 
        }}
        onFocus={() => {
          updatePortalRect();
          query.length >= 3 && setShowResults(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={`h-14 rounded-2xl border-slate-200 bg-slate-50 pr-24 ${className || ''}`}
        {...props}
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider font-bold text-slate-400 animate-pulse pointer-events-none z-10">
          Searching...
        </div>
      )}
      
      {showResults && (results.length > 0 || error) && typeof document !== 'undefined' && createPortal(
        <div
          id="location-search-portal"
          className="bg-white border border-slate-200 rounded-b-2xl shadow-xl max-h-60 overflow-y-auto unique-scrollbar -mt-1"
          style={getPortalStyle()}
        >
          {error ? (
            <div className="px-4 py-3 text-sm text-red-500">{error}</div>
          ) : (
            results.map((item, idx) => (
              <button
                key={`${item.place_id}-${idx}`}
                type="button"
                className={`w-full px-4 py-3 text-left border-b border-slate-100 last:border-b-0 transition-colors block ${
                  idx === activeIndex ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                }`}
                onClick={() => handleSelect(item)}
              >
                <div className="font-bold text-sm text-slate-800">{item.display_name.split(',')[0]}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{item.display_name}</div>
              </button>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
