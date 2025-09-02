import { useState, useCallback, useRef, useEffect } from 'react';
import { Alert } from 'react-native';
import { getHourlyWeather, HourlyWeather } from '../services/meteoService';
import { computeDaylightBrightnessIndexFromArrays } from '../services/brightnessIndex';
import { useCache } from './useCache';
import { Coords, coordsEqual } from '../types';
import { getTodayIndices, createFilteredWeatherData } from '../timeUtils';

interface UseWeatherDataResult {
  weatherData: HourlyWeather | null;
  loading: boolean;
  update: () => Promise<void>;
}

export function useWeatherData(coords?: Coords | null): UseWeatherDataResult {
  const [weatherData, setWeatherData] = useState<HourlyWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const lastCoordsRef = useRef<Coords | null>(null);

  // Initialize cache hook with 5-minute TTL
  const weatherCache = useCache<HourlyWeather>({ ttlMinutes: 5 });

  const fetchWeather = useCallback(async (
    lat: number,
    lon: number,
    forceRefresh: boolean = false,
  ) => {
    setLoading(true);
    try {
      const fullData = await weatherCache.executeWithCache(
        { lat, lon },
        () => getHourlyWeather(lat, lon),
        forceRefresh,
      );

      // Validate API data
      if (
        !fullData ||
        !fullData.time ||
        !Array.isArray(fullData.time) ||
        fullData.time.length === 0
      ) {
        throw new Error('Invalid weather data received from API');
      }

      // Compute brightness data for all hours
      try {
        const brightnessData = computeDaylightBrightnessIndexFromArrays(fullData.time, {
          latitude: lat,
          longitude: lon,
          timezoneOffsetMinutes: (fullData.utc_offset_seconds || 0) / 60,
          timesAreUTC: false, // Open-Meteo times are already in local timezone
        });
        fullData.brightness = brightnessData;
      } catch (error) {
        console.warn('Failed to compute brightness data:', error);
        fullData.brightness = fullData.time.map(() => 0);
      }

      // Get indices for today's hours (with fallback to first 24 hours)
      const filteredIndices = getTodayIndices(fullData);

      // If still empty, show an error
      if (filteredIndices.length === 0) {
        Alert.alert(
          'No data',
          'No weather data available for this location.',
        );
        setWeatherData(null);
        return;
      }

      // Create filtered data with validation using utility function
      const filteredData = createFilteredWeatherData(fullData, filteredIndices);

      // Final validation - ensure we have valid temperature data
      const hasValidTemperatures = filteredData.temperature_2m.some(
        (temp) =>
          typeof temp === 'number' &&
          !isNaN(temp) &&
          temp > -100 &&
          temp < 100,
      );

      if (!hasValidTemperatures) {
        throw new Error('No valid temperature data available');
      }

      setWeatherData(filteredData);
    } catch (error) {
      console.error('Weather fetch error:', error);
      if (
        error instanceof Error &&
        error.message === 'Invalid weather data received from API'
      ) {
        // Suppress generic alert; show inline "No data" state instead
        setWeatherData(null);
      } else {
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to get weather',
        );
      }
    } finally {
      setLoading(false);
    }
  }, [weatherCache]);

  const update = useCallback(async () => {
    if (lastCoordsRef.current) {
      await fetchWeather(lastCoordsRef.current.lat, lastCoordsRef.current.lon, true);
    }
  }, [fetchWeather]);

  // Effect to handle external coordinate changes
  useEffect(() => {
    if (!coordsEqual(coords, lastCoordsRef.current)) {
      lastCoordsRef.current = coords ?? null;
      if (coords) {
        fetchWeather(coords.lat, coords.lon);
      }
    }
  }, [coords, fetchWeather]);

  return {
    weatherData,
    loading,
    update,
  };
}
