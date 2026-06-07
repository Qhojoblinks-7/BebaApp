import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel } from '@/components/ui/field';

export default function LocationSearch({ value, onChange, placeholder }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const timeoutRef = useRef();
  const wrapperRef = useRef();

  // FIX: Sync internal state if parent 'value' changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }

    // Debounce logic
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=gh`
        );
        const data = await response.json();
        setResults(data || []);
        setShowResults(true);
      } catch (error) {
        console.error('Location search error:', error);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutRef.current);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange?.(val);
  };

  const handleSelect = (item) => {
    const displayName = item.display_name || '';
    setQuery(displayName);
    setShowResults(false);
    onChange?.(displayName);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Field>
        <FieldLabel>{placeholder}</FieldLabel>
        <Input
          type="text"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => query.length >= 3 && setShowResults(true)}
          placeholder={placeholder}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute right-3 top-[38px] text-xs text-slate-400 animate-pulse">
            Searching...
          </div>
        )}
      </Field>
      
      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {results.map((item, idx) => (
            <button
              key={`${item.place_id}-${idx}`}
              type="button"
              className="w-full px-4 py-3 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
              onClick={() => handleSelect(item)}
            >
              <div className="font-medium text-slate-800">
                {item.name || item.display_name?.split(',')[0]}
              </div>
              <div className="text-xs text-slate-500 truncate">{item.display_name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}