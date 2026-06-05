import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabaseClient';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_FLEET_TELEMETRY';

TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error(`[Location Task Error]:`, error.message);
    return;
  }
  if (data) {
    const { locations } = data;
    const [currentLocation] = locations;
    if (!currentLocation) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      console.log(`[Telemetry] Pushing updates to core sync line: Lat ${currentLocation.coords.latitude}`);
      
      await supabase.from('rider_status').upsert({
        id: session.user.id,
        is_rider_online: true,
        updated_at: new Date().toISOString()
      });

      await supabase.from('rider_locations').insert({
        rider_id: session.user.id,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      });
    } catch (err) {
      console.warn('[Telemetry Core Drop Exception]:', err.message);
    }
  }
});

export const startTrackingEngine = async () => {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') return false;

  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  if (background !== 'granted') return false;

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10000,
    distanceInterval: 15,
    foregroundService: {
      notificationTitle: "Beba Fleet Active",
      notificationBody: "Live coordination system tracking your position context.",
    },
  });
  return true;
};

export const stopTrackingEngine = async () => {
  const isStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (isStarted) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }
};
