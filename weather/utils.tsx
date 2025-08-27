import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { DataType } from './types';

// Data types with their labels in the correct order
export const DATA_TYPES: Partial<Record<DataType, string>> = {
  'temperature': 'Temperature',
  'uv_index': 'UV Index',
  'clouds': 'Clouds',
  'precipitation': 'Rain',
  'brightness': 'Brightness',
};

// Utility function to get the next data type in sequence
export const nextDataType = (current: DataType): DataType => {
  const dataTypes = Object.keys(DATA_TYPES) as DataType[];
  const currentIndex = dataTypes.indexOf(current);
  const nextIndex = (currentIndex + 1) % dataTypes.length;
  return dataTypes[nextIndex];
};

// Internal maps for icon names and colors
const ICON_NAMES: Record<DataType, keyof typeof Ionicons.glyphMap> = {
  'precipitation': 'rainy',
  'clouds': 'cloud',
  'uv_index': 'sunny',
  'brightness': 'contrast-outline',
  'temperature': 'thermometer',
};

const ICON_COLORS: Record<DataType, string> = {
  'precipitation': '#76A9FF',
  'clouds': '#B0BEC5',
  'uv_index': '#FFD94B',
  'brightness': '#FFD54F',
  'temperature': '#FFD94B',
};

// Shared function to get icon component for each data type
export const getDataTypeIcon = (
  dataType: DataType,
  size: number = 40,
  customColor?: string,
): React.ReactNode => {
  const iconName = ICON_NAMES[dataType];
  const iconColor = customColor || ICON_COLORS[dataType];

  return <Ionicons name={iconName} size={size} color={iconColor} />;
};
