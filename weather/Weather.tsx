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
  dataType?: 'temperature' | 'precipitation';
  temperatureUnit?: 'celsius' | 'fahrenheit';
};

// Функции для форматирования единиц измерения
const formatTemperatureCelsius = (value: number): string => `${Math.round(value)}°`;
const formatTemperatureFahrenheit = (value: number): string => `${Math.round(value)}°`;
const formatPrecipitation = (value: number): string => `${value.toFixed(1)}mm`;

export default function Weather({ height, currentTime, data, style, dataType = 'temperature', temperatureUnit = 'celsius' }: WeatherProps) {
  // Validate and clean the input data
  const cleanData = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      // 24h default data values
      return [
        59, 59, 57, 57, 57, 55, 55, 57, 61, 63, 68, 72,
        75, 79, 79, 79, 79, 79, 75, 73, 68, 64, 64, 63,
        62
      ];
    }

    // Clean the data: replace NaN, undefined, null with reasonable values
    const validData = data.map((value, index) => {
      if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        // Use the previous valid value, or 20 as default temperature
        const prevValidValue = index > 0 ? data[index - 1] : 20;
        return typeof prevValidValue === 'number' && !isNaN(prevValidValue) ? prevValidValue : 20;
      }
      return value;
    });

    return validData;
  }, [data]);

  // Ensure currentTime is valid
  const safeCurrentTime = typeof currentTime === 'number' && !isNaN(currentTime) 
    ? Math.max(0, Math.min(currentTime, cleanData.length - 1)) 
    : 0;

  // Выбираем правильную функцию форматирования
  const getFormatFunction = () => {
    if (dataType === 'temperature') {
      return temperatureUnit === 'celsius' ? formatTemperatureCelsius : formatTemperatureFahrenheit;
    }
    return formatPrecipitation;
  };

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
        currentTemp={cleanData[Math.floor(safeCurrentTime)]}
        highTemp={Math.max(...cleanData)}
        lowTemp={Math.min(...cleanData)}
        dataType={dataType}
        temperatureUnit={temperatureUnit}
      />
      <WeatherChart
        data={cleanData}
        height={height}
        currentTime={safeCurrentTime}
        formatUnit={getFormatFunction()}
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
