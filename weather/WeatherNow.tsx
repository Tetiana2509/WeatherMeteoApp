// WeatherNow.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MadoText } from './Controls';

interface WeatherNowProps {
  icon: React.ReactNode;
  currentTemp: number;
  highTemp: number;
  lowTemp: number;
}

const WeatherNow: React.FC<WeatherNowProps> = ({
  icon,
  currentTemp,
  highTemp,
  lowTemp,
}) => (
  <View style={styles.container}>
    <View style={styles.iconContainer}>{icon}</View>
    <MadoText style={styles.currentTemp} numberOfLines={1} adjustsFontSizeToFit>{currentTemp}°</MadoText>
    <MadoText style={styles.tempRange}>H {highTemp}°</MadoText>
    <MadoText style={styles.tempRange}>L {lowTemp}°</MadoText>
  </View>
);

export default WeatherNow;

const styles = StyleSheet.create({
  container: {
    width: 60,
    alignItems: 'flex-start',
    paddingTop: 10,
    marginRight: 20,
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
