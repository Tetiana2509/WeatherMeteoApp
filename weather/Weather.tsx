import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import WeatherNow from './WeatherNow';
import WeatherChart from './WeatherChart';

type WeatherProps = {
  height?: number;
  currentTime: number;
  data?: number[];
  style?: ViewStyle;
};

export default function Weather({ height, currentTime, data, style }: WeatherProps) {
  // 24h default data values
  data ??= [
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
        currentTemp={data[Math.floor(currentTime)]}
        highTemp={Math.max(...data)}
        lowTemp={Math.min(...data)}
      />
      <WeatherChart
        data={data}
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
    marginRight: 25,
    marginBottom: 16
  },
});
