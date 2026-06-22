import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Servizio per recuperare le medie climatiche storiche da Open-Meteo Historical Weather API.
 *
 * Strategia:
 * - Fetch 3 anni (2022–2024) per una finestra ±7 giorni intorno alla data corrente
 * - 3 chiamate parallele, una per anno, con parametri daily
 * - Media di tutti i valori per ottenere le "normali climatiche" della zona/periodo
 * - Cache in AsyncStorage per 7 giorni (le medie non cambiano)
 */

const CACHE_PREFIX = 'climate_normals_';
const CACHE_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 giorni
const YEARS = [2022, 2023, 2024];
const WINDOW_DAYS = 7; // ±7 giorni = finestra di 15 giorni

// ── Helpers ───────────────────────────────────────────────────────────────────

function padDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Chiave cache: arrotondata a 0.1° (copre ~11km, stessa granularità ERA5-Land) */
function cacheKey(lat, lon) {
  const rLat = (Math.round(lat * 10) / 10).toFixed(1);
  const rLon = (Math.round(lon * 10) / 10).toFixed(1);
  const now = new Date();
  // La chiave include mese+settimana per invalidare quando cambia il periodo
  const week = Math.floor(now.getDate() / 7);
  return `${CACHE_PREFIX}${rLat}_${rLon}_${now.getMonth()}_${week}`;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchYearData(lat, lon, year) {
  const now = new Date();
  const center = new Date(year, now.getMonth(), now.getDate());
  const start = new Date(center);
  start.setDate(start.getDate() - WINDOW_DAYS);
  const end = new Date(center);
  end.setDate(end.getDate() + WINDOW_DAYS);

  const url = `https://archive-api.open-meteo.com/v1/archive`
    + `?latitude=${lat}&longitude=${lon}`
    + `&start_date=${padDate(start)}&end_date=${padDate(end)}`
    + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max`
    + `&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function avg(arr) {
  const valid = arr.filter(v => v != null && !isNaN(v));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// ── API pubblica ──────────────────────────────────────────────────────────────

/**
 * Restituisce le medie climatiche per la località e il periodo corrente.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{avgTempMax: number, avgTempMin: number, avgPrecip: number, avgWindMax: number} | null>}
 */
export async function getClimateNormals(lat, lon) {
  if (lat == null || lon == null) return null;

  const key = cacheKey(lat, lon);

  // ── Cache hit? ──────────────────────────────────────────────────────────
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed._ts && Date.now() - parsed._ts < CACHE_VALIDITY_MS) {
        return parsed;
      }
    }
  } catch (_) { /* cache miss, procedi */ }

  // ── Fetch parallelo per ogni anno ───────────────────────────────────────
  try {
    const results = await Promise.all(
      YEARS.map(y => fetchYearData(lat, lon, y).catch(() => null))
    );

    // Raccoglie tutti i valori giornalieri da tutti gli anni
    const allTempMax = [];
    const allTempMin = [];
    const allPrecip  = [];
    const allWind    = [];

    for (const data of results) {
      if (!data?.daily) continue;
      const d = data.daily;
      if (d.temperature_2m_max)   allTempMax.push(...d.temperature_2m_max);
      if (d.temperature_2m_min)   allTempMin.push(...d.temperature_2m_min);
      if (d.precipitation_sum)    allPrecip.push(...d.precipitation_sum);
      if (d.wind_speed_10m_max)   allWind.push(...d.wind_speed_10m_max);
    }

    const normals = {
      avgTempMax:  avg(allTempMax),
      avgTempMin:  avg(allTempMin),
      avgPrecip:   avg(allPrecip),
      avgWindMax:  avg(allWind),
      _ts: Date.now(),
    };

    // Se non abbiamo abbastanza dati, non cachare risultati vuoti
    if (normals.avgTempMax == null && normals.avgTempMin == null) return null;

    // ── Salva in cache ──────────────────────────────────────────────────
    try {
      await AsyncStorage.setItem(key, JSON.stringify(normals));
    } catch (_) { /* non critico */ }

    return normals;
  } catch (err) {
    console.warn('[ClimateNormals] fetch failed:', err.message);
    return null;
  }
}
