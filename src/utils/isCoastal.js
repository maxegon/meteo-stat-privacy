/**
 * Determina se un punto geografico è entro ~50 km dalla costa.
 * Usa un set di bounding-box di zone costiere italiane + coste europee principali.
 * Approccio leggero (nessuna richiesta di rete), adatto all'uso offline.
 */

// Lista di bounding box [latMin, latMax, lonMin, lonMax] di zone costiere (±0.45° ≈ 50 km)
const COASTAL_ZONES = [
  // ── Italia ──────────────────────────────────────────────────────────────
  // Liguria
  [43.6, 44.5, 6.6, 10.0],
  // Toscana costa
  [42.0, 44.0, 9.8, 11.5],
  // Lazio costa
  [41.0, 42.5, 11.5, 12.5],
  // Campania / Cilento
  [39.8, 41.3, 14.0, 15.7],
  // Calabria tirrenica
  [37.8, 39.8, 15.5, 16.3],
  // Calabria ionica
  [37.8, 39.8, 16.2, 17.0],
  // Puglia Salento
  [39.5, 40.6, 17.8, 18.6],
  // Puglia adriatica
  [40.5, 42.0, 15.8, 16.5],
  // Abruzzo / Marche adriatica
  [42.0, 43.8, 13.0, 14.5],
  // Romagna / Veneto adriatica
  [43.8, 45.5, 12.0, 14.0],
  // Friuli Venezia Giulia
  [45.3, 45.8, 13.0, 14.0],
  // Sardegna (intera isola è "costiera")
  [38.8, 41.3, 8.0, 9.9],
  // Sicilia (intera isola)
  [36.5, 38.5, 11.8, 15.7],
  // Elba e isole toscane
  [42.2, 43.0, 9.8, 10.6],

  // ── Francia costa mediterranea ──────────────────────────────────────────
  [42.5, 43.8, 3.0, 7.6],
  // ── Spagna est ─────────────────────────────────────────────────────────
  [36.0, 43.5, -2.0, 3.5],
  // ── Croazia / Slovenia adriatica ────────────────────────────────────────
  [42.0, 46.0, 13.5, 18.5],
  // ── Grecia / Albania ────────────────────────────────────────────────────
  [36.0, 42.0, 19.0, 28.0],
  // ── Portogallo ─────────────────────────────────────────────────────────
  [36.5, 42.2, -9.5, -8.5],
  // ── Costa atlantica Francia ────────────────────────────────────────────
  [43.0, 51.5, -5.0, -1.0],
  // ── Olanda / Belgio / Inghilterra sud ──────────────────────────────────
  [50.5, 53.5, -1.5, 5.0],
  // ── Mare del Nord (Germania nord / Danimarca) ──────────────────────────
  [53.5, 57.5, 7.5, 12.5],
  // ── Norvegia / Svezia ──────────────────────────────────────────────────
  [57.5, 71.0, 4.0, 31.0],
  // ── Mare Baltico ────────────────────────────────────────────────────────
  [53.5, 66.0, 10.0, 30.0],
];

/**
 * Restituisce true se le coordinate rientrano in almeno una zona costiera.
 * @param {number} lat - latitudine
 * @param {number} lon - longitudine
 * @returns {boolean}
 */
export function isCoastal(lat, lon) {
  if (lat == null || lon == null) return false;
  return COASTAL_ZONES.some(
    ([latMin, latMax, lonMin, lonMax]) =>
      lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax
  );
}
