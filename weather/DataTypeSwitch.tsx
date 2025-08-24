import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { DataType } from "./WeatherTypes";

// Data types in the same order as the switch buttons
const DATA_TYPES_ORDER: DataType[] = ['temperature', 'brightness', 'precipitation', 'uv_index', 'clouds'];

// Utility function to get the next data type in sequence
export const nextDataType = (current: DataType): DataType => {
  const currentIndex = DATA_TYPES_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % DATA_TYPES_ORDER.length;
  return DATA_TYPES_ORDER[nextIndex];
};

type Props = {
  value: DataType;
  onChange: (value: DataType) => void;
  style?: ViewStyle;
  showLabels?: boolean;
};

type DataTypeButtonProps = {
  dataType: DataType;
  emoji: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
  showLabel: boolean;
};

const DataTypeButton: React.FC<DataTypeButtonProps> = ({ dataType, emoji, label, isActive, onPress, showLabel }) => {
  return (
    <TouchableOpacity
      style={[styles.dataTypeButton, isActive && styles.activeDataTypeButton]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.labelWrapper}>
        <Text style={[styles.emoji, isActive && styles.activeDataTypeButtonText]} numberOfLines={1} ellipsizeMode='clip'>
          {emoji}
        </Text>
        {showLabel && (
          <Text style={[styles.dataTypeButtonText, isActive && styles.activeDataTypeButtonText]} numberOfLines={1} ellipsizeMode='clip'>
            {label}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const DataTypeSwitch: React.FC<Props> = ({ value, onChange, style, showLabels = false }) => {
  const buttonConfigs = [
    { dataType: 'temperature' as DataType, emoji: '🌡️', label: 'Temperature' },
    { dataType: 'brightness' as DataType, emoji: '💡', label: 'Brightness' },
    { dataType: 'precipitation' as DataType, emoji: '🌧️', label: 'Rain' },
    { dataType: 'uv_index' as DataType, emoji: '☀️', label: 'UV Index' },
    { dataType: 'clouds' as DataType, emoji: '☁️', label: 'Clouds' },
  ];

  // Ensure button order matches DATA_TYPES_ORDER
  const orderedButtonConfigs = DATA_TYPES_ORDER.map(dataType => 
    buttonConfigs.find(config => config.dataType === dataType)!
  );

  return (
    <View style={[styles.dataTypeContainer, style]}> 
      {orderedButtonConfigs.map((config) => (
        <DataTypeButton
          key={config.dataType}
          dataType={config.dataType}
          emoji={config.emoji}
          label={config.label}
          isActive={value === config.dataType}
          onPress={() => onChange(config.dataType)}
          showLabel={showLabels}
        />
      ))}
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
