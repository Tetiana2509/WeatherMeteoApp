import React, { useState, useRef } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import DataTypeSwitch from "./weather/DataTypeSwitch";
import TemperatureUnitSwitch from "./weather/TemperatureUnitSwitch";
import ConnectedWeather, {
  ConnectedWeatherRef,
} from "./weather/ConnectedWeather";
import LocationInput from "./weather/LocationInput";
import { Ionicons } from "@expo/vector-icons";
import { DataType, TemperatureUnit, Coords } from "./weather/WeatherTypes";

export default function App() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [dataType, setDataType] = useState<DataType>("temperature");
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>("celsius");

  const connectedWeatherRef = useRef<ConnectedWeatherRef>(null);

  const handleUpdate = () => {
    connectedWeatherRef.current?.update();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Today's Weather</Text>

        <LocationInput coords={coords} onCoordsChange={setCoords} />

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

            <View style={styles.reloadContainer}>
              <TouchableOpacity
                style={styles.reloadButton}
                onPress={handleUpdate}
                accessibilityRole="button"
                accessibilityLabel="Reload weather data"
              >
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.reloadButtonText}>Reload</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!coords && (
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
  reloadContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  reloadButton: {
    backgroundColor: "#2C2C2E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 8,
  },
  reloadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
