import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { auth } from "./firebaseConfig";
import { doc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { db } from "./firebaseConfig";

const BACKGROUND_LOCATION_TASK = "BACKGROUND_FLEET_TELEMETRY";
let memoizedRiderId = null;

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

    const latestLocation = locations[locations.length - 1];
    const { latitude, longitude, accuracy, speed } = latestLocation.coords;

    let activeUserId = memoizedRiderId;

    if (!activeUserId) {
      const firebaseUser = auth.currentUser;
      activeUserId = firebaseUser?.uid;
      if (activeUserId) memoizedRiderId = activeUserId;
    }

    if (!activeUserId) {
      console.warn("[Telemetry] Skipping tracking frame: Active user signature missing.");
      return;
    }

    console.log(`[Telemetry Sync] Pushing live ping -> Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`);

    const statusRef = doc(db, "rider_status", activeUserId);
    const locationRef = doc(collection(db, "rider_locations"));

    const statusUpdate = setDoc(statusRef, {
      id: activeUserId,
      rider_status: "online",
      current_latitude: latitude,
      current_longitude: longitude,
      updated_at: serverTimestamp(),
    });

    let trailLog = Promise.resolve();
    const isMovingSignificantly = speed === null || speed > 0.5;

    if (isMovingSignificantly) {
      trailLog = setDoc(locationRef, {
        rider_id: activeUserId,
        latitude,
        longitude,
        accuracy,
        updated_at: serverTimestamp(),
      });
    }

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

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 15000,
    distanceInterval: 25,
    deferredUpdatesInterval: 30000,
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
