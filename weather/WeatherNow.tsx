// WeatherNow.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MadoText } from './Controls';

interface WeatherNowProps {
  icon: React.ReactNode;
  currentTemp: number;
  highTemp: number;
  lowTemp: number;
  /** Function to format units (e.g., temperature or precipitation) */
  formatData: (value: number) => string;
  /** Callback when icon is tapped */
  onIconTap?: () => void;
}

const WeatherNow: React.FC<WeatherNowProps> = ({
  icon,
  currentTemp,
  highTemp,
  lowTemp,
  formatData,
  onIconTap,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={onIconTap}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Switch data type"
      >
        {icon}
      </TouchableOpacity>
      <MadoText
        style={styles.currentTemp}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {formatData(currentTemp)}
      </MadoText>
      <MadoText style={styles.tempRange}>H {formatData(highTemp)}</MadoText>
      <MadoText style={styles.tempRange}>L {formatData(lowTemp)}</MadoText>
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
