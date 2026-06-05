export function calculateDeliveryFee(totalDistanceKm, demandLevel = 'LOW') {
  const BASE_PRICE = 15.00
  const BASE_DISTANCE_CAP = 2.0
  const PER_KM_RATE = 8.00
  const ABSOLUTE_MAX_RADIUS = 8.0

  if (totalDistanceKm > ABSOLUTE_MAX_RADIUS) {
    return {
      allowed: false,
      reason: `Distance exceeds the maximum ${ABSOLUTE_MAX_RADIUS}km radius constraint specified for bicycle dispatches.`
    }
  }

  let surgeFee
  switch (demandLevel.toUpperCase()) {
    case 'MEDIUM':
      surgeFee = 3.00
      break
    case 'HIGH':
      surgeFee = 4.00
      break
    case 'PEAK':
      surgeFee = 5.00
      break
    case 'LOW':
    default:
      surgeFee = 0.00
      break
  }

  let additionalDistance = 0.00
  if (totalDistanceKm > BASE_DISTANCE_CAP) {
    additionalDistance = totalDistanceKm - BASE_DISTANCE_CAP
  }

  const distanceFee = additionalDistance * PER_KM_RATE
  const totalFee = BASE_PRICE + distanceFee + surgeFee

  return {
    allowed: true,
    breakdown: {
      basePrice: parseFloat(BASE_PRICE.toFixed(2)),
      distanceFee: parseFloat(distanceFee.toFixed(2)),
      surgeFee: parseFloat(surgeFee.toFixed(2)),
      totalFee: parseFloat(totalFee.toFixed(2))
    },
    meta: {
      distanceCharged: parseFloat(additionalDistance.toFixed(2)),
      appliedDemandTier: demandLevel.toUpperCase()
    }
  }
}