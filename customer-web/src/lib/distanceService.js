const STADIA_API_KEY = import.meta.env.REACT_APP_STADIA_API_KEY; // Ensure this is set in your .env

export async function geocodeAddress(address) {
  try {
    const url = `https://api.stadiamaps.com/geocoding/v1/search?text=${encodeURIComponent(address)}&country=GH&api_key=${STADIA_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const coords = data.features[0].geometry.coordinates; // [lon, lat]
      console.log('[geocodeAddress]', { address, lat: coords[1], lon: coords[0], raw: data.features[0] })
      return { lat: coords[1], lon: coords[0] };
    }
    console.log('[geocodeAddress] no features for:', address, 'raw:', data)
    return null;
  } catch (error) {
    console.error('[distanceService] Geocoding error:', error);
    return null;
  }
}

export async function calculateDistance(pickupAddress, deliveryAddress) {
  if (pickupAddress?.length < 5 || deliveryAddress?.length < 5) {
    return { allowed: false, reason: 'Addresses too short.' };
  }

  const [pickup, delivery] = await Promise.all([
    geocodeAddress(pickupAddress),
    geocodeAddress(deliveryAddress)
  ]);

  if (!pickup || !delivery) return { allowed: false, reason: 'Could not locate addresses.' };

  try {
    const routeUrl = `https://api.stadiamaps.com/routing/v1/route?api_key=${STADIA_API_KEY}&json={"locations":[{"lat":${pickup.lat},"lon":${pickup.lon}},{"lat":${delivery.lat},"lon":${delivery.lon}}],"costing":"bicycle"}`;
    
    const response = await fetch(routeUrl);
    const text = await response.text();
    console.log('[distanceService] routing response status:', response.status, 'body:', text.slice(0, 500))
    if (!response.ok) throw new Error('Failed to fetch route: ' + response.status)
    const data = JSON.parse(text);
    
    if (data.trip && data.trip.summary) {
      const distanceKm = Math.round((data.trip.summary.length) * 10) / 10;
      return { allowed: true, distanceKm, method: 'routed', coordinates: { pickup, delivery } };
    }
    throw new Error('No trip summary in routing response')
  } catch (err) {
    console.error('[distanceService] Routing failed, falling back to Haversine', err);
  }

  // Fallback to Haversine if API fails
  const dist = haversineDistance(pickup, delivery);
  return { allowed: true, distanceKm: dist, method: 'straight-line', coordinates: { pickup, delivery } };
}

function haversineDistance(pickup, delivery) {
  const R = 6371;
  const dLat = (delivery.lat - pickup.lat) * Math.PI / 180;
  const dLon = (delivery.lon - pickup.lon) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(pickup.lat * Math.PI / 180) * Math.cos(delivery.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}