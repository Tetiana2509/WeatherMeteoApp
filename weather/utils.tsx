import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { DataType } from './types';

// Shared function to get icon component for each data type
export const getDataTypeIcon = (
  dataType: DataType,
  size: number = 40,
  customColor?: string,
): React.ReactNode => {
  const iconName =
    dataType === 'precipitation'
      ? 'rainy'
      : dataType === 'clouds'
      ? 'cloud'
      : dataType === 'uv_index'
      ? 'sunny'
      : dataType === 'brightness'
      ? 'contrast-outline'
      : 'thermometer';

  // Use custom color if provided, otherwise use default colors
  const iconColor =
    customColor ||
    (dataType === 'precipitation'
      ? '#76A9FF'
      : dataType === 'clouds'
      ? '#B0BEC5'
      : dataType === 'uv_index'
      ? '#66BB6A'
      : dataType === 'brightness'
      ? '#FFD54F'
      : '#FFD94B');

  return <Ionicons name={iconName as any} size={size} color={iconColor} />;
};
