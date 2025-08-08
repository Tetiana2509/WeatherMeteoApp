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
  error: { color: "red", textAlign: "center" },
});
