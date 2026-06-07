/**
 * Calculates delivery fees using a standardized base+distance+surge model.
 * All internal math is kept to 2 decimal points to prevent JS floating point precision issues.
 */
export function calculateDeliveryFee(totalDistanceKm, demandLevel = 'LOW') {
  // Config constants - consider moving these to a config file for environmental scaling
  const CONFIG = {
    BASE_PRICE: 15.00,
    BASE_DISTANCE_CAP: 2.0,
    PER_KM_RATE: 8.00,
    ABSOLUTE_MAX_RADIUS: 8.0,
    SURGE_TIERS: {
      LOW: 0.00,
      MEDIUM: 3.00,
      HIGH: 4.00,
      PEAK: 5.00
    }
  };

  if (totalDistanceKm > CONFIG.ABSOLUTE_MAX_RADIUS) {
    return {
      allowed: false,
      reason: `Distance exceeds the maximum ${CONFIG.ABSOLUTE_MAX_RADIUS}km radius constraint.`
    };
  }

  // Determine surge fee safely using tier mapping
  const normalizedDemand = demandLevel.toUpperCase();
  const surgeFee = CONFIG.SURGE_TIERS[normalizedDemand] || CONFIG.SURGE_TIERS.LOW;

  // Calculate distance overage
  const chargeableDistance = Math.max(0, totalDistanceKm - CONFIG.BASE_DISTANCE_CAP);
  const distanceFee = chargeableDistance * CONFIG.PER_KM_RATE;
  
  // Calculate final total
  const totalFee = CONFIG.BASE_PRICE + distanceFee + surgeFee;

  return {
    allowed: true,
    breakdown: {
      basePrice: Number(CONFIG.BASE_PRICE.toFixed(2)),
      distanceFee: Number(distanceFee.toFixed(2)),
      surgeFee: Number(surgeFee.toFixed(2)),
      totalFee: Number(totalFee.toFixed(2))
    },
    meta: {
      distanceCharged: Number(chargeableDistance.toFixed(2)),
      appliedDemandTier: normalizedDemand
    }
  };
}