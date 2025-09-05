/**
 * Daylight Brightness Index computation
 * -------------------------------------
 * Нормированный (0..1) индекс "яркости дня" по часам
 * на основе высоты Солнца (включая сумерки).
 */

export type HourlyInputs = {
  time: Date | string | number; // Date, ISO-строка, или epoch ms
};

export type BrightnessOptions = {
  latitude: number;                  // градусы (-90..90)
  longitude: number;                 // градусы (-180..180)
  timezoneOffsetMinutes?: number;    // например +120 для UTC+2 (учитывай DST)
  timesAreUTC?: boolean;             // если true — входные times в UTC
};

export function computeDaylightBrightnessIndex(
  hours: HourlyInputs[],
  opts: BrightnessOptions,
): number[] {
  const tzOffset = opts.timezoneOffsetMinutes ?? 0;

  return hours.map((h) => {
    // Если timesAreUTC=false, пытаемся интерпретировать строковые даты как локальные с указанным смещением
    const preferLon = !opts.timesAreUTC;
    const t = coerceDateWithTimezone(h.time, tzOffset, opts.longitude, preferLon);

    // Если входные времена в UTC — сдвигаем к «локальному» представлению
    const local = opts.timesAreUTC ? new Date(t.getTime() + tzOffset * 60_000) : t;

    const alt = solarAltitudeDeg(local, opts.latitude, opts.longitude, tzOffset);
    const base = daylightFactorFromAltitude(alt);
    return clamp01(base);
  });
}

/* ---------------- Solar position helpers (NOAA approximation) ---------------- */

function getLocalHMSfromUTC(d: Date, tzOffsetMin: number) {
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes() + tzOffsetMin;
  let m = ((mins % 1440) + 1440) % 1440;
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  const seconds = d.getUTCSeconds();
  return { hours, minutes, seconds };
}

function dayOfYearLocal(d: Date, tzOffsetMin: number): number {
  // Преобразуем к локальному (по tzOffsetMin) дню года
  const utc = Date.UTC(
    d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
    d.getUTCHours(), d.getUTCMinutes() + tzOffsetMin, d.getUTCSeconds()
  );
  const local = new Date(utc);
  const start = new Date(Date.UTC(local.getUTCFullYear(), 0, 1));
  const diffMs = local.getTime() - start.getTime();
  return Math.floor(diffMs / 86_400_000) + 1;
}

function solarAltitudeDeg(localInstant: Date, latDeg: number, lonDeg: number, tzOffsetMin: number): number {
  const day = dayOfYearLocal(localInstant, tzOffsetMin);
  const hms = getLocalHMSfromUTC(localInstant, tzOffsetMin);
  const hour = hms.hours + hms.minutes / 60 + hms.seconds / 3600;

  // Годовой угол (gamma), радианы
  const gamma = (2 * Math.PI / 365) * (day - 1 + (hour - 12) / 24);

  // Уравнение времени (минуты)
  const eqtime = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );

  // СКЛОНЕНИЕ СОЛНЦА (радианы) — исправленная формула (Spencer/NOAA)
  const decl =
    0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)  // ← фикс: тут именно sin(2*gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148  * Math.sin(3 * gamma);

  // Истинное солнечное время (мин)
  const timeOffset = eqtime + 4 * lonDeg - tzOffsetMin;
  let tst = (hour * 60 + timeOffset) % 1440;
  if (tst < 0) tst += 1440;

  // Часовой угол (радианы)
  const ha = toRad(tst / 4 - 180);

  // Зенитный угол -> высота (градусы)
  const lat = toRad(latDeg);
  const cosZenith = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  const zenith = Math.acos(clamp(-1, cosZenith, 1));
  return toDeg(Math.PI / 2 - zenith);
}

/* ------------------------- Brightness model components ------------------------ */

function daylightFactorFromAltitude(altDeg: number): number {
  // Сумерки: астрономические (-18..-12), навигационные (-12..-6), гражданские (-6..0)
  if (altDeg <= -18) return 0;
  if (altDeg <= -12) return lerp(0.01, 0.06, (altDeg + 18) / 6);
  if (altDeg <= -6)  return lerp(0.06, 0.2,  (altDeg + 12) / 6);
  if (altDeg <= 0)   return lerp(0.2,  0.55, (altDeg + 6)  / 6);

  // Дневная часть: высоты до ~60° нормализуем и слегка «смягчаем» синусом
  const x = clamp01(altDeg / 60);
  const ease = Math.pow(Math.sin((Math.PI / 2) * x), 0.9);
  return clamp01(0.55 + 0.45 * ease);
}

/* ----------------------------------- Utils ----------------------------------- */

function coerceDate(t: Date | string | number): Date {
  if (t instanceof Date) return t;
  const d = new Date(t);
  if (isNaN(d.getTime())) throw new Error('Invalid time');
  return d;
}

// Грубая оценка смещения по долготе (шаг 30 мин). Лучше всегда явно передавать timezoneOffsetMinutes.
function estimateOffsetFromLongitudeMinutes(lonDeg: number): number {
  const mins = Math.round((lonDeg * 4) / 30) * 30;
  return mins;
}

function coerceDateWithTimezone(
  t: Date | string | number,
  tzOffsetMin: number,
  lonDeg: number,
  preferLongitudeOffset: boolean = false
): Date {
  // Если уже Date или epoch — возвращаем как есть
  if (t instanceof Date || typeof t === 'number') return coerceDate(t);

  // Если строка уже с таймзоной — доверяем ей
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(t);
  if (hasTz) return new Date(t);

  // Иначе дописываем смещение (из opts или по долготе, если так решили)
  let offsetMin: number;
  if (preferLongitudeOffset) {
    offsetMin = Number.isFinite(tzOffsetMin) ? tzOffsetMin : estimateOffsetFromLongitudeMinutes(lonDeg || 0);
  } else {
    offsetMin = Number.isFinite(tzOffsetMin) ? tzOffsetMin : 0;
  }

  const offsetStr = minutesToTzOffset(offsetMin);
  return new Date(`${t}${offsetStr}`);
}

function minutesToTzOffset(mins: number): string {
  const sign = mins >= 0 ? '+' : '-';
  const abs = Math.abs(mins);
  const hh = Math.floor(abs / 60).toString().padStart(2, '0');
  const mm = (abs % 60).toString().padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

function clamp(min: number, v: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function clamp01(v: number): number { return clamp(0, v, 1); }
function lerp(a: number, b: number, t: number): number { return a + (b - a) * clamp01(t); }
function toRad(deg: number): number { return (deg * Math.PI) / 180; }
function toDeg(rad: number): number { return (rad * 180) / Math.PI; }

/* --------------------- Convenience: arrays-in / arrays-out -------------------- */

export function computeDaylightBrightnessIndexFromArrays(
  times: Array<Date | string | number>,
  opts: BrightnessOptions,
): number[] {
  const hours: HourlyInputs[] = times.map((t) => ({ time: t }));
  return computeDaylightBrightnessIndex(hours, opts);
}
