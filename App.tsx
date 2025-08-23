import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import DataTypeSwitch from "./weather/DataTypeSwitch";
import TemperatureUnitSwitch from "./weather/TemperatureUnitSwitch";
import ConnectedWeather, {
  ConnectedWeatherRef,
} from "./weather/ConnectedWeather";
import { useLocation, useCurrentLocation } from "./hooks/useLocation";
import { Ionicons } from "@expo/vector-icons";
import { DataType, TemperatureUnit } from "./weather/WeatherTypes";

export default function App() {
  const [location, setLocation] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [dataType, setDataType] = useState<DataType>("temperature");
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>("celsius");
  const [hasInitialized, setHasInitialized] = useState(false);
  const [shouldUseCurrentLocation, setShouldUseCurrentLocation] = useState(false);

  const { coords: locationCoords, status } = useLocation(location);
  const currentLocationCoords = useCurrentLocation();
  const connectedWeatherRef = useRef<ConnectedWeatherRef>(null);

  // Use location coords if available, otherwise current location only if explicitly requested
  const coords = locationCoords || (shouldUseCurrentLocation ? currentLocationCoords : null);

  // Update input when using current location coordinates - only on initial load
  useEffect(() => {
    if (!hasInitialized && shouldUseCurrentLocation && currentLocationCoords?.displayName && !inputValue) {
      setInputValue(currentLocationCoords.displayName);
      setHasInitialized(true);
    }
  }, [currentLocationCoords, shouldUseCurrentLocation, inputValue, hasInitialized]);

  // Update input value when location is resolved from search
  useEffect(() => {
    if (locationCoords?.displayName && locationCoords.displayName !== inputValue) {
      setInputValue(locationCoords.displayName);
    }
  }, [locationCoords?.displayName]);

  const handleGeolocation = () => {
    if (currentLocationCoords?.displayName) {
      setLocation("");
      setInputValue(currentLocationCoords.displayName);
      setShouldUseCurrentLocation(true);
    }
  };

  const handleSearch = () => {
    setLocation(inputValue);
    setShouldUseCurrentLocation(false);
  };

  const handleClear = () => {
    setInputValue("");
    setLocation("");
    setShouldUseCurrentLocation(false);
  };

  const handleUpdate = () => {
    connectedWeatherRef.current?.update();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Today's Weather</Text>

        <View style={styles.searchContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="City, country or postal code"
              value={inputValue}
              onChangeText={setInputValue}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {inputValue.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={handleClear}
                accessibilityRole="button"
                accessibilityLabel="Clear input"
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.iconsContainer}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleGeolocation}
              accessibilityRole="button"
              accessibilityLabel="Use my location"
            >
              <Ionicons name="location" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleUpdate}
              accessibilityRole="button"
              accessibilityLabel="Update"
            >
              <Ionicons name="refresh" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {status && (
          <Text
            style={status === "loading" ? { color: "yellow" } : styles.error}
          >
            {status === "loading" ? "Loading location..." : status}
          </Text>
        )}

        {coords && (
          <>
            <DataTypeSwitch value={dataType} onChange={setDataType} />

            {dataType === "temperature" && (
              <TemperatureUnitSwitch
                value={temperatureUnit}
                onChange={setTemperatureUnit}
              />
            )}

            <ConnectedWeather
              ref={connectedWeatherRef}
              dataType={dataType}
              temperatureUnit={temperatureUnit}
              coords={coords}
            />
          </>
        )}

        {!coords && !status && (
          <Text style={{ color: "#aaa", textAlign: "center", marginTop: 20 }}>
            Enter a location or use your current location to see weather data
          </Text>
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  inputContainer: {
    flex: 1,
    position: "relative",
    marginRight: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingRight: 40, // Space for clear button
    height: 44,
    backgroundColor: "#fff",
  },
  clearButton: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -10 }], // Half of icon size for perfect centering
    padding: 2,
  },
  iconsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    backgroundColor: "#2C2C2E",
    padding: 10,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    marginLeft: 6,
  },
  button: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 25,
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "red", textAlign: "center" },
});
