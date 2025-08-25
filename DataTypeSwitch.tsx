import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { DataType, getDataTypeIcon } from './weather';
import { COLORS } from './styling';

// Data types with their labels in the correct order
const DATA_TYPES: Record<DataType, string> = {
  'temperature': 'Temperature',
  'brightness': 'Brightness',
  'precipitation': 'Rain',
  'uv_index': 'UV Index',
  'clouds': 'Clouds',
};

// Utility function to get the next data type in sequence
export const nextDataType = (current: DataType): DataType => {
  const dataTypes = Object.keys(DATA_TYPES) as DataType[];
  const currentIndex = dataTypes.indexOf(current);
  const nextIndex = (currentIndex + 1) % dataTypes.length;
  return dataTypes[nextIndex];
};

type Props = {
  value: DataType;
  onChange: (value: DataType) => void;
  style?: ViewStyle;
  showLabels?: boolean;
};

type DataTypeButtonProps = {
  dataType: DataType;
  label: string;
  isActive: boolean;
  onPress: () => void;
  showLabel: boolean;
};

const DataTypeButton: React.FC<DataTypeButtonProps> = ({ dataType, label, isActive, onPress, showLabel }) => {
  const iconColor = isActive ? COLORS.selectionFG : COLORS.controlsFG;
  
  return (
    <TouchableOpacity
      style={[styles.dataTypeButton, isActive && styles.activeDataTypeButton]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
    >
      <View style={styles.labelWrapper}>
        <View style={styles.iconContainer}>
          {getDataTypeIcon(dataType, 18, iconColor)}
        </View>
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
  return (
    <View style={[styles.dataTypeContainer, style]}> 
      {Object.entries(DATA_TYPES).map(([dataType, label]) => (
        <DataTypeButton
          key={dataType}
          dataType={dataType as DataType}
          label={label}
          isActive={value === dataType}
          onPress={() => onChange(dataType as DataType)}
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
    backgroundColor: COLORS.controlsBG,
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
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDataTypeButton: {
    backgroundColor: COLORS.selectionBG,
  },
  dataTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.controlsFG,
    textAlign: 'center',
  },
  activeDataTypeButtonText: {
    color: COLORS.selectionFG,
  },
});
