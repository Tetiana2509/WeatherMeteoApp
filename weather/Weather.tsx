import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import WeatherNow from './WeatherNow';
import WeatherChart from './WeatherChart';
import { getDataTypeIcon } from './utils';
import { DataType, TapArea, TemperatureUnit } from './types';
import { getChartTheme } from './chartThemes';
import { FORMATTERS, clampValueForPlotting } from './dataFormatters';

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

  const formatData = FORMATTERS[dataType];

  // For plotting: use data type-specific value clamping
  const plotData = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.map((v) => 
      typeof v === 'number' ? clampValueForPlotting(v, dataType) : 0
    );

  }, [data, dataType]);

  // Per-metric chart theme (stroke + area gradient)
  const chartTheme = React.useMemo(() => {
    return getChartTheme(dataType, temperatureUnit);
  }, [dataType, temperatureUnit]);

  //onsole.log(plotData.join(", "));
  return (
    <View style={[styles.weatherRow, style]}>
      <WeatherNow
        icon={getDataTypeIcon(dataType)}
        currentValue={plotData[Math.floor(currentTime)]}
        highValue={Math.max(...plotData)}
        lowValue={Math.min(...plotData)}
        formatData={formatData}
        showSunTimes={dataType === 'brightness'}
        sunriseTime={dataType === 'brightness' ? sunriseTime : undefined}
        sunsetTime={dataType === 'brightness' ? sunsetTime : undefined}
        onTap={onTap}
      />
      <WeatherChart
        data={plotData}
        height={height}
        currentTime={currentTime}
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
