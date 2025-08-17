/**
 * Daylight Brightness Index computation
 * -------------------------------------
 * A normalized (0..1) index that represents perceived outdoor brightness per hour,
 * accounting for solar altitude (including twilight), cloud cover, precipitation,
 * and WMO weather codes. Designed for hourly series with location and timezone.
 */

export type HourlyInputs = {
  time: Date | string | number; // Date, ISO string, or epoch ms
  tempC?: number;               // optional, currently unused
  precipMm?: number;            // precipitation rate (mm/h)
  cloudCoverPct?: number;       // 0..100
  weatherCode?: number;         // WMO weather code (Open-Meteo mapping)
};

export type BrightnessOptions = {
  latitude: number;                  // degrees (-90..90)
  longitude: number;                 // degrees (-180..180)
  /**
   * Minutes to add to UTC to get local time at the location (e.g., +120 for UTC+2).
   * If omitted, times are assumed to already be local for the given location.
   */
  timezoneOffsetMinutes?: number;
};

export function computeDaylightBrightnessIndex(
  hours: HourlyInputs[],
  opts: BrightnessOptions
): number[] {
  const tzOffset = opts.timezoneOffsetMinutes ?? 0;
  return hours.map((h) => {
    const t = coerceDate(h.time);
    const local = new Date(t.getTime() + tzOffset * 60_000);
    const alt = solarAltitudeDeg(local, opts.latitude, opts.longitude, tzOffset);

    // 1) Base daylight from solar altitude (includes twilight before sunrise)
    const base = daylightFactorFromAltitude(alt);

    // 2) Atmospheric/transmittance modifiers
    const cloudFrac = clamp01((h.cloudCoverPct ?? 0) / 100);
    const precipMm = Math.max(0, h.precipMm ?? 0);
    const wmo = h.weatherCode ?? 0;

    // Cloud attenuation – stronger when sun is low, slightly milder at high sun angles
    const altFactor = clamp01(alt / 60); // 0 at horizon or below, ~1 near high sun
    const cloudAttenuationStrength = clamp(0.55, 0.85 - 0.25 * altFactor, 0.85);
    const T_cloud = 1 - cloudAttenuationStrength * Math.pow(cloudFrac, 1.2);

    // Precipitation attenuation – caps at ~50% reduction in heavy rain/snow
    const T_precip = 1 - clamp(precipMm / 10, 0, 0.5);

    // Weather code attenuation – handles fog, thunderstorms, etc.
    const T_code = weatherCodeTransmittance(wmo);

    // Combine transmittance; keep a small un-occludable portion to preserve twilight visibility
    const T_total = clamp01(T_cloud * T_precip * T_code);
    let index = clamp01(base * (0.35 + 0.65 * T_total));

    // Optional: snow albedo boost in daylight (snow can feel brighter)
    if (isSnowCode(wmo) && alt > 5) {
      index = Math.min(1, index * 1.1);
    }

    return index;
  });
}

// --- Solar position helpers (NOAA approximation) ---

function solarAltitudeDeg(localDate: Date, latDeg: number, lonDeg: number, tzOffsetMin: number): number {
  // Fractional year (radians)
  const day = dayOfYear(localDate);
  const hour = localDate.getHours() + localDate.getMinutes() / 60 + localDate.getSeconds() / 3600;
  const gamma = (2 * Math.PI / 365) * (day - 1 + (hour - 12) / 24);

  // Equation of time (minutes) and solar declination (radians)
  const eqtime = 229.18 * (
    0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
  );
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

  // True solar time (minutes)
  const timeOffset = eqtime + 4 * lonDeg - tzOffsetMin; // minutes
  let tst = (hour * 60 + timeOffset) % 1440;
  if (tst < 0) tst += 1440;

  // Hour angle (degrees)
  const haDeg = tst / 4 - 180;
  const ha = toRad(haDeg);

  const lat = toRad(latDeg);
  const cosZenith = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  const zenith = Math.acos(clamp(-1, cosZenith, 1));
  const altitude = Math.PI / 2 - zenith; // radians
  return toDeg(altitude);
}

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

// --- Brightness model components ---

function daylightFactorFromAltitude(altDeg: number): number {
  // Twilight bands and daylight ramp
  if (altDeg <= -18) return 0; // astronomical night
  if (altDeg <= -12) return lerp(0.01, 0.06, (altDeg + 18) / 6); // astronomical → nautical
  if (altDeg <= -6) return lerp(0.06, 0.2, (altDeg + 12) / 6);   // nautical → civil
  if (altDeg <= 0) return lerp(0.2, 0.55, (altDeg + 6) / 6);     // civil → sunrise

  // Above horizon: ease toward 1 with diminishing returns
  const x = clamp01(altDeg / 60);
  const ease = Math.pow(Math.sin((Math.PI / 2) * x), 0.9);
  return clamp01(0.55 + 0.45 * ease);
}

function weatherCodeTransmittance(code: number): number {
  // Open-Meteo WMO mapping buckets
  if (code === 0 || code === 1 || code === 2) return 1.0; // clear to partly cloudy (clouds handled separately)
  if (code === 3) return 0.9; // overcast baseline
  if (code === 45 || code === 48) return 0.5; // fog / depositing rime fog
  if (code >= 51 && code <= 57) return 0.85; // drizzle
  if (code >= 61 && code <= 67) return 0.75; // rain
  if (code >= 71 && code <= 77) return 0.85; // snow
  if (code >= 80 && code <= 82) return 0.7;  // rain showers
  if (code === 85 || code === 86) return 0.8; // snow showers
  if (code === 95) return 0.6;               // thunderstorm
  if (code === 96 || code === 99) return 0.55; // thunderstorm with hail
  return 0.85; // fallback mild attenuation
}

function isSnowCode(code: number): boolean {
  return (code >= 71 && code <= 77) || code === 85 || code === 86;
}

// --- Utils ---

function coerceDate(t: Date | string | number): Date {
  if (t instanceof Date) return t;
  const d = new Date(t);
  if (isNaN(d.getTime())) throw new Error('Invalid time');
  return d;
}

function clamp(min: number, v: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function clamp01(v: number): number { return clamp(0, v, 1); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * clamp01(t); }
function toRad(deg: number): number { return (deg * Math.PI) / 180; }
function toDeg(rad: number): number { return (rad * 180) / Math.PI; }

// Convenience: compute index array from primitive arrays
export function computeDaylightBrightnessIndexFromArrays(
  times: Array<Date | string | number>,
  cloudCoverPct: number[],
  precipMm: number[],
  weatherCodes: number[],
  opts: BrightnessOptions
): number[] {
  const hours: HourlyInputs[] = times.map((t, i) => ({
    time: t,
    cloudCoverPct: cloudCoverPct[i] ?? 0,
    precipMm: precipMm[i] ?? 0,
    weatherCode: weatherCodes[i] ?? 0,
  }));
  return computeDaylightBrightnessIndex(hours, opts);
}
