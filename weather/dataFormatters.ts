import { DataType } from './types';

// Formatting functions that include data type-specific value manipulation
export const formatTemperature = (value: number): string => `${Math.round(value)}°`;

export const formatPrecipitation = (value: number): string => {
  const clampedValue = Math.max(0, value);
  return `${Math.round(clampedValue)} mm`;
};

export const formatUVIndex = (value: number): string => {
  const clampedValue = Math.max(0, value);
  return `${Math.round(clampedValue * 10) / 10}`;
};

export const formatClouds = (value: number): string => {
  const clampedValue = Math.max(0, Math.min(100, value));
  return `${Math.round(clampedValue)}%`;
};

export const formatBrightness = (value: number): string => {
  const clampedValue = Math.max(0, value);
  return `${Math.round(clampedValue * 100)}%`;
};

export const FORMATTERS: Record<DataType, (value: number) => string> = {
  temperature: formatTemperature,
  precipitation: formatPrecipitation,
  uv_index: formatUVIndex,
  clouds: formatClouds,
  brightness: formatBrightness,
};

/**
 * Formats a value according to the data type-specific rules
 */
export function formatValue(value: number, dataType: DataType): string {
  const formatter = FORMATTERS[dataType];
  return formatter(value);
}

/**
 * Clamps a value for plotting according to the data type-specific rules
 * (same clamping logic as used in formatters, but returns the numeric value)
 */
export function clampValueForPlotting(value: number, dataType: DataType): number {
  switch (dataType) {
    case 'temperature':
      return value; // no clamping for temperature
    case 'precipitation':
        return value > 0 ? Math.max(0.1, value) : 0;
    case 'uv_index':
    case 'brightness':
      return Math.max(0, value);
    case 'clouds':
      return Math.max(0, Math.min(100, value));
    default:
      return value;
  }
}
