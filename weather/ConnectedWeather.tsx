import React, {
  useImperativeHandle,
  forwardRef,
} from 'react';
import { Text, ActivityIndicator, ViewStyle } from 'react-native';
import Weather from './Weather';
import { useWeatherData } from './hooks/useWeatherData';
import { DataType, TemperatureUnit, Coords, TapArea } from './types';
import { getCurrentHourIndex, getSunriseSunsetTimes } from './timeUtils';
import { selectSeries, convertSeries } from './dataUtils';

type Props = {
  dataType: DataType;
  temperatureUnit: TemperatureUnit;
  coords?: Coords | null;
  onTap?: (area: TapArea) => void;
  currentTime?: number;
  style?: ViewStyle;
};

export type ConnectedWeatherRef = {
  update: () => Promise<void>;
};

export const ConnectedWeather = forwardRef<ConnectedWeatherRef, Props>(
  ({ dataType, temperatureUnit, coords, onTap, currentTime, style }, ref) => {
    // Use the new weather data hook
    const { weatherData, loading, update } = useWeatherData(coords);

    // Select and convert data using utility functions
    const selectedData = selectSeries(
      weatherData,
      dataType,
      coords?.lat ?? 0,
      coords?.lon ?? 0
    );

    const convertedData = convertSeries(selectedData, dataType, temperatureUnit);

    useImperativeHandle(ref, () => ({
      update,
    }));

    if (loading) {
      return <ActivityIndicator size="large" style={{ marginTop: 20 }} />;
    }

    if (
      !weatherData ||
      !weatherData.temperature_2m ||
      weatherData.temperature_2m.length === 0
    ) {
      return <Text style={{ color: 'red', textAlign: 'center' }}>No data</Text>;
    }

    // Choose sunrise/sunset for the same local day as the filtered hourly series
    const { sunriseTime, sunsetTime } = getSunriseSunsetTimes(weatherData);

    // Compute current hour index in the location's local time based on API timezone
    const currentHourIndex = getCurrentHourIndex(weatherData);
    
    currentTime ??= new Date().getHours();

    return (
      <>
        <Weather
          data={convertedData}
          currentTime={currentHourIndex}
          hours={weatherData?.time?.map((t) => parseInt(t.slice(11, 13), 10))}
          dataType={dataType}
          temperatureUnit={temperatureUnit}
          sunriseTime={sunriseTime}
          sunsetTime={sunsetTime}
          style={style}
          onTap={onTap}
        />

        {/* <Text style={{ color: "aqua" }}>
        {convertedData
          .map(n => {
            if (dataType === 'brightness') {
              // Show as percent with no decimals to make it readable, but not collapse to 0/1
              const pct = Math.round(Math.max(0, Math.min(1, n)) * 100);
              return `${pct}%`;
            }
            return n.toFixed(0);
          })
          .join("  ")}
      </Text> */}
      </>
    );
  },
);
