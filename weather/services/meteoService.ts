export interface HourlyWeather {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  relative_humidity_2m: number[];
  precipitation: number[];
  weathercode: number[];
  uv_index: number[];
  cloudcover: number[];
  brightness: number[];
  sunrise: string[];
  sunset: string[];
  timezone?: string;
  utc_offset_seconds?: number;
}

export const getHourlyWeather = async (lat: number, lon: number): Promise<HourlyWeather> => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weathercode,uv_index,cloudcover&daily=sunrise,sunset&timezone=auto`;
  console.log('Fetching from:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch data');

  const data = await res.json();

  return {
    time: data.hourly.time,
    temperature_2m: data.hourly.temperature_2m,
    apparent_temperature: data.hourly.apparent_temperature,
    relative_humidity_2m: data.hourly.relative_humidity_2m,
    precipitation: data.hourly.precipitation,
    weathercode: data.hourly.weathercode,
    uv_index: data.hourly.uv_index,
    cloudcover: data.hourly.cloudcover,
    brightness: [], // Will be computed in useWeatherData hook
    sunrise: data.daily.sunrise,
    sunset: data.daily.sunset,
  timezone: data.timezone,
  utc_offset_seconds: data.utc_offset_seconds,
  };
};
