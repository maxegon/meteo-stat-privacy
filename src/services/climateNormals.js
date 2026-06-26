import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Servizio per recuperare le medie climatiche storiche da Open-Meteo Historical Weather API.
 *
 * Strategia:
 * - Periodo di riferimento 2005–2024 (20 anni) per una finestra ±7 giorni intorno
 *   alla data corrente — più rappresentativo del clima attuale dei soli 3 anni
 *   caldi 2022–24, senza esserne "gonfiato".
 * - UNA sola chiamata per l'intero range, poi filtro client-side alla finestra
 *   ±7 giorni (1 fetch invece di 20 → leggero, niente rate-limit).
 * - Media di tutti i valori per ottenere le "normali climatiche" della zona/periodo
 * - Cache in AsyncStorage (le medie non cambiano): chiave settimanale per i dati
 *   "freschi" + copia "last good" mensile usata come fallback se il fetch fallisce,
 *   così gli alert anomalia non si spengono quando l'archivio non risponde.
 */

// v2: periodo di riferimento cambiato (2005–2024). Il bump invalida le medie
// vecchie (2022–24) già in cache, forzando un nuovo fetch.
const CACHE_PREFIX = 'climate_normals_v2_';
const CACHE_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni (le normali sono stabili)
const FETCH_ATTEMPTS = 2;          // 1 tentativo + 1 retry
const RETRY_DELAY_MS = 1200;       // attesa tra i tentativi
const REF_START_YEAR = 2005;
const REF_END_YEAR = 2024;
const WINDOW_DAYS = 7; // ±7 giorni = finestra di 15 giorni

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Chiave cache: arrotondata a 0.1° (copre ~11km, stessa granularità ERA5-Land) */
function cacheKey(lat, lon) {
  const rLat = (Math.round(lat * 10) / 10).toFixed(1);
  const rLon = (Math.round(lon * 10) / 10).toFixed(1);
  const now = new Date();
  // La chiave include mese+settimana per invalidare quando cambia il periodo
  const week = Math.floor(now.getDate() / 7);
  return `${CACHE_PREFIX}${rLat}_${rLon}_${now.getMonth()}_${week}`;
}

/** Chiave "ultimo valore buono" (per mese): fallback quando il fetch fallisce. */
function staleKey(lat, lon) {
  const rLat = (Math.round(lat * 10) / 10).toFixed(1);
  const rLon = (Math.round(lon * 10) / 10).toFixed(1);
  return `${CACHE_PREFIX}lastgood_${rLat}_${rLon}_${new Date().getMonth()}`;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

/** Giorno dell'anno (1–366) di una data. */
function dayOfYear(d) {
  const start = Date.UTC(d.getFullYear(), 0, 0);
  const diff = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start;
  return Math.floor(diff / 86400000);
}

// Una sola richiesta per l'intero periodo di riferimento (2005–2024); il filtro
// alla finestra ±7 giorni intorno alla data odierna avviene poi client-side.
async function fetchRange(lat, lon) {
  const url = `https://archive-api.open-meteo.com/v1/archive`
    + `?latitude=${lat}&longitude=${lon}`
    + `&start_date=${REF_START_YEAR}-01-01&end_date=${REF_END_YEAR}-12-31`
    + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max`
    + `&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Fetch con un retry: l'archivio Open-Meteo può dare timeout/5xx sporadici.
async function fetchRangeWithRetry(lat, lon) {
  let lastErr;
  for (let i = 0; i < FETCH_ATTEMPTS; i++) {
    try {
      return await fetchRange(lat, lon);
    } catch (e) {
      lastErr = e;
      if (i < FETCH_ATTEMPTS - 1) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      }
    }
  }
  throw lastErr;
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

  // ── Fetch unico del periodo di riferimento, poi filtro alla finestra ─────
  try {
    const data = await fetchRangeWithRetry(lat, lon);
    const d = data?.daily;

    // Indici dei giorni che cadono entro ±WINDOW_DAYS dalla data odierna
    // (confronto sul giorno dell'anno, con wraparound a fine/inizio anno).
    const targetDoy = dayOfYear(new Date());
    const times = d?.time || [];
    const inWindow = times.map(t => {
      const doy = dayOfYear(new Date(t));
      let diff = Math.abs(doy - targetDoy);
      diff = Math.min(diff, 365 - diff);
      return diff <= WINDOW_DAYS;
    });

    const pick = (arr) => (arr || []).filter((_, i) => inWindow[i]);
    const allTempMax = pick(d?.temperature_2m_max);
    const allTempMin = pick(d?.temperature_2m_min);
    const allPrecip  = pick(d?.precipitation_sum);
    const allWind    = pick(d?.wind_speed_10m_max);

    const normals = {
      avgTempMax:  avg(allTempMax),
      avgTempMin:  avg(allTempMin),
      avgPrecip:   avg(allPrecip),
      avgWindMax:  avg(allWind),
      _ts: Date.now(),
    };

    // Se non abbiamo abbastanza dati, non cachare risultati vuoti
    if (normals.avgTempMax == null && normals.avgTempMin == null) return null;

    // ── Salva in cache (chiave settimanale + copia "last good" mensile) ──
    try {
      await AsyncStorage.setItem(key, JSON.stringify(normals));
      await AsyncStorage.setItem(staleKey(lat, lon), JSON.stringify(normals));
    } catch (_) { /* non critico */ }

    return normals;
  } catch (err) {
    // Fetch fallito anche dopo il retry: invece di disattivare gli alert anomalia
    // (ritornando null), proviamo a riusare l'ultimo valore buono salvato — anche
    // se "scaduto": le normali climatiche cambiano in modo trascurabile.
    try {
      const lastGood = await AsyncStorage.getItem(staleKey(lat, lon));
      if (lastGood) {
        console.log('[ClimateNormals] fetch fallito, uso ultimo valore in cache');
        return JSON.parse(lastGood);
      }
    } catch (_) { /* nessun fallback disponibile */ }
    console.warn('[ClimateNormals] fetch failed:', err.message);
    return null;
  }
}
