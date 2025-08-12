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
  dataType?: 'temperature' | 'precipitation' | 'uv_index' | 'clouds';
  temperatureUnit?: 'celsius' | 'fahrenheit';
};


const formatTemperature = (value: number): string => `${Math.round(value)}°`;
const formatPrecipitation = (value: number): string => `${Math.round(value)} mm`;
const formatUVIndex = (value: number): string => `${Math.round(value * 10) / 10}`;
const formatClouds = (value: number): string => `${Math.round(value)}%`;

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

  // Apply the same Gaussian smoothing as WeatherChart so displayed values match the chart
  const smoothedData = React.useMemo(() => {
    const src = cleanData;
    if (!src || src.length === 0) return src;
    const windowSize = 5;
    const halfWindow = Math.floor(windowSize / 2);
    return src.map((_, i) => {
      let weightedSum = 0;
      let totalWeight = 0;
      for (let j = Math.max(0, i - halfWindow); j <= Math.min(src.length - 1, i + halfWindow); j++) {
        const distance = Math.abs(i - j);
        const weight = Math.exp(-0.5 * Math.pow(distance / (windowSize / 3), 2));
        weightedSum += src[j] * weight;
        totalWeight += weight;
      }
      return weightedSum / (totalWeight || 1);
    });
  }, [cleanData]);

  // Ensure currentTime is valid
  const safeCurrentTime = typeof currentTime === 'number' && !isNaN(currentTime) 
    ? Math.max(0, Math.min(currentTime, (smoothedData?.length || cleanData.length) - 1)) 
    : 0;

  
  const formatData = dataType === 'temperature' ? formatTemperature :
                     dataType === 'precipitation' ? formatPrecipitation :
                     dataType === 'clouds' ? formatClouds :
                     formatUVIndex;

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
  currentTemp={(smoothedData || cleanData)[Math.floor(safeCurrentTime)]}
  highTemp={Math.max(...cleanData)}
  lowTemp={Math.min(...cleanData)}
        formatData={formatData}
      />
      <WeatherChart
  data={cleanData}
        height={height}
        currentTime={safeCurrentTime}
        formatData={formatData}
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
