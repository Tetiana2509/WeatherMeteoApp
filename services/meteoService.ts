export interface HourlyWeather {
  time: string[];
  temperature_2m: number[];
  apparent_temperature: number[];
  relative_humidity_2m: number[];
  precipitation: number[];
  weathercode: number[];
  sunrise: string[];
  sunset: string[];
}

export const getHourlyWeather = async (lat: number, lon: number): Promise<HourlyWeather> => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weathercode&daily=sunrise,sunset&timezone=auto`;

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
    sunrise: data.daily.sunrise,
    sunset: data.daily.sunset,
  };
};
