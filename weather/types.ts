export type Coords = {
  lat: number;
  lon: number;
  displayName?: string;
};

export type DataType =
  | 'temperature'
  | 'precipitation'
  | 'uv_index'
  | 'clouds'
  | 'brightness';

export type TemperatureUnit = 'celsius' | 'fahrenheit';

export type TapArea = 'icon' | 'value';

// Utility function to compare coordinates
export const coordsEqual = (
  coords1: Coords | null | undefined,
  coords2: Coords | null | undefined,
): boolean => {
  if (coords1 == coords2) return true; // handles null/undefined equality
  if (!coords1 || !coords2) return false;
  return coords1.lat === coords2.lat && coords1.lon === coords2.lon;
};
