import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  // Ensure currentTime is valid
  const safeCurrentTime = typeof currentTime === 'number' && !isNaN(currentTime) 
  ? Math.max(0, Math.min(currentTime, cleanData.length - 1)) 
    : 0;

  
  const formatData = dataType === 'temperature' ? formatTemperature :
                     dataType === 'precipitation' ? formatPrecipitation :
                     dataType === 'clouds' ? formatClouds :
                     formatUVIndex;

  // Per-metric chart theme (stroke + area gradient)
  const chartTheme = React.useMemo(() => {
    switch (dataType) {
      case 'temperature':
        return {
          strokeColor: '#FFA726',
          gradientTopColor: '#FFE082',
          gradientBottomColor: '#4FC3F7',
          gradientTopOpacity: 0.75,
          gradientBottomOpacity: 0.35,
          gradientStops: [
            { offset: '0%', color: '#FFE082', opacity: 0.85 },
            { offset: '65%', color: '#81D4FA', opacity: 0.5 },
            { offset: '100%', color: '#4FC3F7', opacity: 0.35 },
          ],
        } as const;
      case 'precipitation':
        return {
          strokeColor: '#29B6F6',
          gradientTopColor: '#B3E5FC',
          gradientBottomColor: '#0288D1',
          gradientTopOpacity: 0.75,
          gradientBottomOpacity: 0.45,
          gradientStops: [
            { offset: '0%', color: '#B3E5FC', opacity: 0.85 },
            { offset: '60%', color: '#4FC3F7', opacity: 0.55 },
            { offset: '100%', color: '#0288D1', opacity: 0.45 },
          ],
        } as const;
      case 'uv_index':
        return {
          strokeColor: '#66BB6A',
          gradientTopColor: '#C8E6C9',
          gradientBottomColor: '#43A047',
          gradientTopOpacity: 0.75,
          gradientBottomOpacity: 0.45,
          gradientStops: [
            { offset: '0%', color: '#C8E6C9', opacity: 0.85 },
            { offset: '60%', color: '#81C784', opacity: 0.6 },
            { offset: '100%', color: '#43A047', opacity: 0.45 },
          ],
        } as const;
      case 'clouds':
        return {
          strokeColor: '#90A4AE',
          gradientTopColor: '#ECEFF1',
          gradientBottomColor: '#90A4AE',
          gradientTopOpacity: 0.9,
          gradientBottomOpacity: 0.45,
          gradientStops: [
            { offset: '0%', color: '#ECEFF1', opacity: 0.9 },
            { offset: '50%', color: '#CFD8DC', opacity: 0.7 },
            { offset: '100%', color: '#90A4AE', opacity: 0.45 },
          ],
        } as const;
      default:
        return undefined as any;
    }
  }, [dataType]);

  return (
    <View style={[styles.weatherRow, style]}>
      <WeatherNow
        icon={(
          (() => {
            const iconName = dataType === 'precipitation' ? 'rainy' : dataType === 'clouds' ? 'cloud' : 'sunny';
            const iconColor = dataType === 'precipitation' ? '#76A9FF' : dataType === 'clouds' ? '#B0BEC5' : '#FFD94B';
            return <Ionicons name={iconName as any} size={40} color={iconColor} />;
          })()
        )}
  currentTemp={cleanData[Math.floor(safeCurrentTime)]}
  highTemp={Math.max(...cleanData)}
  lowTemp={Math.min(...cleanData)}
        formatData={formatData}
      />
      <WeatherChart
        data={cleanData}
        height={height}
        currentTime={safeCurrentTime}
        formatData={formatData}
        smooth={dataType !== 'clouds'}
        theme={chartTheme}
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
