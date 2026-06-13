export const FALLBACK_VENDORS = [
  {
    id: 'vendor_ama',
    name: 'Auntie Ama Kitchen',
    phone: '+233244567890',
    category: 'Local Meals',
    image: '',
    rating: 4.8,
    location: 'Osu, Accra',
    hasPriorOrder: true,
    priorOrderId: 'BBA-1234-XP',
    description: 'Trusted home-style Ghanaian meals prepared fresh daily for quick local pickup and delivery.',
    popularDishes: ['Jollof rice', 'Waakye', 'Grilled tilapia'],
    distance: 1.8,
    estimatedTime: '25-35 min',
    deliveryAvailable: true,
    deliveryFee: 8,
    isOpen: true,
    openingHours: '8:00 AM - 9:00 PM',
    verificationBadge: true,
  },
  {
    id: 'vendor_mama_effe',
    name: 'Mama Effe Chops',
    phone: '+233501234567',
    category: 'Fast Food',
    image: '',
    rating: 4.6,
    location: 'Cantonments, Accra',
    hasPriorOrder: false,
    description: 'Crispy chicken, burgers, fries, and cold drinks for quick neighborhood orders.',
    popularDishes: ['Chicken burger', 'Chips', 'Shawarma'],
    distance: 3.2,
    estimatedTime: '20-30 min',
    deliveryAvailable: true,
    deliveryFee: 12,
    isOpen: true,
    openingHours: '10:00 AM - 10:00 PM',
    verificationBadge: true,
  },
  {
    id: 'vendor_kofi_bbq',
    name: 'Kofi BBQ Spot',
    phone: '+233277654321',
    category: 'Grills',
    image: '',
    rating: 4.9,
    location: 'Labone, Accra',
    hasPriorOrder: true,
    priorOrderId: 'BBA-7890-XP',
    description: 'Smoky grilled chicken, kebabs, and spicy sauces served hot for lunch and dinner.',
    popularDishes: ['Grilled chicken', 'Kebab plate', 'Shito wings'],
    distance: 2.5,
    estimatedTime: '30-40 min',
    deliveryAvailable: false,
    deliveryFee: 0,
    isOpen: false,
    openingHours: '4:00 PM - 11:00 PM',
    verificationBadge: true,
  },
  {
    id: 'vendor_sugar_rush',
    name: 'Sugar Rush Bakery',
    phone: '+233549876543',
    category: 'Bakery',
    image: '',
    rating: 4.7,
    location: 'East Legon, Accra',
    hasPriorOrder: false,
    description: 'Fresh pastries, cakes, doughnuts, and breakfast bundles for families and offices.',
    popularDishes: ['Meat pie', 'Doughnuts', 'Chocolate cake'],
    distance: 5.4,
    estimatedTime: '35-45 min',
    deliveryAvailable: true,
    deliveryFee: 15,
    isOpen: true,
    openingHours: '7:00 AM - 8:00 PM',
    verificationBadge: false,
  },
]

export const emptyForm = {
  recipientName: '',
  recipientPhone: '',
  deliveryAddress: '',
  deliveryLat: undefined,
  deliveryLng: undefined,
  instructions: '',
}

export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '')
  if (!digits) return ''
  if (digits.startsWith('00')) return `+${digits.slice(2)}`
  if (digits.startsWith('0')) return `+233${digits.slice(1)}`
  if (digits.startsWith('233')) return `+${digits}`
  if (!digits.startsWith('+')) return `+${digits}`
  return digits
}

export function generateBookingId() {
  return `BBA-${Math.floor(1000 + Math.random() * 9000)}-XP`
}

export function getInitials(name) {
  return String(name || 'V')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'V'
}

export function normalizeVendor(vendor) {
  return {
    id: vendor.id || vendor.vendor_id || crypto.randomUUID(),
    name: vendor.name || vendor.vendor_name || 'Local Vendor',
    phone: normalizePhone(vendor.phone || vendor.vendor_phone),
    category: vendor.category || vendor.food_category || 'Local Food',
    image: vendor.image || vendor.vendor_image || '',
    rating: Number(vendor.rating || 0),
    location: vendor.location || vendor.service_area || vendor.pickup_address || 'Accra',
    pickupAddress: vendor.pickup_address || vendor.pickupAddress || vendor.location || vendor.service_area || '',
    pickupLat: vendor.pickup_lat || vendor.pickupLat,
    pickupLng: vendor.pickup_lng || vendor.pickupLng,
    hasPriorOrder: Boolean(vendor.hasPriorOrder || vendor.prior_order_id || vendor.priorOrderId),
    priorOrderId: vendor.priorOrderId || vendor.prior_order_id || '',
    description: vendor.description || vendor.short_description || vendor.vendor_description || 'Trusted local food vendor.',
    popularDishes: vendor.popularDishes || vendor.popular_dishes || [],
    distance: vendor.distance ?? vendor.delivery_distance,
    estimatedTime: vendor.estimatedTime || vendor.estimated_time || '25-35 min',
    deliveryAvailable: vendor.deliveryAvailable ?? vendor.delivery_available ?? true,
    deliveryFee: vendor.deliveryFee ?? vendor.delivery_fee,
    isOpen: vendor.isOpen ?? vendor.is_open ?? true,
    openingHours: vendor.openingHours || vendor.opening_hours,
    verificationBadge: vendor.verificationBadge ?? vendor.verified ?? false,
  }
}

export function formatDistance(distance) {
  if (distance === undefined || distance === null || Number.isNaN(Number(distance))) return '—'
  return `${Number(distance).toFixed(1)} km`
}

export function formatFee(fee) {
  if (fee === undefined || fee === null || fee === '') return null
  const value = Number(fee)
  return `GH₵ ${Number.isNaN(value) ? fee : value.toFixed(2)}`
}
