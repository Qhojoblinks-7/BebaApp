const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const OSRM_BASE = 'https://router.project-osrm.org'

export async function geocodeAddress(address) {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1&countrycodes=gh`
    )
    const data = await response.json()
    console.log('[Geocode] Query:', address, 'Result:', data?.length ? 'found' : 'not found')
    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
    }
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    return null
  }
}

export async function calculateDistance(pickupAddress, deliveryAddress) {
  console.log('[Distance] Calculating between:', { pickupAddress, deliveryAddress })
  
  const pickup = await geocodeAddress(pickupAddress)
  const delivery = await geocodeAddress(deliveryAddress)

  console.log('[Distance] Coordinates:', { pickup, delivery })

  if (!pickup) {
    return {
      allowed: false,
      reason: `Could not find pickup location: "${pickupAddress}". Try a more specific address.`
    }
  }
  
  if (!delivery) {
    return {
      allowed: false,
      reason: `Could not find delivery location: "${deliveryAddress}". Try a more specific address.`
    }
  }

  try {
    const url = `${OSRM_BASE}/route/v1/driving/${pickup.lon},${pickup.lat};${delivery.lon},${delivery.lat}?overview=false`
    console.log('[Distance] OSRM request:', url)
    
    const response = await fetch(url)
    const data = await response.json()
    console.log('[Distance] OSRM response:', data)
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const distanceKm = data.routes[0].distance / 1000
      return {
        allowed: true,
        distanceKm: Math.round(distanceKm * 10) / 10,
        coordinates: { pickup, delivery }
      }
    }
    return {
      allowed: false,
      reason: `Route not found. OSRM returned: ${data.code || 'unknown error'}`
    }
  } catch (error) {
    console.error('Distance calculation error:', error)
    return {
      allowed: false,
      reason: 'Could not calculate distance - network error. Check connection.'
    }
  }
}