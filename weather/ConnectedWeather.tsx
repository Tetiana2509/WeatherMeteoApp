import React, { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { getHourlyWeather, HourlyWeather } from "../services/meteoService";
import { getCoordinatesByQuery, getPlaceNameByCoordinates } from "../services/geocodingService";
import Weather from "./Weather";
import { computeDaylightBrightnessIndexFromArrays } from "../services/brightnessIndex";
import { useCache } from "../hooks/useCache";
import { DataType } from "./DataTypeSwitch";
import { TemperatureUnit } from "./TemperatureUnitSwitch";

type Props = {
  query: string;
  dataType: DataType;
  temperatureUnit: TemperatureUnit;
  coords?: { lat: number; lon: number } | null;
  onCoordsChange?: (coords: { lat: number; lon: number }) => void;
  onQueryChange?: (displayName: string) => void;
};

export type ConnectedWeatherRef = {
  update: () => Promise<void>;
  getLocation: () => Promise<void>;
  search: (query: string) => Promise<void>;
};

const ConnectedWeather = forwardRef<ConnectedWeatherRef, Props>(({ 
  query,
  dataType,
  temperatureUnit,
  coords,
  onCoordsChange,
  onQueryChange,
}, ref) => {
  const [weatherData, setWeatherData] = useState<HourlyWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastCoords, setLastCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(coords || null);

  // Initialize cache hook with 5-minute TTL
  const weatherCache = useCache<HourlyWeather>({ ttlMinutes: 5 });

  // select data to use
  const selectedData =
    weatherData == null ? [] :
      dataType === 'precipitation' ? weatherData.precipitation :
  dataType === 'uv_index' ? weatherData.uv_index :
  dataType === 'clouds' ? weatherData.cloudcover :
  dataType === 'brightness' ? (() => {
    // Compute brightness index 0..1 using solar altitude and conditions
    try {
      const times = weatherData!.time;
      const clouds = weatherData!.cloudcover;
      const precip = weatherData!.precipitation;
      const codes = weatherData!.weathercode;
      const lat = lastCoords?.lat ?? 0;
      const lon = lastCoords?.lon ?? 0;
      return computeDaylightBrightnessIndexFromArrays(
        times,
        clouds,
        precip,
        codes,
        { latitude: lat, longitude: lon, timezoneOffsetMinutes: new Date().getTimezoneOffset() * -1 }
      );
    } catch {
      return [] as number[];
    }
  })() :
  weatherData.temperature_2m;

  // verify data
  let convertedData = selectedData;
  if (selectedData.find(n => typeof n !== 'number' || isNaN(n))) {
    console.error("Invalid data set:", selectedData);
    convertedData = [];
  } else if (dataType === 'temperature' && temperatureUnit === 'fahrenheit') {
    // Temperature conversion functions
    const celsiusToFahrenheit = (celsius: number): number => (celsius * 9 / 5) + 32;
    convertedData = selectedData.map(celsiusToFahrenheit);
  } else if (dataType === 'brightness') {
    // ensure 0..1 and numeric
    convertedData = selectedData.map(v => (typeof v === 'number' && isFinite(v)) ? clamp01(v) : 0);
  }

  const fetchWeather = async (lat: number, lon: number, forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      const fullData = await weatherCache.executeWithCache(
        { lat, lon },
        () => getHourlyWeather(lat, lon),
        forceRefresh
      );

      // Validate API data
      if (!fullData || !fullData.time || !Array.isArray(fullData.time) || fullData.time.length === 0) {
        throw new Error("Invalid weather data received from API");
      }

      const today = new Date().toISOString().split("T")[0];

      // Log the first few times for debugging
      console.log("API times:", fullData.time.slice(0, 5));
      console.log("Today:", today);

      let filteredIndices = fullData.time
        .map((time, index) => ({ time, index }))
        .filter(({ time }) => time && time.startsWith(today))
        .map(({ index }) => index);

      // Fallback: if no data for today, use the first 24 hours
      if (filteredIndices.length === 0 && fullData.time.length >= 24) {
        filteredIndices = Array.from({ length: 24 }, (_, i) => i);
        console.log("Fallback to first 24 hours");
      }

      // If still empty, show an error
      if (filteredIndices.length === 0) {
        Alert.alert("No data", "No weather data available for this location.");
        setWeatherData(null);
        return;
      }

      // Helper function to safely get numeric value or fallback
      const safeGetNumber = (array: number[], index: number, fallback: number = 0): number => {
        const value = array?.[index];
        return (typeof value === 'number' && !isNaN(value)) ? value : fallback;
      };

      // Create filtered data with validation
      const filteredData: HourlyWeather = {
        time: filteredIndices.map((i) => fullData.time[i] || ''),
        temperature_2m: filteredIndices.map((i) => safeGetNumber(fullData.temperature_2m, i, 15)),
        apparent_temperature: filteredIndices.map((i) => safeGetNumber(fullData.apparent_temperature, i, 15)),
        relative_humidity_2m: filteredIndices.map((i) => safeGetNumber(fullData.relative_humidity_2m, i, 50)),
        precipitation: filteredIndices.map((i) => safeGetNumber(fullData.precipitation, i, 0)),
        weathercode: filteredIndices.map((i) => safeGetNumber(fullData.weathercode, i, 0)),
        uv_index: filteredIndices.map((i) => safeGetNumber(fullData.uv_index, i, 0)),
  cloudcover: filteredIndices.map((i) => safeGetNumber(fullData.cloudcover, i, 0)),
        sunrise: fullData.sunrise || [],
        sunset: fullData.sunset || [],
      };

      // Final validation - ensure we have valid temperature data
      const hasValidTemperatures = filteredData.temperature_2m.some(temp =>
        typeof temp === 'number' && !isNaN(temp) && temp > -100 && temp < 100
      );

      if (!hasValidTemperatures) {
        throw new Error("No valid temperature data available");
      }

      setWeatherData(filteredData);
      console.log("Filtered temperatures:", filteredData.temperature_2m);
    } catch (error) {
      console.error("Weather fetch error:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to get weather");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (lastCoords) {
      await fetchWeather(lastCoords.lat, lastCoords.lon, true);
    } else if (query) {
      await handleSearchByQuery(query);
    }
  };

  const handleGetLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("No access to geolocation");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const newCoords = {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      };
      setLastCoords(newCoords);
      onCoordsChange?.(newCoords);
      // Resolve a friendly name and propagate up so the input shows user's place
      try {
        const displayName = await getPlaceNameByCoordinates(newCoords.lat, newCoords.lon);
        onQueryChange?.(displayName);
      } catch {}
      await fetchWeather(newCoords.lat, newCoords.lon);
    } catch (err) {
      Alert.alert("Error", "Could not determine location");
    }
  };

  // Expose update function via ref
  useImperativeHandle(ref, () => ({
    update: handleUpdate,
    getLocation: handleGetLocation,
    search: handleSearchByQuery,
  }));

  const handleSearchByQuery = async (searchQuery: string) => {
    try {
      const coordinates = await getCoordinatesByQuery(searchQuery);
      if (!coordinates)
        throw new Error(
          'Please also enter the country. For example: "10115, Germany"'
        );
      setLastCoords(coordinates);
      onCoordsChange?.(coordinates);
      // Normalize input to a consistent display name
      try {
        const name = await getPlaceNameByCoordinates(coordinates.lat, coordinates.lon);
        onQueryChange?.(name);
      } catch {}
      await fetchWeather(coordinates.lat, coordinates.lon);
    } catch (err: any) {
      Alert.alert("Search error", err.message);
    }
  };

  // Effect to handle external coordinate changes
  useEffect(() => {
    if (coords && (coords.lat !== lastCoords?.lat || coords.lon !== lastCoords?.lon)) {
      setLastCoords(coords);
      fetchWeather(coords.lat, coords.lon);
    }
  }, [coords]);

  // Initial load effect
  useEffect(() => {
    if (query && !lastCoords) {
      handleSearchByQuery(query);
    }
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" style={{ marginTop: 20 }} />;
  }

  if (!weatherData || !weatherData.temperature_2m || weatherData.temperature_2m.length === 0) {
    return <Text style={{ color: "red", textAlign: "center" }}>No data</Text>;
  }

  return (
    <>
      <Text style={{
        textAlign: "center",
        fontSize: 16,
        marginBottom: 4,
        color: "#EEE",
      }}>
        🌅 Sunrise:{" "}
        {new Date(weatherData.sunrise[0]).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
      <Text style={{
        textAlign: "center",
        fontSize: 16,
        marginBottom: 4,
        color: "#EEE",
      }}>
        🌇 Sunset:{" "}
        {new Date(weatherData.sunset[0]).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>

      <Weather
        data={convertedData}
        currentTime={new Date().getHours()}
        style={{ marginLeft: 0, marginRight: 0, marginTop: 20 }}
        dataType={dataType}
        temperatureUnit={temperatureUnit}
      />

      <Text style={{ color: "aqua" }}>
        {convertedData.map(n => n.toFixed(0)).join("  ")}
      </Text>
    </>
  );
});

export default ConnectedWeather;

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
