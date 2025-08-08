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
  const [dataType, setDataType] = useState<'temperature' | 'precipitation' | 'uv_index'>('temperature');
  const [temperatureUnit, setTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('celsius');
  const [lastCoords, setLastCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  // Initialize cache hook with 5-minute TTL
  const weatherCache = useCache<HourlyWeather>({ ttlMinutes: 5 });

  // select data to use
  const selectedData = 
    weatherData == null ? [] : 
    dataType === 'precipitation' ? weatherData.precipitation : 
    dataType === 'uv_index' ? weatherData.uv_index :
    weatherData.temperature_2m;

  // verify data
  let convertedData = selectedData;
  if (selectedData.find(n => typeof n !== 'number' || isNaN(n))) {
    console.error("Invalid data set:", selectedData);
    convertedData = [];
  } else if (dataType === 'temperature' && temperatureUnit === 'fahrenheit') {
    // Temperature conversion functions
    const celsiusToFahrenheit = (celsius: number): number => (celsius * 9/5) + 32;
    convertedData = selectedData.map(celsiusToFahrenheit);
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

        {/* Data Type Toggle */}
        <View style={styles.dataTypeContainer}>
          <TouchableOpacity
            style={[
              styles.dataTypeButton,
              dataType === 'temperature' && styles.activeDataTypeButton
            ]}
            onPress={() => setDataType('temperature')}
          >
            <Text style={[
              styles.dataTypeButtonText,
              dataType === 'temperature' && styles.activeDataTypeButtonText
            ]}>
              🌡️ Temperature
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.dataTypeButton,
              dataType === 'precipitation' && styles.activeDataTypeButton
            ]}
            onPress={() => setDataType('precipitation')}
          >
            <Text style={[
              styles.dataTypeButtonText,
              dataType === 'precipitation' && styles.activeDataTypeButtonText
            ]}>
              🌧️ Rain
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dataTypeButton,
              dataType === 'uv_index' && styles.activeDataTypeButton
            ]}
            onPress={() => setDataType('uv_index')}
          >
            <Text style={[
              styles.dataTypeButtonText,
              dataType === 'uv_index' && styles.activeDataTypeButtonText
            ]}>
              ☀️ UV Index
            </Text>
          </TouchableOpacity>
        </View>

        {/* Temperature Unit Toggle - показывается только для температуры */}
        {dataType === 'temperature' && (
          <View style={styles.temperatureUnitContainer}>
            <TouchableOpacity
              style={[
                styles.unitButton,
                temperatureUnit === 'celsius' && styles.activeUnitButton
              ]}
              onPress={() => setTemperatureUnit('celsius')}
            >
              <Text style={[
                styles.unitButtonText,
                temperatureUnit === 'celsius' && styles.activeUnitButtonText
              ]}>
                °C
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.unitButton,
                temperatureUnit === 'fahrenheit' && styles.activeUnitButton
              ]}
              onPress={() => setTemperatureUnit('fahrenheit')}
            >
              <Text style={[
                styles.unitButtonText,
                temperatureUnit === 'fahrenheit' && styles.activeUnitButtonText
              ]}>
                °F
              </Text>
            </TouchableOpacity>
          </View>
        )}

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
  dataTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 2,
  },
  dataTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeDataTypeButton: {
    backgroundColor: '#007AFF',
  },
  dataTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeDataTypeButtonText: {
    color: '#FFFFFF',
  },
  temperatureUnitContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#1C1C1E',
    borderRadius: 6,
    padding: 2,
    alignSelf: 'center',
  },
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginHorizontal: 1,
  },
  activeUnitButton: {
    backgroundColor: '#007AFF',
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeUnitButtonText: {
    color: '#FFFFFF',
  },
});
