const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const OSRM_BASE = 'https://router.project-osrm.org';

// Custom header identifying the app to comply with OSM usage policies
const OSM_HEADERS = {
  'User-Agent': 'BebaFleetApp/1.0 (contact: support@beba.app)',
  'Accept-Language': 'en-US,en;q=0.9'
};

export async function geocodeAddress(address) {
  try {
    const response = await fetch(
      `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1&countrycodes=gh`,
      { headers: OSM_HEADERS }
    );
    const data = await response.json();
    
    if (data?.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function calculateDistance(pickupAddress, deliveryAddress) {
  // FIX: Concurrent execution to reduce latency by ~50%
  const [pickup, delivery] = await Promise.all([
    geocodeAddress(pickupAddress),
    geocodeAddress(deliveryAddress)
  ]);

  if (!pickup) return { allowed: false, reason: `Invalid pickup: "${pickupAddress}"` };
  if (!delivery) return { allowed: false, reason: `Invalid delivery: "${deliveryAddress}"` };

  try {
    const url = `${OSRM_BASE}/route/v1/driving/${pickup.lon},${pickup.lat};${delivery.lon},${delivery.lat}?overview=false`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes?.length > 0) {
      return {
        allowed: true,
        distanceKm: Math.round((data.routes[0].distance / 1000) * 10) / 10,
        coordinates: { pickup, delivery }
      };
    }
    return { allowed: false, reason: `Routing service returned: ${data.code}` };
  } catch (error) {
    return { allowed: false, reason: 'Network failure during OSRM calculation' };
  }
}