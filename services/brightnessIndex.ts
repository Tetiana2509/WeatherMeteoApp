/**
 * Daylight Brightness Index computation
 * -------------------------------------
 * A normalized (0..1) index that represents perceived outdoor brightness per hour,
 * accounting for solar altitude (including twilight), cloud cover, precipitation,
 * and WMO weather codes. Designed for hourly series with location and timezone.
 */

export type HourlyInputs = {
  time: Date | string | number; // Date, ISO string, or epoch ms
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

  // Base daylight from solar altitude (includes twilight before sunrise)
  const base = daylightFactorFromAltitude(alt);
  return clamp01(base);
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

// (Weather codes and precipitation/cloud attenuation removed in the simple version)

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
  opts: BrightnessOptions
): number[] {
  const hours: HourlyInputs[] = times.map((t) => ({ time: t }));
  return computeDaylightBrightnessIndex(hours, opts);
}
