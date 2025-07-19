import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import WeatherNow from './WeatherNow';
import WeatherChart from './WeatherChart';

type WeatherProps = {
  height?: number;
  currentTime: number;
};

export default function Weather({ height, currentTime }: WeatherProps) {
  // 24h temperatures: 95014, July 7, 2025 
  const temperatures = [
    59, 59, 57, 57, 57, 55, 55, 57, 61, 63, 68, 72,
    75, 79, 79, 79, 79, 79, 75, 73, 68, 64, 64, 63,
    62
  ];

  return (
    <View style={styles.weatherRow}>
      <WeatherNow
        icon={
          <MaterialIcons
            name="sunny"
            size={40}
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
