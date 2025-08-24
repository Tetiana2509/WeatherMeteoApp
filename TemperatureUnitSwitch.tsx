import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { TemperatureUnit } from './weather/WeatherTypes';

type Props = {
  value: TemperatureUnit;
  onChange: (value: TemperatureUnit) => void;
  style?: ViewStyle;
};

const TemperatureUnitSwitch: React.FC<Props> = ({ value, onChange, style }) => {
  return (
    <View style={[styles.temperatureUnitContainer, style]}>
      <TouchableOpacity
        style={[
          styles.unitButton,
          value === 'celsius' && styles.activeUnitButton
        ]}
        onPress={() => onChange('celsius')}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'celsius' }}
      >
        <Text style={[
          styles.unitButtonText,
          value === 'celsius' && styles.activeUnitButtonText
        ]}>
          °C
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.unitButton,
          value === 'fahrenheit' && styles.activeUnitButton
        ]}
        onPress={() => onChange('fahrenheit')}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'fahrenheit' }}
      >
        <Text style={[
          styles.unitButtonText,
          value === 'fahrenheit' && styles.activeUnitButtonText
        ]}>
          °F
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default TemperatureUnitSwitch;

const styles = StyleSheet.create({
  temperatureUnitContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#1C1C1E',
    borderRadius: 6,
    padding: 2,
    alignSelf: 'center',
  },
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginHorizontal: 1,
  },
  activeUnitButton: {
    backgroundColor: '#007AFF',
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeUnitButtonText: {
    color: '#FFFFFF',
  },
});

export { TemperatureUnit };
