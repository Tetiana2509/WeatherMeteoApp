// WeatherNow.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MadoText } from './Controls';

interface WeatherNowProps {
  icon: React.ReactNode;
  currentTemp: number;
  highTemp: number;
  lowTemp: number;
  dataType?: 'temperature' | 'precipitation';
  temperatureUnit?: 'celsius' | 'fahrenheit';
}

const WeatherNow: React.FC<WeatherNowProps> = ({
  icon,
  currentTemp,
  highTemp,
  lowTemp,
  dataType = 'temperature',
  temperatureUnit = 'celsius',
}) => {
  // Функция для форматирования единиц измерения
  const formatValue = (value: number): string => {
    if (dataType === 'precipitation') {
      return `${value.toFixed(1)}mm`;
    }
    return `${Math.round(value)}°`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>{icon}</View>
      <MadoText style={styles.currentTemp} numberOfLines={1} adjustsFontSizeToFit>
        {formatValue(currentTemp)}
      </MadoText>
      <MadoText style={styles.tempRange}>H {formatValue(highTemp)}</MadoText>
      <MadoText style={styles.tempRange}>L {formatValue(lowTemp)}</MadoText>
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
  tempRange: { fontSize: 13, fontWeight: '600', color: '#9a9a9a', marginBottom: 2 },
});
