import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as Location from "expo-location";
import { getHourlyWeather, HourlyWeather } from "./services/meteoService";
import { getCoordinatesByQuery } from "./services/geocodingService";
import Weather from "./weather/Weather";
import { useCache } from "./hooks/useCache";

export default function App() {
  const [weatherData, setWeatherData] = useState<HourlyWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("Berlin");
  const [lastCoords, setLastCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  // Initialize cache hook with 5-minute TTL
  const weatherCache = useCache<HourlyWeather>({ ttlMinutes: 5 });
  const fetchWeather = async (lat: number, lon: number, forceRefresh: boolean = false) => {
    setLoading(true);
    try {
      const fullData = await weatherCache.executeWithCache(
        { lat, lon },
        () => getHourlyWeather(lat, lon),
        forceRefresh
      );

      const today = new Date().toISOString().split("T")[0];

      // Log the first few times for debugging
      console.log("API times:", fullData.time.slice(0, 5));
      console.log("Today:", today);

      let filteredIndices = fullData.time
        .map((time, index) => ({ time, index }))
        .filter(({ time }) => time.startsWith(today))
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

      const filteredData: HourlyWeather = {
        time: filteredIndices.map((i) => fullData.time[i]),
        temperature_2m: filteredIndices.map((i) => fullData.temperature_2m[i]),
        apparent_temperature: filteredIndices.map(
          (i) => fullData.apparent_temperature[i]
        ),
        relative_humidity_2m: filteredIndices.map(
          (i) => fullData.relative_humidity_2m[i]
        ),
        precipitation: filteredIndices.map((i) => fullData.precipitation[i]),
        weathercode: filteredIndices.map((i) => fullData.weathercode[i]),
        sunrise: fullData.sunrise,
        sunset: fullData.sunset,
      };

      setWeatherData(filteredData);
      console.log("Filtered temperatures:", filteredData.temperature_2m);
    } catch (error) {
      Alert.alert("Error", "Failed to get weather");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const coords = await getCoordinatesByQuery(query);
      if (!coords)
        throw new Error(
          'Please also enter the country. For example: "10115, Germany"'
        );
      setLastCoords(coords);
      await fetchWeather(coords.lat, coords.lon);
    } catch (err: any) {
      Alert.alert("Search error", err.message);
    }
  };

  const handleGeolocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("No access to geolocation");
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      };
      setLastCoords(coords);
      await fetchWeather(coords.lat, coords.lon);
    } catch (err) {
      Alert.alert("Error", "Could not determine location");
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (lastCoords) {
      await fetchWeather(lastCoords.lat, lastCoords.lon);
    } else if (query) {
      await handleSearch();
    } else {
      Alert.alert("Update error", "No previous location or query to update");
    }
  };

  useEffect(() => {
    const initialSearch = async () => {
      const coords = await getCoordinatesByQuery(query);
      if (coords) {
        setLastCoords(coords);
        await fetchWeather(coords.lat, coords.lon);
      }
    };
    initialSearch();
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Today's Weather</Text>

        <TextInput
          style={styles.input}
          placeholder="City, country or postal code"
          value={query}
          onChangeText={setQuery}
        />

        <TouchableOpacity style={styles.button} onPress={handleSearch}>
          <Text style={styles.buttonText}>🔍 Search</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
          <Text style={styles.buttonText}>🔄 Update</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.gpsButton} onPress={handleGeolocation}>
          <Text style={styles.buttonText}>📍 My location</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 20 }} />
        ) : weatherData &&
          weatherData.temperature_2m &&
          weatherData.temperature_2m.length > 0 ? (
          <>
            <Text style={styles.sun}>
              🌅 Sunrise:{" "}
              {new Date(weatherData.sunrise[0]).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            <Text style={styles.sun}>
              🌇 Sunset:{" "}
              {new Date(weatherData.sunset[0]).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>

            <Weather
              temperatures={weatherData.temperature_2m}
              currentTime={new Date().getHours()}
              style={{ marginLeft: 0, marginRight: 0, marginTop: 20 }}
            />

            <Text style={{ color: "aqua" }}>
              {weatherData?.temperature_2m.map((t) => t.toFixed(1)).join("  ")}
            </Text>
          </>
        ) : (
          <Text style={styles.error}>No data</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#333333" },
  container: { flex: 1, padding: 20 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    color: "white",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 10,
  },
  updateButton: {
    backgroundColor: "#FFA500",
    padding: 12,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 10,
  },
  gpsButton: {
    backgroundColor: "#34C759",
    padding: 12,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  sun: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 4,
    color: "#EEE",
  },
  error: { color: "red", textAlign: "center" },
});
