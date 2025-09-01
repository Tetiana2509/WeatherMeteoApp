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
import { useCache } from './hooks/useCache';
import { DataType, TemperatureUnit, Coords, coordsEqual, TapArea } from './types';
import { getCurrentHourIndex, getSunriseSunsetTimes, getTodayIndices, createFilteredWeatherData } from './timeUtils';
import { selectSeries, convertSeries } from './dataUtils';

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

    // Select and convert data using utility functions
    const selectedData = selectSeries(
      weatherData,
      dataType,
      lastCoordsRef.current?.lat ?? 0,
      lastCoordsRef.current?.lon ?? 0
    );

    const convertedData = convertSeries(selectedData, dataType, temperatureUnit);

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
