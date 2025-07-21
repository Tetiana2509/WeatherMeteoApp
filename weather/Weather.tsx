import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import WeatherNow from './WeatherNow';
import WeatherChart from './WeatherChart';

type WeatherProps = {
  height?: number;
  currentTime: number;
  temperatures?: number[];
  temperatureUnit?: 'C' | 'F';  // ADD THIS LINE
  style?: ViewStyle;
};

export default function Weather({ height, currentTime, temperatures, temperatureUnit = 'C', style }: WeatherProps) {
  // 24h temperatures + 1: 95014, July 7, 2025 
  temperatures ??= [
    59, 59, 57, 57, 57, 55, 55, 57, 61, 63, 68, 72,
    75, 79, 79, 79, 79, 79, 75, 73, 68, 64, 64, 63,
    62
  ];

  return (
    <View style={[styles.weatherRow, style]}>
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
        temperatureUnit={temperatureUnit}  // ADD THIS LINE
      />
      <WeatherChart
        temperatures={temperatures}
        height={height}
        currentTime={currentTime}
        temperatureUnit={temperatureUnit}  // ADD THIS LINE
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
