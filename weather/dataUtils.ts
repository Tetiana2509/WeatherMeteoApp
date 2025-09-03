import { HourlyWeather } from './services/meteoService';
import { DataType, TemperatureUnit } from './types';

/**
 * Selects the appropriate data series based on the data type
 */
export function selectSeries(
  weatherData: HourlyWeather | null,
  dataType: DataType,
  lat: number,
  lon: number
): number[] {
  if (weatherData == null) {
    console.log('selectSeries: weatherData is null for dataType:', dataType);
    return [];
  }

  switch (dataType) {
    case 'precipitation':
      return weatherData.precipitation;
    case 'uv_index':
      return weatherData.uv_index;
    case 'clouds':
      return weatherData.cloudcover;
    case 'brightness':
      return weatherData.brightness;
    case 'temperature':
    default:
      return weatherData.temperature_2m;
  }
}

/**
 * Converts and processes the data series based on data type and units
 */
export function convertSeries(
  series: number[],
  dataType: DataType,
  temperatureUnit: TemperatureUnit
): number[] {
  // First validate the series
  if (!validateSeries(series, dataType)) {
    console.error('Invalid data set:', series);
    return [];
  }

  // Apply data type specific conversions
  if (dataType === 'temperature' && temperatureUnit === 'fahrenheit') {
    // Temperature conversion functions
    const celsiusToFahrenheit = (celsius: number): number =>
      (celsius * 9) / 5 + 32;
    return series.map(celsiusToFahrenheit);
  } else if (dataType === 'brightness') {
    // Ensure 0..1 and numeric
    return series.map((v) =>
      typeof v === 'number' && isFinite(v) ? clamp01(v) : 0.5,
    );
  }

  return series;
}

/**
 * Validates that the series contains valid numbers and is within realistic bounds
 */
export function validateSeries(series: number[], dataType: DataType): boolean {
  if (!Array.isArray(series) || series.length === 0) {
    return false;
  }

  // Check for invalid numbers
  const hasInvalidNumbers = series.some((n) => typeof n !== 'number' || isNaN(n));
  if (hasInvalidNumbers) {
    return false;
  }

  // Check for realistic bounds based on data type
  switch (dataType) {
    case 'temperature':
      // Temperature should be between -100°C and 100°C
      return series.every((temp) => temp >= -100 && temp <= 100);
    case 'precipitation':
      // Precipitation should be non-negative and reasonable (< 1000mm/hour)
      return series.every((precip) => precip >= 0 && precip <= 1000);
    case 'uv_index':
      // UV index should be between 0 and 20 (extreme max)
      return series.every((uv) => uv >= 0 && uv <= 20);
    case 'clouds':
      // Cloud coverage should be between 0% and 100%
      return series.every((clouds) => clouds >= 0 && clouds <= 100);
    case 'brightness':
      // Brightness should be between 0 and 1
      return series.every((brightness) => brightness >= 0 && brightness <= 1);
    default:
      return true;
  }
}

/**
 * Utility function to clamp a value between 0 and 1
 */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
