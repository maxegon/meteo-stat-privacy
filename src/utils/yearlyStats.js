/**
 * Aggregazione statistiche annuali da dati giornalieri Open-Meteo Archive API.
 * Condiviso tra StatsScreen.js (dettaglio anno) e TrendChart.js (grafico tendenza)
 * per evitare due implementazioni della stessa logica.
 */

const thisYear = new Date().getFullYear();
export const MIN_YEAR = 1940; // limite Open-Meteo Archive API (ERA5)
export const MAX_YEAR = thisYear - 1;

export function avg(arr) {
  const v = arr.filter(x => x != null);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}
export function round1(n) { return n != null ? Math.round(n * 10) / 10 : null; }

// Aggrega le statistiche di un anno dai dati giornalieri grezzi dell'Archive API.
// Null-safe: se la località non ha dati per quell'anno, ritorna null invece di
// rompere la UI (es. Math.max su array vuoto darebbe -Infinity).
export function statsForYear(daily, year) {
  if (!daily?.time) return null;
  const idxs = [];
  daily.time.forEach((t, i) => { if (t.startsWith(String(year))) idxs.push(i); });
  if (!idxs.length) return null;

  const maxT  = idxs.map(i => daily.temperature_2m_max[i]);
  const minT  = idxs.map(i => daily.temperature_2m_min[i]);
  const meanT = idxs.map(i => daily.temperature_2m_mean[i]);
  const rain  = idxs.map(i => daily.precipitation_sum[i]);
  const time  = idxs.map(i => daily.time[i]);

  const validMax = maxT.filter(x => x != null);
  const validMin = minT.filter(x => x != null);
  const absMax = validMax.length ? Math.max(...validMax) : null;
  const absMin = validMin.length ? Math.min(...validMin) : null;
  const idxMax = absMax != null ? maxT.indexOf(absMax) : -1;
  const idxMin = absMin != null ? minT.indexOf(absMin) : -1;

  const stats = {
    year,
    absMax, absMin,
    dateMax: idxMax >= 0 ? time[idxMax] : null,
    dateMin: idxMin >= 0 ? time[idxMin] : null,
    meanAnnual: round1(avg(meanT)),
    totalRain: round1(rain.reduce((a, b) => a + (b || 0), 0)),
    rainDays: rain.filter(x => x != null && x >= 1).length,
    hotDays: maxT.filter(x => x != null && x >= 30).length,
    coldDays: minT.filter(x => x != null && x <= 0).length,
  };

  const m = Array(12).fill(null).map(() => ({ temps: [], rain: 0 }));
  time.forEach((t, i) => {
    const mo = new Date(t).getMonth();
    if (meanT[i] != null) m[mo].temps.push(meanT[i]);
    if (rain[i] != null) m[mo].rain += rain[i];
  });
  const monthly = m.map(mo => ({
    avgTemp: round1(avg(mo.temps)),
    totalRain: round1(mo.rain),
  }));

  return { stats, monthly };
}
