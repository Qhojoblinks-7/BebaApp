import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { supabase } from "./supabaseClient";

const BACKGROUND_LOCATION_TASK = "BACKGROUND_FLEET_TELEMETRY";

// In-memory runtime fallback anchor to safeguard tracking when storage is locked
let memoizedRiderId = null;

/**
 * Explicit global setter to safely pass credentials from the 
 * active UI context layer into the headless worker container.
 */
export const setTelemetrySessionCache = (userId) => {
  memoizedRiderId = userId;
  console.log(`[Telemetry Cache] Identity anchor synchronized: ${userId}`);
};

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error(`[Location Task Error]:`, error.message);
    return;
  }
  
  if (!data) return;

  try {
    const { locations } = data;
    if (!locations || locations.length === 0) return;

    // FIX 3: Capture the LATEST position marker rather than the oldest cached record
    const latestLocation = locations[locations.length - 1];
    const { latitude, longitude, accuracy, speed } = latestLocation.coords;

    // FIX 2: Resolve token lockouts by verifying the in-memory cache fallback first
    let activeUserId = memoizedRiderId;
    
    if (!activeUserId) {
      const { data: { session } } = await supabase.auth.getSession();
      activeUserId = session?.user?.id;
      if (activeUserId) memoizedRiderId = activeUserId;
    }

    if (!activeUserId) {
      console.warn("[Telemetry] Skipping tracking frame: Active user signature missing.");
      return;
    }

    console.log(`[Telemetry Sync] Pushing live ping -> Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`);

    // 1. Live Telemetry: Update the active coordinate on the live status board
    const statusUpdate = supabase.from("rider_status").upsert({
      id: activeUserId,
      rider_status: 'online',
      last_latitude: latitude,
      last_longitude: longitude,
      last_accuracy: accuracy,
      updated_at: new Date().toISOString(),
    });

    // 2. Historical Trail Tracking: Log spatial paths, skipping minor noise updates
    let trailLog = Promise.resolve();
    const isMovingSignificantly = speed === null || speed > 0.5; // Only log breadcrumbs if moving > 1.8 km/h

    if (isMovingSignificantly) {
      trailLog = supabase.from("rider_locations").insert({
        rider_id: activeUserId,
        latitude,
        longitude,
        accuracy,
      });
    }

    // Run both network queries concurrently to keep the worker thread fast
    await Promise.all([statusUpdate, trailLog]);

  } catch (err) {
    console.warn("[Telemetry Engine Core Exception]:", err.message);
  }
});

export const startTrackingEngine = async (userId) => {
  if (userId) {
    setTelemetrySessionCache(userId);
  }

  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== "granted") {
    console.warn("[Telemetry Initialization] Foreground tracking permission denied.");
    return false;
  }

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  if (background !== "granted") {
    console.warn("[Telemetry Initialization] Background tracking permission denied.");
    return false;
  }

  // Optimized battery-to-accuracy balance settings
  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced, 
    timeInterval: 15000,        // Checked every 15 seconds to prevent polling flooding
    distanceInterval: 25,       // Discard noise changes under 25 meters
    deferredUpdatesInterval: 30000, // Batches location deliveries to save battery power
    deferredUpdatesDistance: 50,
    foregroundService: {
      notificationTitle: "Beba Delivery Service Active",
      notificationBody: "Live coordination engine tracking your active transit loop.",
      notificationColor: "#115e59",
    },
  });

  return true;
};

export const stopTrackingEngine = async () => {
  try {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (isStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log("[Telemetry Engine] Tracking terminated successfully.");
    }
  } catch (err) {
    console.error("[Telemetry Engine Stop Warning]:", err.message);
  }
};