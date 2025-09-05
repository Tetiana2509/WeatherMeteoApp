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

/* ============================================================================
 * ПУБЛИЧНЫЕ ФУНКЦИИ
 * ========================================================================== */

export function computeDaylightBrightnessIndex(
  hours: HourlyInputs[],
  opts: BrightnessOptions,
): number[] {
  const tzOffset = opts.timezoneOffsetMinutes ?? 0;

  const result = hours.map((h) => {
    const preferLon = !opts.timesAreUTC;
    const t = coerceDateWithTimezone(h.time, tzOffset, opts.longitude, preferLon);
    const local = opts.timesAreUTC ? new Date(t.getTime() + tzOffset * 60_000) : t;

    const alt = solarAltitudeDeg(local, opts.latitude, opts.longitude, tzOffset);
    const base = daylightFactorFromAltitude(alt);
    const val = clamp01(base);
    return Number.isFinite(val) ? val : 0;
  });

  // --- Диагностика (безопасна для продакшна, просто логи) ---
  tryDiagnostics(hours, result, opts);

  return result;
}

export function computeDaylightBrightnessIndexFromArrays(
  times: Array<Date | string | number>,
  opts: BrightnessOptions,
): number[] {
  const hours: HourlyInputs[] = times.map((t) => ({ time: t }));
  return computeDaylightBrightnessIndex(hours, opts);
}

/**
 * Найти индекс часа, ближайшего к now (учитывая timesAreUTC/tz).
 * Удобно для выбора «текущего» элемента в UI.
 */
export function findClosestHourIndex(
  times: Array<Date | string | number>,
  opts: BrightnessOptions,
  now: Date = new Date()
): number {
  const tzOffset = opts.timezoneOffsetMinutes ?? 0;
  const preferLon = !opts.timesAreUTC;

  let best = 0, bestDiff = Infinity, tg = now.getTime();
  for (let i = 0; i < times.length; i++) {
    const t = coerceDateWithTimezone(times[i], tzOffset, opts.longitude, preferLon);
    const local = opts.timesAreUTC ? new Date(t.getTime() + tzOffset * 60_000) : t;
    const diff = Math.abs(local.getTime() - tg);
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return best;
}

/**
 * Вернуть 24-часовое окно вокруг «сейчас» (или от начала/конца массива).
 * Возвращает: срез times/brightness на 24 часа, а также метаданные для UI.
 */
export function computeBrightness24Window(
  times: Array<Date | string | number>,
  opts: BrightnessOptions
) {
  const all = computeDaylightBrightnessIndexFromArrays(times, opts);

  const nowIdx = findClosestHourIndex(times, opts);
  const start = Math.max(0, Math.min(nowIdx - 12, Math.max(0, all.length - 24)));
  const end = Math.min(all.length, start + 24);

  const tzOffset = opts.timezoneOffsetMinutes ?? 0;
  const preferLon = !opts.timesAreUTC;

  const localTimes = times.map((t) => {
    const d = coerceDateWithTimezone(t, tzOffset, opts.longitude, preferLon);
    return opts.timesAreUTC ? new Date(d.getTime() + tzOffset * 60_000) : d;
  });

  const times24 = localTimes.slice(start, end);
  const brightness24 = all.slice(start, end);

  const nowLocal = localTimes[nowIdx];
  const nowAlt = solarAltitudeDeg(nowLocal, opts.latitude, opts.longitude, tzOffset);
  const nowIdxVal = all[nowIdx];

  return {
    times24,            // локальные даты (24 шт)
    brightness24,       // значения 0..1 (24 шт)
    start, end,         // границы среза
    nowIdx, nowLocal,   // индекс и локальное время «сейчас» (в шкале полного массива)
    nowAlt,             // высота солнца сейчас (градусы)
    nowBrightness: nowIdxVal,                    // 0..1
    nowBrightnessPercent: Math.round(nowIdxVal * 100),
  };
}

/* ============================================================================
 * ВНУТРЕННЕЕ: DIAGNOSTICS
 * ========================================================================== */

function tryDiagnostics(
  hours: HourlyInputs[],
  result: number[],
  opts: BrightnessOptions
) {
  try {
    if (!Array.isArray(result) || result.length === 0) return;

    const min = Math.min(...result);
    const max = Math.max(...result);
    const span = max - min;

    const tzOffset = opts.timezoneOffsetMinutes ?? 0;
    const preferLon = !opts.timesAreUTC;

    const localTimes = hours.map((h) => {
      const t = coerceDateWithTimezone(h.time, tzOffset, opts.longitude, preferLon);
      return opts.timesAreUTC ? new Date(t.getTime() + tzOffset * 60_000) : t;
    });

    const now = new Date();
    const nowIdx = findClosestIndexRaw(localTimes, now);
    const nowLocal = localTimes[nowIdx];
    const nowAlt = solarAltitudeDeg(nowLocal, opts.latitude, opts.longitude, tzOffset);
    const nowIdxVal = result[nowIdx];

    const first5 = result.slice(0, 5).map(v => +v.toFixed(3));
    const last5  = result.slice(-5).map(v => +v.toFixed(3));

    console.log(
      `[BRIGHTNESS] len=${result.length} min=${min.toFixed(3)} max=${max.toFixed(3)} span=${span.toFixed(3)}`
    );
    console.log(
      `[BRIGHTNESS] first5=${JSON.stringify(first5)} last5=${JSON.stringify(last5)}`
    );
    console.log(
      `[BRIGHTNESS] nowIdx=${nowIdx} nowTime=${nowLocal?.toString()} alt=${nowAlt.toFixed(2)}° idx=${nowIdxVal.toFixed(3)}`
    );

    if (span < 0.02) {
      console.warn(
        `[BRIGHTNESS] WARNING: very small span (<0.02). Проверь:
         • индекс часа в UI (используй findClosestHourIndex),
         • timesAreUTC/utc_offset_seconds/ timezoneOffsetMinutes,
         • что отображаешь не result[0], а result[nowIdx].`
      );
    }
  } catch (e) {
    console.warn('[BRIGHTNESS] diagnostics failed:', e);
  }
}

function findClosestIndexRaw(times: Array<Date>, target: Date): number {
  let best = 0, bestDiff = Infinity, tg = target.getTime();
  for (let i = 0; i < times.length; i++) {
    const ti = times[i]?.getTime?.();
    if (!Number.isFinite(ti)) continue;
    const d = Math.abs(ti - tg);
    if (d < bestDiff) { bestDiff = d; best = i; }
  }
  return best;
}

/* ============================================================================
 * АСТРОНОМИЯ (NOAA approximation)
 * ========================================================================== */

function getLocalHMSfromUTC(d: Date, tzOffsetMin: number) {
  const mins = d.getUTCHours() * 60 + d.getUTCMinutes() + tzOffsetMin;
  let m = ((mins % 1440) + 1440) % 1440;
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  const seconds = d.getUTCSeconds();
  return { hours, minutes, seconds };
}

function dayOfYearLocal(d: Date, tzOffsetMin: number): number {
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

  const gamma = (2 * Math.PI / 365) * (day - 1 + (hour - 12) / 24);

  const eqtime = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );

  // Исправленная формула склонения (Spencer/NOAA)
  const decl =
    0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148  * Math.sin(3 * gamma);

  const timeOffset = eqtime + 4 * lonDeg - tzOffsetMin;
  let tst = (hour * 60 + timeOffset) % 1440;
  if (tst < 0) tst += 1440;

  const ha = toRad(tst / 4 - 180);

  const lat = toRad(latDeg);
  const cosZenith = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha);
  const zenith = Math.acos(clamp(-1, cosZenith, 1));
  return toDeg(Math.PI / 2 - zenith);
}

/* ============================================================================
 * КАЛИБРОВКА ЯРКОСТИ
 * ========================================================================== */

function daylightFactorFromAltitude(altDeg: number): number {
  // ночь — сразу 0
  if (altDeg <= -9) return 0;

  // сумерки от -9° до 0°: растём от 0 до 0.1 (10%)
  if (altDeg <= 0) return lerp(0, 0.1, (altDeg + 9) / 9);

  // день: плавный рост
  if (altDeg <= 10) return lerp(0.1, 0.35, altDeg / 10);
  if (altDeg <= 30) return lerp(0.35, 0.78, (altDeg - 10) / 20);

  const x = clamp01((altDeg - 30) / 30);
  const ease = Math.sin((Math.PI / 2) * x);
  return clamp01(0.78 + 0.22 * ease);
}


/* ============================================================================
 * УТИЛИТЫ
 * ========================================================================== */

function coerceDate(t: Date | string | number): Date {
  if (t instanceof Date) return t;
  const d = new Date(t);
  if (isNaN(d.getTime())) throw new Error('Invalid time');
  return d;
}

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
  if (t instanceof Date || typeof t === 'number') return coerceDate(t);

  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(t);
  if (hasTz) return new Date(t);

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

/* внутреннее: поиск ближайшего индекса по массиву Date */
// function findClosestIndexRaw(times: Array<Date>, target: Date): number {
//   let best = 0, bestDiff = Infinity, tg = target.getTime();
//   for (let i = 0; i < times.length; i++) {
//     const ti = times[i]?.getTime?.();
//     if (!Number.isFinite(ti)) continue;
//     const d = Math.abs(ti - tg);
//     if (d < bestDiff) { bestDiff = d; best = i; }
//   }
//   return best;
// }
