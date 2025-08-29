import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import WeatherNow from './WeatherNow';
import WeatherChart from './WeatherChart';
import { getDataTypeIcon } from './utils';
import { DataType, TapArea, TemperatureUnit } from './types';
import { getChartTheme } from './chartThemes';

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
    return getChartTheme(dataType, temperatureUnit);
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
      <WeatherChart
        data={plotData}
        height={height}
        currentTime={safeCurrentTime}
        hours={hours}
        formatData={formatData}
        chartType={dataType === 'precipitation' ? 'bar' : 'line'}
        barTheme={dataType === 'precipitation' ? {
          barColor: '#4FC3F7',
          barHighlightColor: '#0288D1',
          gradient: {
            topColor: '#B3E5FC',
            bottomColor: '#0288D1',
            topOpacity: 0.9,
            bottomOpacity: 0.5,
          },
        } : undefined}
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
    </View>
  );
}

const styles = StyleSheet.create({
  weatherRow: {
    flexDirection: 'row',
  },
});
