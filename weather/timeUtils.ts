import { HourlyWeather } from './services/meteoService';

/**
 * Computes today's date in the location's local time using API timezone offset
 */
export function getTodayInLocalTime(utcOffsetSeconds: number): string {
  const nowShifted = new Date(Date.now() + utcOffsetSeconds * 1000);
  return nowShifted.toISOString().split('T')[0];
}

/**
 * Filters weather data to get indices for today's hours, with fallback to first 24 hours
 */
export function getTodayIndices(weatherData: HourlyWeather): number[] {
  if (!weatherData?.time || !Array.isArray(weatherData.time) || weatherData.time.length === 0) {
    return [];
  }

  const tzOffsetSeconds = weatherData.utc_offset_seconds || 0;
  const today = getTodayInLocalTime(tzOffsetSeconds);

  // Build indices for the hours that are on today's local date
  let filteredIndices = weatherData.time
    .map((time, index) => ({ time, index }))
    .filter(({ time }) => time && time.startsWith(today))
    .map(({ index }) => index);

  // Fallback: if no data for today, use the first 24 hours
  if (filteredIndices.length === 0 && weatherData.time.length >= 24) {
    filteredIndices = Array.from({ length: 24 }, (_, i) => i);
    console.log('Fallback to first 24 hours');
  }

  return filteredIndices;
}

/**
 * Computes the current hour index in the location's local time based on API timezone
 */
export function getCurrentHourIndex(weatherData: HourlyWeather): number {
  if (!weatherData?.time || weatherData.time.length === 0) {
    return 0;
  }

  const tzOffsetSeconds = weatherData.utc_offset_seconds || 0;
  const shiftedISO = new Date(Date.now() + tzOffsetSeconds * 1000)
    .toISOString();
  const locHour = parseInt(shiftedISO.slice(11, 13), 10);
  
  const hours = weatherData.time.map((t) => {
    const hh = parseInt(t.slice(11, 13), 10);
    return Number.isFinite(hh) ? hh : 0;
  });
  
  let idx = hours.findIndex((h) => h === locHour);
  
  if (idx < 0) {
    // Fallback: pick the nearest hour
    let best = 0;
    let bestDist = Infinity;
    hours.forEach((h, i) => {
      const d = Math.abs(h - locHour);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    idx = best;
  }
  
  return idx;
}

/**
 * Selects the appropriate sunrise and sunset times for the same local day as the filtered hourly series
 */
export function getSunriseSunsetTimes(weatherData: HourlyWeather): {
  sunriseTime: string | null;
  sunsetTime: string | null;
} {
  let sunriseTime: string | null = null;
  let sunsetTime: string | null = null;
  
  const seriesDate = weatherData.time?.[0]?.slice(0, 10) || null;
  
  if (seriesDate) {
    sunriseTime = (weatherData.sunrise || []).find((s) => s && s.startsWith(seriesDate))
      || (weatherData.sunrise?.[0] ?? null);
    sunsetTime = (weatherData.sunset || []).find((s) => s && s.startsWith(seriesDate))
      || (weatherData.sunset?.[0] ?? null);
  } else {
    sunriseTime = weatherData.sunrise?.[0] ?? null;
    sunsetTime = weatherData.sunset?.[0] ?? null;
  }
  
  return { sunriseTime, sunsetTime };
}

/**
 * Helper function to safely get numeric value or fallback
 */
export function safeGetNumber(
  array: number[],
  index: number,
  fallback: number = 0,
): number {
  const value = array?.[index];
  return typeof value === 'number' && !isNaN(value) ? value : fallback;
}

/**
 * Creates filtered weather data for today's hours with validation
 */
export function createFilteredWeatherData(
  fullData: HourlyWeather,
  filteredIndices: number[]
): HourlyWeather {
  return {
    time: filteredIndices.map((i) => fullData.time[i] || ''),
    temperature_2m: filteredIndices.map((i) =>
      safeGetNumber(fullData.temperature_2m, i, 15),
    ),
    apparent_temperature: filteredIndices.map((i) =>
      safeGetNumber(fullData.apparent_temperature, i, 15),
    ),
    relative_humidity_2m: filteredIndices.map((i) =>
      safeGetNumber(fullData.relative_humidity_2m, i, 50),
    ),
    precipitation: filteredIndices.map((i) =>
      safeGetNumber(fullData.precipitation, i, 0),
    ),
    weathercode: filteredIndices.map((i) =>
      safeGetNumber(fullData.weathercode, i, 0),
    ),
    uv_index: filteredIndices.map((i) =>
      safeGetNumber(fullData.uv_index, i, 0),
    ),
    cloudcover: filteredIndices.map((i) =>
      safeGetNumber(fullData.cloudcover, i, 0),
    ),
    sunrise: fullData.sunrise || [],
    sunset: fullData.sunset || [],
    timezone: fullData.timezone,
    utc_offset_seconds: fullData.utc_offset_seconds,
  };
}
