import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import WeatherNow from './WeatherNow';
import WeatherChart from './WeatherChart';

type WeatherProps = {
  height?: number;
  currentTime: number;
};

export default function Weather({ height, currentTime }: WeatherProps) {
  // 24h temperatures
  const temperatures = [
    50, 52, 54, 53, 55, 58, 60, 62,
    65, 67, 68, 70, 72, 71, 69, 66,
    64, 61, 59, 57, 55, 53, 51, 50,
  ];

  return (
    <View style={styles.weatherRow}>
      <WeatherNow
        icon={
          <MaterialCommunityIcons
            name="weather-sunny"
            size={32}
            color="#FFD94B"
          />
        }
        currentTemp={temperatures[Math.floor(currentTime)]}
        highTemp={Math.max(...temperatures)}
        lowTemp={Math.min(...temperatures)}
      />
      <WeatherChart
        temperatures={temperatures}
        height={height}
        currentTime={currentTime}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  weatherRow: {
    flexDirection: 'row',
    marginLeft: 40,
    marginRight: 20,
    marginBottom: 16
  },
});
