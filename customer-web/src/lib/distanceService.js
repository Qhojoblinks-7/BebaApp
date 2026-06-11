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

export async function geocodeAddress(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&countrycodes=GH&format=json&limit=1&addressdetails=1`
    const response = await fetch(url, {
      headers: { 'User-Agent': 'BebaApp/1.0 (contact@beba.app)' },
    })
    const data = await response.json()

    if (data && data.length > 0) {
      const coords = data[0]
      const result = { lat: parseFloat(coords.lat), lon: parseFloat(coords.lon) }
      console.log('[geocodeAddress]', { address, lat: result.lat, lon: result.lon })
      return result
    }
    console.log('[geocodeAddress] no results for:', address)
    return null
  } catch (error) {
    console.error('[distanceService] Geocoding error:', error)
    return null
  }
}

export async function calculateDistanceFromCoords(pickupCoords, deliveryCoords) {
  if (!pickupCoords || !deliveryCoords) {
    return { allowed: false, reason: 'Both coordinates are required.' }
  }

  try {
    const routeUrl =
      `https://router.project-osrm.org/route/v1/bicycle/` +
      `${pickupCoords.lon},${pickupCoords.lat};${deliveryCoords.lon},${deliveryCoords.lat}?overview=false`

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
        coordinates: { pickup: pickupCoords, delivery: deliveryCoords },
      }
    }
    throw new Error('No routes in OSRM response')
  } catch (err) {
    console.error('[distanceService] Routing failed, falling back to Haversine', err)
    const dist = haversineDistance(pickupCoords, deliveryCoords)
    return { allowed: true, distanceKm: dist, method: 'straight-line', coordinates: { pickup: pickupCoords, delivery: deliveryCoords } }
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
