import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const FORECAST_CACHE_KEY = "forecast_cache_v1";
const FORECAST_TTL = 30 * 60 * 1000; // 30 minutes

async function getCachedForecast(riderId, days) {
  try {
    const cacheData = await AsyncStorage.getItem(FORECAST_CACHE_KEY);
    if (!cacheData) return null;
    
    const cache = JSON.parse(cacheData);
    const key = `${riderId}_${days}`;
    const entry = cache[key];
    
    if (!entry) return null;
    if (Date.now() - entry.timestamp > FORECAST_TTL) {
      delete cache[key];
      await AsyncStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(cache));
      return null;
    }
    
    return entry.forecast;
  } catch {
    return null;
  }
}

async function setCachedForecast(riderId, days, forecast) {
  try {
    const cacheData = await AsyncStorage.getItem(FORECAST_CACHE_KEY);
    const cache = cacheData ? JSON.parse(cacheData) : {};
    cache[`${riderId}_${days}`] = { forecast, timestamp: Date.now() };
    await AsyncStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore cache errors
  }
}

export function useRevenueForecast(riderId, days = 7) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastFetchTimeRef = useRef(0);
  const minFetchInterval = 5 * 60 * 1000; // 5 minutes minimum between fetches

  const fetchForecast = useCallback(async () => {
    if (!riderId) {
      setError("No rider ID provided");
      return;
    }

    // Check if we should throttle based on time
    const now = Date.now();
    if (now - lastFetchTimeRef.current < minFetchInterval) {
      return;
    }

    setLoading(true);
    setError(null);
    lastFetchTimeRef.current = now;

    try {
      // Check local cache first
      const cached = await getCachedForecast(riderId, days);
      if (cached) {
        setForecast(cached);
        setLoading(false);
        return;
      }

      const response = await fetch(
        process.env.EXPO_PUBLIC_FORECAST_API_URL || "https://beba-app.vercel.app/api/forecast",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ riderId, days }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch forecast: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        setForecast(data.forecast);
        await setCachedForecast(riderId, days, data.forecast);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (err) {
      setError(err.message || "Failed to fetch forecast");
      setForecast(null);
    } finally {
      setLoading(false);
    }
  }, [riderId, days]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  return { forecast, loading, error, refetch: fetchForecast };
}