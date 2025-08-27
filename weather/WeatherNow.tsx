// WeatherNow.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MadoText } from './Controls';
import { TapArea } from './types';

interface WeatherNowProps {
  icon: React.ReactNode;
  currentTemp: number;
  highTemp: number;
  lowTemp: number;
  /** Function to format units (e.g., temperature or precipitation) */
  formatData: (value: number) => string;
  /** If true, show sunrise/sunset instead of H/L (for brightness) */
  showSunTimes?: boolean;
  /** Local time strings like YYYY-MM-DDTHH:MM for sunrise/sunset */
  sunriseTime?: string | null;
  sunsetTime?: string | null;
  /** Callback when an area is tapped */
  onTap?: (area: TapArea) => void;
}

const WeatherNow: React.FC<WeatherNowProps> = ({
  icon,
  currentTemp,
  highTemp,
  lowTemp,
  formatData,
  showSunTimes,
  sunriseTime,
  sunsetTime,
  onTap,
}) => {
  const formatHHmm = React.useCallback((s?: string | null) => {
    if (!s || typeof s !== 'string' || s.length < 16) return '--:--';
    // Expecting local string like 2025-08-27T06:12
    return s.slice(11, 16);
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={() => onTap?.('icon')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Switch data type"
      >
        {icon}
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onTap?.('value')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Switch data type"
      >
        <MadoText
          style={styles.currentTemp}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatData(currentTemp)}
        </MadoText>
      </TouchableOpacity>
      {showSunTimes ? (
        <>
          <MadoText style={styles.tempRange}>🌅 {formatHHmm(sunriseTime)}</MadoText>
          <MadoText style={styles.tempRange}>🌇 {formatHHmm(sunsetTime)}</MadoText>
        </>
      ) : (
        <>
          <MadoText style={styles.tempRange}>H {formatData(highTemp)}</MadoText>
          <MadoText style={styles.tempRange}>L {formatData(lowTemp)}</MadoText>
        </>
      )}
    </View>
  );
};

export default WeatherNow;

const styles = StyleSheet.create({
  container: {
    width: 65,
    alignItems: 'flex-start',
    paddingTop: 10,
    marginRight: 10,
  },
  iconContainer: { marginBottom: 8 },
  currentTemp: {
    fontSize: 34,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  tempRange: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9a9a9a',
    marginBottom: 2,
  },
});
