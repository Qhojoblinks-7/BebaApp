const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';
const OSRM_FALLBACK = 'https://routing.openstreetmap.de';

const OSM_HEADERS = {
  'User-Agent': 'BebaFleetApp/1.0 (mailto:support@beba.app)',
  'Accept-Language': 'en-US,en;q=0.9'
};

export async function geocodeAddress(address) {
  try {
    const url = `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1&countrycodes=gh`;
    console.log('[distanceService] Geocoding:', url)
    const response = await fetch(url, { headers: OSM_HEADERS });
    const data = await response.json();
    console.log('[distanceService] Geocode result for', address, ':', data?.length ? `found (${data[0].lat}, ${data[0].lon})` : 'not found')
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch (error) {
    console.error('[distanceService] Geocoding error:', error);
    return null;
  }
}

async function tryRoute(osrmBase, pickup, delivery) {
  const url = `${osrmBase}/route/v1/driving/${pickup.lon},${pickup.lat};${delivery.lon},${delivery.lat}?overview=false`;
  console.log('[distanceService] Trying route:', url)
  const response = await fetch(url);
  const data = await response.json();
  if (data.code === 'Ok' && data.routes?.length > 0) {
    const km = Math.round((data.routes[0].distance / 1000) * 10) / 10;
    console.log('[distanceService] Route success via', osrmBase.replace('https://',''), ':', km, 'km')
    return km;
  }
  console.log('[distanceService] Route failed via', osrmBase.replace('https://',''), ':', data.code, data.message || '')
  return null;
}

function haversineDistance(pickup, delivery) {
  const R = 6371;
  const dLat = (delivery.lat - pickup.lat) * Math.PI / 180;
  const dLon = (delivery.lon - pickup.lon) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(pickup.lat * Math.PI / 180) * Math.cos(delivery.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export async function calculateDistance(pickupAddress, deliveryAddress) {
  if (pickupAddress?.length < 5 || deliveryAddress?.length < 5) {
    return { allowed: false, reason: 'Both addresses must be at least 5 characters.' };
  }

  const [pickup, delivery] = await Promise.all([
    geocodeAddress(pickupAddress),
    geocodeAddress(deliveryAddress)
  ]);

  if (!pickup) return { allowed: false, reason: `Could not locate pickup: "${pickupAddress}". Try a more specific address.` };
  if (!delivery) return { allowed: false, reason: `Could not locate destination: "${deliveryAddress}". Try a more specific address.` };

  // Try OSRM public demo → OSRM fallback → Haversine straight-line
  let distanceKm = null;
  const sources = [OSRM_BASE, OSRM_FALLBACK];

  for (const source of sources) {
    try {
      distanceKm = await tryRoute(source, pickup, delivery);
      if (distanceKm) break;
    } catch {
      continue;
    }
  }

  if (!distanceKm) {
    distanceKm = haversineDistance(pickup, delivery);
  }

  return {
    allowed: true,
    distanceKm,
    method: distanceKm <= 8 ? 'routed' : 'straight-line',
    coordinates: { pickup, delivery }
  };
}