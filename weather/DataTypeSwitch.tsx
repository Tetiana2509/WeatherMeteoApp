import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { DataType } from "./WeatherTypes";

type Props = {
  value: DataType;
  onChange: (value: DataType) => void;
  style?: ViewStyle;
};

const DataTypeSwitch: React.FC<Props> = ({ value, onChange, style }) => {
  return (
    <View style={[styles.dataTypeContainer, style]}> 
      <TouchableOpacity
        style={[styles.dataTypeButton, value === 'temperature' && styles.activeDataTypeButton]}
        onPress={() => onChange('temperature')}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'temperature' }}
      >
        <View style={styles.labelWrapper}>
          <Text style={[styles.emoji, value === 'temperature' && styles.activeDataTypeButtonText]} numberOfLines={1} ellipsizeMode='clip'>🌡️</Text>
          <Text style={[styles.dataTypeButtonText, value === 'temperature' && styles.activeDataTypeButtonText]} numberOfLines={1} ellipsizeMode='clip'>Temperature</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.dataTypeButton, value === 'brightness' && styles.activeDataTypeButton]}
        onPress={() => onChange('brightness')}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'brightness' }}
      >
        <View style={styles.labelWrapper}>
          <Text style={[styles.emoji, value === 'brightness' && styles.activeDataTypeButtonText]} numberOfLines={1} ellipsizeMode='clip'>💡</Text>
          <Text style={[styles.dataTypeButtonText, value === 'brightness' && styles.activeDataTypeButtonText]} numberOfLines={1} ellipsizeMode='clip'>Brightness</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.dataTypeButton, value === 'precipitation' && styles.activeDataTypeButton]}
        onPress={() => onChange('precipitation')}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'precipitation' }}
      >
        <View style={styles.labelWrapper}>
          <Text style={[styles.emoji, value === 'precipitation' && styles.activeDataTypeButtonText]} numberOfLines={1} ellipsizeMode='clip'>🌧️</Text>
          <Text style={[styles.dataTypeButtonText, value === 'precipitation' && styles.activeDataTypeButtonText]} numberOfLines={1} ellipsizeMode='clip'>Rain</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.dataTypeButton, value === 'uv_index' && styles.activeDataTypeButton]}
        onPress={() => onChange('uv_index')}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'uv_index' }}
      >
        <View style={styles.labelWrapper}>
          <Text style={[styles.emoji, value === 'uv_index' && styles.activeDataTypeButtonText]} numberOfLines={1} ellipsizeMode='clip'>☀️</Text>
          <Text style={[styles.dataTypeButtonText, value === 'uv_index' && styles.activeDataTypeButtonText]} numberOfLines={1} ellipsizeMode='clip'>UV Index</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.dataTypeButton, value === 'clouds' && styles.activeDataTypeButton]}
        onPress={() => onChange('clouds')}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'clouds' }}
      >
        <View style={styles.labelWrapper}>
          <Text style={[styles.emoji, value === 'clouds' && styles.activeDataTypeButtonText]} numberOfLines={1} ellipsizeMode='clip'>☁️</Text>
          <Text style={[styles.dataTypeButtonText, value === 'clouds' && styles.activeDataTypeButtonText]} numberOfLines={1} ellipsizeMode='clip'>Clouds</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

export default DataTypeSwitch;

const styles = StyleSheet.create({
  dataTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    padding: 2,
  },
  dataTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  labelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 18,
    lineHeight: 20,
  color: '#8E8E93',
  textAlign: 'center',
  },
  activeDataTypeButton: {
    backgroundColor: '#007AFF',
  },
  dataTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  textAlign: 'center',
  },
  activeDataTypeButtonText: {
    color: '#FFFFFF',
  },
});
