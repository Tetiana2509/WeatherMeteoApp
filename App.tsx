import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { getHourlyWeather, HourlyWeather } from './services/meteoService';
import { getCoordinatesByQuery } from './services/geocodingService';
import WeatherChart from './WeatherChart';

export default function App() {
  const [weatherData, setWeatherData] = useState<HourlyWeather | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('Berlin');

  const fetchWeather = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const fullData = await getHourlyWeather(lat, lon);
      const today = new Date().toISOString().split('T')[0];

      const filteredIndices = fullData.time
        .map((time, index) => ({ time, index }))
        .filter(({ time }) => time.startsWith(today))
        .map(({ index }) => index);

      const filteredData: HourlyWeather = {
        time: filteredIndices.map(i => fullData.time[i]),
        temperature_2m: filteredIndices.map(i => fullData.temperature_2m[i]),
        apparent_temperature: filteredIndices.map(i => fullData.apparent_temperature[i]),
        relative_humidity_2m: filteredIndices.map(i => fullData.relative_humidity_2m[i]),
        precipitation: filteredIndices.map(i => fullData.precipitation[i]),
        weathercode: filteredIndices.map(i => fullData.weathercode[i]),
        sunrise: fullData.sunrise,
        sunset: fullData.sunset,
      };

      setWeatherData(filteredData);
    } catch (error) {
      Alert.alert('Error', 'Failed to get weather');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const coords = await getCoordinatesByQuery(query);
      if (!coords) throw new Error('Please also enter the country. For example: "10115, Germany"');
      fetchWeather(coords.lat, coords.lon);
    } catch (err: any) {
      Alert.alert('Search error', err.message);
    }
  };

  const handleGeolocation = async () => {
    setLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('No access to geolocation');
        setLoading(false);
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      fetchWeather(location.coords.latitude, location.coords.longitude);
    } catch (err) {
      Alert.alert('Error', 'Could not determine location');
    }
    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!query) return;
    await handleSearch();
  };

  useEffect(() => {
    handleSearch();
  }, []);

  const renderItem = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.card}>
      <Text style={styles.time}>
        {new Date(item).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </Text>
      <Text style={styles.temp}>
        {Math.round(weatherData?.temperature_2m[index] ?? 0)}°C
      </Text>
      <Text style={styles.label}>
        Feels like: {Math.round(weatherData?.apparent_temperature[index] ?? 0)}°C
      </Text>
      <Text style={styles.label}>
        Humidity: {weatherData?.relative_humidity_2m[index] ?? 0}%
      </Text>
      <Text style={styles.label}>
        Precipitation: {weatherData?.precipitation[index]?.toFixed(1) ?? 0} mm
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
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
      ) : weatherData ? (
        <>
          <Text style={styles.sun}>
            🌅 Sunrise: {new Date(weatherData.sunrise[0]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.sun}>
            🌇 Sunset: {new Date(weatherData.sunset[0]).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>

          <FlatList
            data={weatherData.time}
            renderItem={renderItem}
            keyExtractor={(item, index) => item + index}
            ListHeaderComponent={
              <View style={{ marginBottom: 20, alignItems: 'center', width: '100%' }}>
                <WeatherChart
                  temperatures={weatherData.temperature_2m}
                  currentTime={new Date().getHours()}
                />
              </View>
            }
          />
        </>
      ) : (
        <Text style={styles.error}>No data</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f2f6fc' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  updateButton: {
    backgroundColor: '#FFA500',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  gpsButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    marginVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  time: { fontSize: 16, color: '#555' },
  temp: { fontSize: 24, fontWeight: 'bold', color: '#007AFF' },
  label: { fontSize: 14, color: '#444', marginTop: 2 },
  sun: {
    textAlign: 'center',
    fontSize: 16,
    marginBottom: 4,
    color: '#444',
  },
  error: { color: 'red', textAlign: 'center' },
});