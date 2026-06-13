import { useCallback, useState } from 'react'

export function useCurrentLocation(onDetected) {
  const [status, setStatus] = useState('default')
  const [error, setError] = useState('')

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus('error')
      setError('This browser does not support location detection.')
      return
    }

    setStatus('loading')
    setError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        let address = `Current location detected (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
            {
              headers: { 'User-Agent': 'BebaApp/1.0 (contact@beba.app)' },
            },
          )
          if (response.ok) {
            const data = await response.json()
            const detected = [
              data.address?.road,
              data.address?.suburb,
              data.address?.city || data.address?.town || data.address?.village,
              data.address?.country,
            ].filter(Boolean).join(', ')
            if (detected) address = detected
          }
        } catch (err) {
          console.warn('[useCurrentLocation] reverse geocode failed:', err.message)
        }

        onDetected?.({ address, lat: latitude, lon: longitude })
        setStatus('success')
      },
      (err) => {
        const message = err.code === 1
          ? 'Location permission was denied. Please enter your address manually.'
          : 'Could not detect location. Please enter manually.'
        setStatus('error')
        setError(message)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }, [onDetected])

  const reset = useCallback(() => {
    setStatus('default')
    setError('')
  }, [])

  return { status, error, detect, reset }
}
