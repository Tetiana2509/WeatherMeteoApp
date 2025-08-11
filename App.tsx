import React, { useState, useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import DataTypeSwitch from "./weather/DataTypeSwitch";
import TemperatureUnitSwitch from "./weather/TemperatureUnitSwitch";
import ConnectedWeather, { ConnectedWeatherRef } from "./weather/ConnectedWeather";
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [query, setQuery] = useState("Berlin");
  const [dataType, setDataType] = useState<'temperature' | 'precipitation' | 'uv_index'>('temperature');
  const [temperatureUnit, setTemperatureUnit] = useState<'celsius' | 'fahrenheit'>('celsius');
  const [coords, setCoords] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const connectedWeatherRef = useRef<ConnectedWeatherRef>(null);

  const handleGeolocation = async () => {
    connectedWeatherRef.current?.getLocation();
  };

  const handleSearch = () => {
    connectedWeatherRef.current?.search(query);
  };

  const handleUpdate = () => {
    connectedWeatherRef.current?.update();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Today's Weather</Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.input}
            placeholder="City, country or postal code"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
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

        {/* Data Type Toggle */}
        <DataTypeSwitch value={dataType} onChange={setDataType} />

        {/* Temperature Unit Toggle - показывается только для температуры */}
        {dataType === 'temperature' && (
          <TemperatureUnitSwitch value={temperatureUnit} onChange={setTemperatureUnit} />
        )}

        <ConnectedWeather
          ref={connectedWeatherRef}
          query={query}
          dataType={dataType}
          temperatureUnit={temperatureUnit}
          coords={coords}
          onCoordsChange={setCoords}
        />
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
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: "#fff",
    flex: 1,
    marginRight: 8,
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
