import { HourlyWeather } from './services/meteoService';

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
