import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import WeatherNow from './WeatherNow';
import WeatherChart from './WeatherChart';
import RainBarChart from './RainBarChart';
import { getDataTypeIcon } from './utils';
import { DataType, TapArea, TemperatureUnit } from './types';

type WeatherProps = {
  height?: number;
  currentTime: number;
  data?: number[];
  hours?: number[]; // local hour (0-23) for each data point, from API timezone
  style?: ViewStyle;  
  sunriseTime?: string | null;
  sunsetTime?: string | null;
  dataType?: DataType;
  temperatureUnit?: TemperatureUnit;
  onTap?: (area: TapArea) => void;
};

const formatTemperature = (value: number): string => `${Math.round(value)}°`;
const formatPrecipitation = (value: number): string =>
  `${Math.round(value)} mm`;
const formatUVIndex = (value: number): string =>
  `${Math.round(value * 10) / 10}`;
const formatClouds = (value: number): string => `${Math.round(value)}%`;
const formatBrightness = (value: number): string =>
  `${Math.round(value * 100)}%`;

const FORMATTER: Record<DataType, (value: number) => string> = {
  temperature: formatTemperature,
  precipitation: formatPrecipitation,
  uv_index: formatUVIndex,
  clouds: formatClouds,
  brightness: formatBrightness,
};

export default function Weather({
  height,
  currentTime,
  data,
  hours,
  style,
  dataType = 'temperature',
  temperatureUnit = 'celsius',
  sunriseTime,
  sunsetTime,
  onTap,
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

  const baseFormat = FORMATTER[dataType];

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
        };
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
        };
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
        };
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
        };
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
        };
      default:
        return undefined;
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
        showSunTimes={dataType === 'brightness'}
        sunriseTime={dataType === 'brightness' ? sunriseTime : undefined}
        sunsetTime={dataType === 'brightness' ? sunsetTime : undefined}
        onTap={onTap}
      />
      {dataType === 'precipitation' ? (
        <RainBarChart
          data={plotData}
          height={height}
          currentTime={safeCurrentTime}
          hours={hours}
          formatData={formatData}
          theme={{
            barColor: '#4FC3F7',
            barHighlightColor: '#0288D1',
            gradient: {
              topColor: '#B3E5FC',
              bottomColor: '#0288D1',
              topOpacity: 0.9,
              bottomOpacity: 0.5,
            },
          }}
        />
      ) : (
        <WeatherChart
          data={plotData}
          height={height}
          currentTime={safeCurrentTime}
          hours={hours}
          formatData={formatData}
          smooth={dataType !== 'clouds'}
          amplitudeSteps={dataType === 'temperature' ? 3 : undefined}
          fixedYDomain={
            dataType === 'clouds'
              ? { min: 0, max: 100 }
              : dataType === 'brightness'
              ? { min: 0, max: 1 }
              : undefined
          }
          theme={chartTheme}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  weatherRow: {
    flexDirection: 'row',
  },
});
