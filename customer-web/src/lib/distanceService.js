const STADIA_API_KEY = import.meta.env.VITE_STADIA_API_KEY;
console.log('[distanceService] STADIA_API_KEY loaded:', !!STADIA_API_KEY, 'prefix:', STADIA_API_KEY?.slice(0, 4))

function isValidGhanaCoord(lat, lon) {
  return lat >= 4 && lat <= 12 && lon >= -4 && lon <= 2
}

function haversineDistance(pickup, delivery) {
  const R = 6371
  const dLat = (delivery.lat - pickup.lat) * Math.PI / 180
  const dLon = (delivery.lon - pickup.lon) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((pickup.lat * Math.PI) / 180) *
      Math.cos((delivery.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

function assertGhana(result, address) {
  if (!result) return null
  if (!isValidGhanaCoord(result.lat, result.lon)) {
    console.log('[distanceService] rejecting out-of-bounds result for:', address, result)
    return null
  }
  return result
}

export async function geocodeAddress(address) {
  try {
    const url = `https://api.stadiamaps.com/geocoding/v1/search?text=${encodeURIComponent(address)}&country=GH&api_key=${STADIA_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()

    if (data.features && data.features.length > 0) {
      const coords = data.features[0].geometry.coordinates // [lon, lat]
      const result = { lat: coords[1], lon: coords[0] }
      if (!isValidGhanaCoord(result.lat, result.lon)) {
        console.log('[geocodeAddress] rejecting out-of-bounds result for:', address, result)
        return null
      }
      console.log('[geocodeAddress]', { address, lat: result.lat, lon: result.lon })
      return result
    }
    console.log('[geocodeAddress] no features for:', address, 'raw:', data)
    return null
  } catch (error) {
    console.error('[distanceService] Geocoding error:', error)
    return null
  }
}

export async function calculateDistance(pickupAddress, deliveryAddress) {
  if (!pickupAddress || !deliveryAddress) {
    return { allowed: false, reason: 'Both addresses are required.' }
  }
  if (pickupAddress.length < 3 || deliveryAddress.length < 3) {
    return { allowed: false, reason: 'Addresses too short.' }
  }

  const [pickup, delivery] = await Promise.all([
    geocodeAddress(pickupAddress),
    geocodeAddress(deliveryAddress),
  ])

  if (!pickup || !delivery) {
    return { allowed: false, reason: 'Could not locate one or both addresses.' }
  }

  try {
    // Use public OSRM demo server for routing (Stadia routing 404s in this environment)
    const routeUrl =
      `https://router.project-osrm.org/route/v1/bicycle/` +
      `${pickup.lon},${pickup.lat};${delivery.lon},${delivery.lat}?overview=false`

    console.log('[distanceService] routing request:', routeUrl)
    const response = await fetch(routeUrl)
    const text = await response.text()
    console.log('[distanceService] routing response status:', response.status, 'body:', text.slice(0, 500))
    if (!response.ok) throw new Error('Failed to fetch route: ' + response.status)
    const data = JSON.parse(text)

    if (data.routes && data.routes.length > 0) {
      const distanceKm = Math.round(data.routes[0].distance / 1000 * 10) / 10
      return {
        allowed: true,
        distanceKm,
        method: 'routed',
        coordinates: { pickup, delivery },
      }
    }
    throw new Error('No routes in OSRM response')
  } catch (err) {
    console.error('[distanceService] Routing failed, falling back to Haversine', err)
  }

  const dist = haversineDistance(pickup, delivery)
  return { allowed: true, distanceKm: dist, method: 'straight-line', coordinates: { pickup, delivery } }
}
