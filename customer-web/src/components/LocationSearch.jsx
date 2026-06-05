/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'

export default function LocationSearch({ value, onChange, placeholder }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(false)
  const timeoutRef = useRef()
  const wrapperRef = useRef()

  useEffect(() => {
    let isCancelled = false
    if (!query || query.length < 3) {
      return
    }

    setLoading(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    
    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=gh`
        )
        const data = await response.json()
        if (!isCancelled) {
          setResults(data || [])
          setShowResults(true)
          setLoading(false)
        }
      } catch (error) {
        if (!isCancelled) setLoading(false)
        console.error('Location search error:', error)
      }
    }, 500)

    return () => {
      isCancelled = true
      clearTimeout(timeoutRef.current)
    }
  }, [query])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleQueryChange = (e) => {
    const val = e.target.value
    setQuery(val)
    onChange?.(val)
  }

  const handleSelect = (item) => {
    const displayName = item.display_name || ''
    setQuery(displayName)
    setShowResults(false)
    onChange?.(displayName)
  }

  return (
    <div ref={wrapperRef} className="relative">
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
        {loading && <div className="absolute right-2 top-8 text-xs text-slate-500">Searching...</div>}
      </Field>
      
      {showResults && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {results.map((item, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
              onClick={() => handleSelect(item)}
            >
              <div className="font-medium text-slate-800">{item.name || item.display_name?.split(',')[0]}</div>
              <div className="text-xs text-slate-500 truncate">{item.display_name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}