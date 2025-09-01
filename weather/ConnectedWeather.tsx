import React, {
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useRef,
} from 'react';
import { Text, ActivityIndicator, Alert, ViewStyle } from 'react-native';
import { getHourlyWeather, HourlyWeather } from './services/meteoService';
import Weather from './Weather';
import { computeDaylightBrightnessIndexFromArrays } from './services/brightnessIndex';
import { useCache } from './hooks/useCache';
import { DataType, TemperatureUnit, Coords, coordsEqual, TapArea } from './types';
import { getCurrentHourIndex, getSunriseSunsetTimes } from './timeUtils';

type Props = {
  dataType: DataType;
  temperatureUnit: TemperatureUnit;
  coords?: Coords | null;
  onTap?: (area: TapArea) => void;
  currentTime?: number;
  style?: ViewStyle;
};

export type ConnectedWeatherRef = {
  update: () => Promise<void>;
};

export const ConnectedWeather = forwardRef<ConnectedWeatherRef, Props>(
  ({ dataType, temperatureUnit, coords, onTap, currentTime, style }, ref) => {
    const [weatherData, setWeatherData] = useState<HourlyWeather | null>(null);
    const [loading, setLoading] = useState(false);
    const lastCoordsRef = useRef<Coords | null>(null);

    // Initialize cache hook with 5-minute TTL
    const weatherCache = useCache<HourlyWeather>({ ttlMinutes: 5 });

    // select data to use
    const selectedData =
      weatherData == null
        ? []
        : dataType === 'precipitation'
          ? weatherData.precipitation
          : dataType === 'uv_index'
            ? weatherData.uv_index
            : dataType === 'clouds'
              ? weatherData.cloudcover
              : dataType === 'brightness'
                ? (() => {
                  // Compute brightness index 0..1 using solar altitude and conditions
                  try {
                    const times = weatherData!.time;
                    const lat = lastCoordsRef.current?.lat ?? 0;
                    const lon = lastCoordsRef.current?.lon ?? 0;
                    return computeDaylightBrightnessIndexFromArrays(times, {
                      latitude: lat,
                      longitude: lon,
                      timezoneOffsetMinutes:
                        new Date().getTimezoneOffset() * -1,
                    });
                  } catch {
                    return [] as number[];
                  }
                })()
                : weatherData.temperature_2m;

    // verify data
    let convertedData = selectedData;
    if (selectedData.find((n) => typeof n !== 'number' || isNaN(n))) {
      console.error('Invalid data set:', selectedData);
      convertedData = [];
    } else if (dataType === 'temperature' && temperatureUnit === 'fahrenheit') {
      // Temperature conversion functions
      const celsiusToFahrenheit = (celsius: number): number =>
        (celsius * 9) / 5 + 32;
      convertedData = selectedData.map(celsiusToFahrenheit);
    } else if (dataType === 'brightness') {
      // ensure 0..1 and numeric
      convertedData = selectedData.map((v) =>
        typeof v === 'number' && isFinite(v) ? clamp01(v) : 0,
      );
    }

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

        // Determine "today" in the location's timezone using API-provided offset
        const tzOffsetSeconds = fullData.utc_offset_seconds || 0;
        const nowShifted = new Date(Date.now() + tzOffsetSeconds * 1000);
        const today = nowShifted.toISOString().split('T')[0];

        // Build indices for the hours that are on today's local date
        let filteredIndices = fullData.time
          .map((time, index) => ({ time, index }))
          .filter(({ time }) => time && time.startsWith(today))
          .map(({ index }) => index);

        // Fallback: if no data for today, use the first 24 hours
        if (filteredIndices.length === 0 && fullData.time.length >= 24) {
          filteredIndices = Array.from({ length: 24 }, (_, i) => i);
          console.log('Fallback to first 24 hours');
        }

        // If still empty, show an error
        if (filteredIndices.length === 0) {
          Alert.alert(
            'No data',
            'No weather data available for this location.',
          );
          setWeatherData(null);
          return;
        }

        // Helper function to safely get numeric value or fallback
        const safeGetNumber = (
          array: number[],
          index: number,
          fallback: number = 0,
        ): number => {
          const value = array?.[index];
          return typeof value === 'number' && !isNaN(value) ? value : fallback;
        };

        // Create filtered data with validation
        const filteredData: HourlyWeather = {
          time: filteredIndices.map((i) => fullData.time[i] || ''),
          temperature_2m: filteredIndices.map((i) =>
            safeGetNumber(fullData.temperature_2m, i, 15),
          ),
          apparent_temperature: filteredIndices.map((i) =>
            safeGetNumber(fullData.apparent_temperature, i, 15),
          ),
          relative_humidity_2m: filteredIndices.map((i) =>
            safeGetNumber(fullData.relative_humidity_2m, i, 50),
          ),
          precipitation: filteredIndices.map((i) =>
            safeGetNumber(fullData.precipitation, i, 0),
          ),
          weathercode: filteredIndices.map((i) =>
            safeGetNumber(fullData.weathercode, i, 0),
          ),
          uv_index: filteredIndices.map((i) =>
            safeGetNumber(fullData.uv_index, i, 0),
          ),
          cloudcover: filteredIndices.map((i) =>
            safeGetNumber(fullData.cloudcover, i, 0),
          ),
          sunrise: fullData.sunrise || [],
          sunset: fullData.sunset || [],
          timezone: fullData.timezone,
          utc_offset_seconds: fullData.utc_offset_seconds,
        };

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
        // console.log("Filtered temperatures:", filteredData.temperature_2m);
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

    const handleUpdate = useCallback(async () => {
      if (lastCoordsRef.current) {
        await fetchWeather(lastCoordsRef.current.lat, lastCoordsRef.current.lon, true);
      }
    }, [fetchWeather]);

    useImperativeHandle(ref, () => ({
      update: handleUpdate,
    }));

    // Effect to handle external coordinate changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
      if (!coordsEqual(coords, lastCoordsRef.current)) {
        lastCoordsRef.current = coords ?? null;
        handleUpdate();
      }
    }, [coords, handleUpdate]);

    if (loading) {
      return <ActivityIndicator size="large" style={{ marginTop: 20 }} />;
    }

    if (
      !weatherData ||
      !weatherData.temperature_2m ||
      weatherData.temperature_2m.length === 0
    ) {
      return <Text style={{ color: 'red', textAlign: 'center' }}>No data</Text>;
    }

    // Choose sunrise/sunset for the same local day as the filtered hourly series
    const { sunriseTime, sunsetTime } = getSunriseSunsetTimes(weatherData);

    // Compute current hour index in the location's local time based on API timezone
    const currentHourIndex = getCurrentHourIndex(weatherData);
    
    currentTime ??= new Date().getHours();

    return (
      <>
        <Weather
          data={convertedData}
          currentTime={currentHourIndex}
          hours={weatherData?.time?.map((t) => parseInt(t.slice(11, 13), 10))}
          dataType={dataType}
          temperatureUnit={temperatureUnit}
          sunriseTime={sunriseTime}
          sunsetTime={sunsetTime}
          style={style}
          onTap={onTap}
        />

        {/* <Text style={{ color: "aqua" }}>
        {convertedData
          .map(n => {
            if (dataType === 'brightness') {
              // Show as percent with no decimals to make it readable, but not collapse to 0/1
              const pct = Math.round(Math.max(0, Math.min(1, n)) * 100);
              return `${pct}%`;
            }
            return n.toFixed(0);
          })
          .join("  ")}
      </Text> */}
      </>
    );
  },
);

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
