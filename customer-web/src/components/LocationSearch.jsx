import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';

export default function LocationSearch({ value, onChange, placeholder }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1); // For keyboard navigation
  
  // Tracks if the query change came from explicit user typing
  const [shouldSearch, setShouldSearch] = useState(false);
  const isSelectingRef = useRef(false);
  
  const timeoutRef = useRef();
  const wrapperRef = useRef();

  const STADIA_API_KEY = import.meta.env.VITE_STADIA_API_KEY || import.meta.env.REACT_APP_STADIA_API_KEY;

  // 1. Safe External State Synchronization
  useEffect(() => {
    if (isSelectingRef.current) {
      if (value === query) {
        console.log('[LocationSearch] shield lowered: parent caught up')
        isSelectingRef.current = false;
      } else {
        console.log('[LocationSearch] shield held: parent not caught up yet')
      }
      return; 
    }

    if (value !== undefined && value !== query) {
      console.log('[LocationSearch] syncing parent value:', value)
      setQuery(value || '');
      setShouldSearch(false); 
    }
  }, [value, query]);

  // 2. Debounced API Autocomplete Fetching with AbortController
  useEffect(() => {
    if (!shouldSearch || !query || query.length < 3) {
      setResults([]);
      return;
    }

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const controller = new AbortController();
    
  timeoutRef.current = setTimeout(async () => {
    console.log('[LocationSearch] fetching autocomplete for:', query)
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://api.stadiamaps.com/geocoding/v2/autocomplete?text=${encodeURIComponent(query)}&country=GH&api_key=${STADIA_API_KEY}`,
        { signal: controller.signal }
      );
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      
      console.log('[LocationSearch] autocomplete results:', data.features?.length || 0, 'items')
      setResults(data.features || []);
      setShowResults(true);
      setActiveIndex(-1); // Reset keyboard focus index on new results
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Location search error:', err);
        setError('Could not load locations.');
      }
    } finally {
      console.log('[LocationSearch] loading done, aborted:', controller.signal.aborted)
      if (!controller.signal.aborted) setLoading(false);
    }
  }, 400); // Slightly faster debounce for snappier UX

    return () => {
      clearTimeout(timeoutRef.current);
      controller.abort();
    };
  }, [query, shouldSearch, STADIA_API_KEY]);

  // 3. Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item) => {
    const displayName = (item.properties?.label || item.properties?.name || '').trim();
    console.log('[LocationSearch] selected:', { gid: item.properties?.gid, name: item.properties?.name, label: item.properties?.label, displayName })
    
    isSelectingRef.current = true;
    setQuery(displayName);
    setShouldSearch(false);
    setResults([]);
    setShowResults(false);
    setActiveIndex(-1);
    
    onChange?.(displayName); 
  };

  // 4. Keyboard Interaction Handler
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

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        type="text"
        value={query}
        onChange={(e) => { 
          setQuery(e.target.value); 
          setShouldSearch(true);
          onChange?.(e.target.value); 
        }}
        onFocus={() => { console.log('[LocationSearch] input focused, query length:', query.length); query.length >= 3 && setShowResults(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="rounded-xl pr-24"
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wider font-bold text-slate-400 animate-pulse pointer-events-none z-10">
          Searching...
        </div>
      )}
      
      {showResults && (results.length > 0 || error) && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto unique-scrollbar">
          {error ? (
            <div className="px-4 py-3 text-sm text-red-500">{error}</div>
          ) : (
            results.map((item, idx) => (
              <button
                key={`${item.properties?.gid}-${idx}`}
                type="button"
                className={`w-full px-4 py-3 text-left border-b border-slate-100 last:border-b-0 transition-colors block ${
                  idx === activeIndex ? 'bg-slate-50' : 'hover:bg-slate-50/50'
                }`}
                onClick={() => handleSelect(item)}
              >
                <div className="font-bold text-sm text-slate-800">{item.properties?.name}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{item.properties?.label}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}