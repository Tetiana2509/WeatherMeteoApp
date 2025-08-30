import { DataType, TemperatureUnit } from './types';

export interface GradientStop {
  offset: string;
  color: string;
  opacity: number;
}

export interface ValueGradientStop {
  value: number;
  color: string;
  opacity: number;
}

export interface ChartTheme {
  strokeColor: string;
  gradientTopColor: string;
  gradientBottomColor: string;
  gradientTopOpacity: number;
  gradientBottomOpacity: number;
  gradientStops?: GradientStop[];
  gradientValueStops?: ValueGradientStop[];
}

/**
 * Returns the chart theme configuration for a given data type and temperature unit
 */
export function getChartTheme(
  dataType: DataType,
  temperatureUnit: TemperatureUnit = 'celsius'
): ChartTheme | undefined {
  switch (dataType) {
    case 'temperature': {
      // Value-based gradient: красный (очень жарко) → оранжевый → жёлтый → голубой → синий
      const tempStops: ValueGradientStop[] =
        temperatureUnit === 'fahrenheit'
          ? [
              { value: 111, color: '#FF5252', opacity: 0.95 }, // 44°C red
              { value: 104, color: '#FF5252', opacity: 0.95 }, // 40°C red
              { value: 97, color: '#FB8C00', opacity: 0.9 }, // 36°C deep orange
              { value: 86, color: '#FFA726', opacity: 0.88 }, // 30°C orange
              { value: 68, color: '#FDD835', opacity: 0.82 }, // 20°C yellow
              { value: 50, color: '#26C6DA', opacity: 0.68 }, // 10°C teal
              { value: 32, color: '#1976D2', opacity: 0.62 }, // 0°C strong blue
              { value: 14, color: '#0D47A1', opacity: 0.58 }, // -10°C deep blue
            ]
          : [
              { value: 44, color: '#FF5252', opacity: 0.95 }, // red
              { value: 40, color: '#FF5252', opacity: 0.95 }, // red
              { value: 36, color: '#FB8C00', opacity: 0.9 }, // deep orange
              { value: 30, color: '#FFA726', opacity: 0.88 }, // orange
              { value: 20, color: '#FDD835', opacity: 0.82 }, // yellow
              { value: 10, color: '#26C6DA', opacity: 0.68 }, // teal
              { value: 0, color: '#1976D2', opacity: 0.62 }, // strong blue at freezing
              { value: -10, color: '#0D47A1', opacity: 0.58 }, // deep blue below freezing
            ];
      return {
        strokeColor: '#FFA726',
        gradientTopColor: '#FF5252',
        gradientBottomColor: '#4FC3F7',
        gradientTopOpacity: 0.95,
        gradientBottomOpacity: 0.4,
        gradientValueStops: tempStops,
      };
    }

    case 'precipitation':
      return {
        strokeColor: '#29B6F6',
        gradientTopColor: '#B3E5FC',
        gradientBottomColor: '#0288D1',
        gradientTopOpacity: 0.75,
        gradientBottomOpacity: 0.45,
        gradientStops: [
          { offset: '0%', color: '#B3E5FC', opacity: 0.85 },
          { offset: '60%', color: '#4FC3F7', opacity: 0.55 },
          { offset: '100%', color: '#0288D1', opacity: 0.45 },
        ],
      };

    case 'uv_index':
      return {
        strokeColor: '#66BB6A',
        // Apple-like UV gradient: pink (extreme) → orange → yellow → green (low)
        gradientTopColor: '#EC407A',
        gradientBottomColor: '#43A047',
        gradientTopOpacity: 0.9,
        gradientBottomOpacity: 0.45,
        // Value-based stops: align to UVI bands (>=9 pink, >=6 orange, >=3 yellow, else green)
        gradientValueStops: [
          { value: 12, color: '#EC407A', opacity: 0.95 }, // near max/extreme
          { value: 9, color: '#EC407A', opacity: 0.9 }, // pink band start
          { value: 6, color: '#FF7043', opacity: 0.85 }, // orange band start
          { value: 3, color: '#FBC02D', opacity: 0.75 }, // yellow band start
          { value: 0, color: '#43A047', opacity: 0.55 }, // green to bottom
        ],
      };

    case 'clouds':
      return {
        strokeColor: '#90A4AE',
        gradientTopColor: '#ECEFF1',
        gradientBottomColor: '#90A4AE',
        gradientTopOpacity: 0.9,
        gradientBottomOpacity: 0.45,
        // Value-based gradient: 0% clear (blue) → 100% overcast (gray)
        gradientValueStops: [
          { value: 100, color: '#90A4AE', opacity: 0.65 }, // overcast gray (top)
          { value: 75, color: '#CFD8DC', opacity: 0.6 }, // broken clouds
          { value: 50, color: '#ECEFF1', opacity: 0.58 }, // scattered → near white
          { value: 25, color: '#B3E5FC', opacity: 0.52 }, // few clouds, pale blue
          { value: 0, color: '#4FC3F7', opacity: 0.5 }, // clear sky blue (bottom)
        ],
      };

    case 'brightness':
      return {
        strokeColor: '#afbdeb',
        gradientTopColor: '#f2f2e2',
        gradientBottomColor: '#1a2c52',
        gradientTopOpacity: 1,
        gradientBottomOpacity: 1,
        gradientValueStops: [
          { value: 1.0, color: '#f2f2e2', opacity: 1 },
          { value: 0.54, color: '#afbdeb', opacity: 1 },
          { value: 0.0, color: '#1a2c52', opacity: 1 },
        ],
      };

    default:
      return undefined;
  }
}
