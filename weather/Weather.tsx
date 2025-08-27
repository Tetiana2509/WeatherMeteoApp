import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import WeatherNow from './WeatherNow';
import WeatherChart from './WeatherChart';
import { DataType } from './WeatherTypes';

type WeatherProps = {
  height?: number;
  currentTime: number;
  data?: number[];
  hours?: number[]; // local hour (0-23) for each data point, from API timezone
  style?: ViewStyle;
  dataType?:
    | 'temperature'
    | 'precipitation'
    | 'uv_index'
    | 'clouds'
    | 'brightness';
  temperatureUnit?: 'celsius' | 'fahrenheit';
  onIconTap?: () => void;
  sunriseTime?: string | null;
  sunsetTime?: string | null;
};

const formatTemperature = (value: number): string => `${Math.round(value)}°`;
const formatPrecipitation = (value: number): string =>
  `${Math.round(value)} mm`;
const formatUVIndex = (value: number): string =>
  `${Math.round(value * 10) / 10}`;
const formatClouds = (value: number): string => `${Math.round(value)}%`;
const formatBrightness = (value: number): string =>
  `${Math.round(value * 100)}%`;

export default function Weather({
  height,
  currentTime,
  data,
  hours,
  style,
  dataType = 'temperature',
  temperatureUnit = 'celsius',
  onIconTap,
  sunriseTime,
  sunsetTime,
}: WeatherProps) {
  // Validate and clean the input data
  const cleanData = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      // 24h default data values
      return [
        59, 59, 57, 57, 57, 55, 55, 57, 61, 63, 68, 72, 75, 79, 79, 79, 79, 79,
        75, 73, 68, 64, 64, 63, 62,
      ];
    }

    // Clean the data: replace NaN, undefined, null with reasonable values
    const validData = data.map((value, index) => {
      if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        // Use the previous valid value, or 20 as default temperature
        const prevValidValue = index > 0 ? data[index - 1] : 20;
        return typeof prevValidValue === 'number' && !isNaN(prevValidValue)
          ? prevValidValue
          : 20;
      }
      return value;
    });

    return validData;
  }, [data]);

  // Ensure currentTime is valid
  const safeCurrentTime =
    typeof currentTime === 'number' && !isNaN(currentTime)
      ? Math.max(0, Math.min(currentTime, cleanData.length - 1))
      : 0;

  // Choose base formatter by data type
  const baseFormat =
    dataType === 'temperature'
      ? formatTemperature
      : dataType === 'precipitation'
      ? formatPrecipitation
      : dataType === 'clouds'
      ? formatClouds
      : dataType === 'brightness'
      ? formatBrightness
      : formatUVIndex;

  // For display: temperature as-is; clouds clamped to [0,100]; others clamped to >=0
  const formatData = (value: number) => {
    let v = value;
    if (dataType === 'clouds') v = Math.max(0, Math.min(100, value));
    else if (dataType !== 'temperature') v = Math.max(0, value);
    return baseFormat(v);
  };

  // For plotting: temperature as-is; clouds clamped to [0,100]; others clamped to >=0
  const plotData = React.useMemo(() => {
    if (dataType === 'temperature') return cleanData;
    if (dataType === 'clouds')
      return cleanData.map((v) =>
        typeof v === 'number' ? Math.max(0, Math.min(100, v)) : 0,
      );
    return cleanData.map((v) => (typeof v === 'number' ? Math.max(0, v) : 0));
  }, [cleanData, dataType]);

  // Per-metric chart theme (stroke + area gradient)
  const chartTheme = React.useMemo(() => {
    switch (dataType) {
      case 'temperature':
        // Value-based gradient similar to clouds (unit-aware)
        const tempStops =
          temperatureUnit === 'fahrenheit'
            ? [
                { value: 104, color: '#FB8C00', opacity: 0.9 }, // 40°C deep orange
                { value: 86, color: '#FFA726', opacity: 0.88 }, // 30°C orange
                { value: 68, color: '#FDD835', opacity: 0.82 }, // 20°C yellow
                { value: 50, color: '#26C6DA', opacity: 0.68 }, // 10°C teal
                { value: 32, color: '#1976D2', opacity: 0.62 }, // 0°C strong blue
                { value: 14, color: '#0D47A1', opacity: 0.58 }, // -10°C deep blue
              ]
            : [
                { value: 40, color: '#FB8C00', opacity: 0.9 }, // deep orange
                { value: 30, color: '#FFA726', opacity: 0.88 }, // orange
                { value: 20, color: '#FDD835', opacity: 0.82 }, // yellow
                { value: 10, color: '#26C6DA', opacity: 0.68 }, // teal
                { value: 0, color: '#1976D2', opacity: 0.62 }, // strong blue at freezing
                { value: -10, color: '#0D47A1', opacity: 0.58 }, // deep blue below freezing
              ];
        return {
          strokeColor: '#FFA726',
          gradientTopColor: '#FFE082',
          gradientBottomColor: '#4FC3F7',
          gradientTopOpacity: 0.85,
          gradientBottomOpacity: 0.4,
          gradientValueStops: tempStops,
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
          // Apple-like UV gradient: pink (extreme) → orange → yellow → green (low)
          gradientTopColor: '#EC407A',
          gradientBottomColor: '#43A047',
          gradientTopOpacity: 0.9,
          gradientBottomOpacity: 0.45,
          // Value-based stops: align to UVI bands (>=9 pink, >=6 orange, >=3 yellow, else green)
          gradientValueStops: [
            { value: 12, color: '#EC407A', opacity: 0.95 }, // near max/extreme
            { value: 9, color: '#EC407A', opacity: 0.9 }, // pink band start
            { value: 6, color: '#FF7043', opacity: 0.85 }, // orange band start
            { value: 3, color: '#FBC02D', opacity: 0.75 }, // yellow band start
            { value: 0, color: '#43A047', opacity: 0.55 }, // green to bottom
          ],
        } as const;
      case 'clouds':
        return {
          strokeColor: '#90A4AE',
          gradientTopColor: '#ECEFF1',
          gradientBottomColor: '#90A4AE',
          gradientTopOpacity: 0.9,
          gradientBottomOpacity: 0.45,
          // Value-based gradient: 0% clear (blue) → 100% overcast (gray)
          gradientValueStops: [
            { value: 100, color: '#90A4AE', opacity: 0.65 }, // overcast gray (top)
            { value: 75, color: '#CFD8DC', opacity: 0.6 }, // broken clouds
            { value: 50, color: '#ECEFF1', opacity: 0.58 }, // scattered → near white
            { value: 25, color: '#B3E5FC', opacity: 0.52 }, // few clouds, pale blue
            { value: 0, color: '#4FC3F7', opacity: 0.5 }, // clear sky blue (bottom)
          ],
        } as const;
      case 'brightness':
        return {
          strokeColor: '#FFD54F',
          gradientTopColor: '#FFF59D',
          gradientBottomColor: '#0D47A1',
          gradientTopOpacity: 0.9,
          gradientBottomOpacity: 0.5,
          // For brightness index values 0..1 (value-aligned like UV and Clouds)
          gradientValueStops: [
            { value: 1.0, color: '#FFF59D', opacity: 0.95 }, // bright yellow
            { value: 0.7, color: '#FFD54F', opacity: 0.85 }, // sunlight
            { value: 0.4, color: '#26C6DA', opacity: 0.65 }, // teal twilight
            { value: 0.2, color: '#1976D2', opacity: 0.6 }, // blue dusk
            { value: 0.0, color: '#0D47A1', opacity: 0.55 }, // deep night
          ],
        } as const;
      default:
        return undefined as any;
    }
  }, [dataType, temperatureUnit]);

  return (
    <View style={[styles.weatherRow, style]}>
      <WeatherNow
        icon={getDataTypeIcon(dataType)}
        currentTemp={cleanData[Math.floor(safeCurrentTime)]}
        highTemp={Math.max(...cleanData)}
        lowTemp={Math.min(...cleanData)}
        formatData={formatData}
        onIconTap={onIconTap}
  showSunTimes={dataType === 'brightness'}
  sunriseTime={dataType === 'brightness' ? sunriseTime : undefined}
  sunsetTime={dataType === 'brightness' ? sunsetTime : undefined}
      />
      <WeatherChart
        data={plotData}
        height={height}
        currentTime={safeCurrentTime}
  hours={hours}
        formatData={formatData}
        smooth={dataType !== 'clouds'}
        amplitudeSteps={dataType === 'temperature' ? 3 : undefined}
  fixedYDomain={dataType === 'clouds' ? { min: 0, max: 100 } : undefined}
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
    marginBottom: 16,
  },
});

// Shared function to get icon component for each data type
export const getDataTypeIcon = (
  dataType: DataType,
  size: number = 40,
  customColor?: string,
): React.ReactNode => {
  const iconName =
    dataType === 'precipitation'
      ? 'rainy'
      : dataType === 'clouds'
      ? 'cloud'
      : dataType === 'uv_index'
      ? 'sunny'
      : dataType === 'brightness'
      ? 'contrast-outline'
      : 'thermometer';

  // Use custom color if provided, otherwise use default colors
  const iconColor =
    customColor ||
    (dataType === 'precipitation'
      ? '#76A9FF'
      : dataType === 'clouds'
      ? '#B0BEC5'
      : dataType === 'uv_index'
      ? '#66BB6A'
      : dataType === 'brightness'
      ? '#FFD54F'
      : '#FFD94B');

  return <Ionicons name={iconName as any} size={size} color={iconColor} />;
};
