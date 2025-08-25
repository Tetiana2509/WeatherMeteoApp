import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import DataTypeSwitch, { nextDataType } from './DataTypeSwitch';
import TemperatureUnitSwitch from './TemperatureUnitSwitch';
import { Ionicons } from '@expo/vector-icons';
import {
  DataType,
  TemperatureUnit,
  Coords,
  ConnectedWeather,
  ConnectedWeatherRef,
  LocationInput,
} from './weather';
import { COLORS } from './styling';

export default function App() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [dataType, setDataType] = useState<DataType>('temperature');
  const [temperatureUnit, setTemperatureUnit] =
    useState<TemperatureUnit>('celsius');

  const connectedWeatherRef = useRef<ConnectedWeatherRef>(null);

  const handleUpdate = () => {
    connectedWeatherRef.current?.update();
  };

  const handleIconTap = () => {
    setDataType(nextDataType(dataType));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Text style={styles.title}>Today's Weather</Text>

        <LocationInput coords={coords} onCoordsChange={setCoords} />

        {coords && (
          <>
            <DataTypeSwitch value={dataType} onChange={setDataType} />

            <ConnectedWeather
              ref={connectedWeatherRef}
              dataType={dataType}
              temperatureUnit={temperatureUnit}
              coords={coords}
              onIconTap={handleIconTap}
            />

            <View style={styles.reloadContainer}>
              {dataType === 'temperature' && (
                <TemperatureUnitSwitch
                  value={temperatureUnit}
                  onChange={setTemperatureUnit}
                  style={styles.temperatureUnitInline}
                />
              )}
              <TouchableOpacity
                style={styles.reloadButton}
                onPress={handleUpdate}
                accessibilityRole="button"
                accessibilityLabel="Reload weather data"
              >
                <Ionicons name="refresh" size={20} color={COLORS.controlsFG} />
                <Text style={styles.reloadButtonText}>Reload</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {!coords && (
          <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 20 }}>
            Enter a location or use your current location to see weather data
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#333333' },
  container: { flex: 1, padding: 20, gap: 4 },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    color: 'white',
  },
  reloadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 16,
  },
  temperatureUnitInline: {
    marginBottom: 0,
  },
  reloadButton: {
    backgroundColor: COLORS.controlsBG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    gap: 8,
  },
  reloadButtonText: {
    color: COLORS.controlsFG,
    fontSize: 16,
    fontWeight: '600',
  },
});
