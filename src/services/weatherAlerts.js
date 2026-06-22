import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Soglie default (fisse — pavimento di sicurezza) ──────────────────────────
// Valori ragionevoli per l'Italia; l'utente può personalizzarli nelle impostazioni.
const DEFAULT_THRESHOLDS = {
  heatMax:      35,   // °C — caldo estremo
  coldMin:       0,   // °C — freddo estremo
  rainMmH:      20,   // mm/h — pioggia intensa
  windKmh:      60,   // km/h — vento forte
  uvMax:         8,   // indice UV — radiazione molto alta
};

// ── Delta anomalia (quanto sopra/sotto la media stagionale = scostamento netto) ─
// Questi non sono personalizzabili dall'utente — calibrati per essere sensati.
// NB: +5°C/−5°C è un superamento "consistente" delle medie stagionali, distinto
// dal caldo/freddo "estremo" (soglie fisse). Con +8°C l'anomalia coincideva quasi
// sempre con l'estremo, rendendo inutile la distinzione.
const ANOMALY_DELTA = {
  heatDelta:    3,    // °C sopra la media max del periodo → anomalia caldo
  coldDelta:    3,    // °C sotto la media min del periodo → anomalia freddo
  rainFactor:   3,    // ×media precipitazione giornaliera → anomalia pioggia
  windFactor:   2,    // ×media vento massimo giornaliero → anomalia vento
  // uvDelta rimosso: l'archivio storico non fornisce UV, niente anomalia UV.
};

const STORAGE_KEY = 'weather_alert_thresholds_v1';
const ENABLED_KEY = 'weather_alerts_enabled_v1';

// ── Persistence ───────────────────────────────────────────────────────────────
export async function loadThresholds() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...DEFAULT_THRESHOLDS, ...saved };
    }
  } catch (_) { /* fallback ai default */ }
  return { ...DEFAULT_THRESHOLDS };
}

export async function saveThresholds(thresholds) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
}

export async function loadAlertsEnabled() {
  try {
    const raw = await AsyncStorage.getItem(ENABLED_KEY);
    return raw !== 'false'; // default: abilitati
  } catch (_) { return true; }
}

export async function saveAlertsEnabled(enabled) {
  await AsyncStorage.setItem(ENABLED_KEY, JSON.stringify(enabled));
}

export function getDefaultThresholds() {
  return { ...DEFAULT_THRESHOLDS };
}

// ── Tipi di alert ─────────────────────────────────────────────────────────────
export const ALERT_TYPES = {
  heat:  { id: 'heat',  label: 'Caldo estremo',  icon: 'thermometer-high', color: '#ef4444', bgColor: '#f9731622', borderColor: '#f9731655', unit: '°C',   thresholdKey: 'heatMax' },
  cold:  { id: 'cold',  label: 'Freddo estremo',  icon: 'snowflake',        color: '#38bdf8', bgColor: '#38bdf822', borderColor: '#38bdf855', unit: '°C',   thresholdKey: 'coldMin' },
  rain:  { id: 'rain',  label: 'Pioggia intensa', icon: 'weather-pouring',  color: '#6366f1', bgColor: '#818cf822', borderColor: '#818cf855', unit: 'mm/h', thresholdKey: 'rainMmH' },
  wind:  { id: 'wind',  label: 'Vento forte',     icon: 'weather-windy',    color: '#f59e0b', bgColor: '#fbbf2422', borderColor: '#fbbf2455', unit: 'km/h', thresholdKey: 'windKmh' },
  uv:    { id: 'uv',    label: 'Radiazione UV molto alta', icon: 'weather-sunny-alert', color: '#a855f7', bgColor: '#a855f722', borderColor: '#a855f755', unit: '',     thresholdKey: 'uvMax' },
};

// Tipo per alert basati su scostamento dalle MEDIE STAGIONALI del periodo
// (etichetta e icona dedicate: NON "estremo" ma "oltre/sotto la media stagionale",
// così l'utente distingue il superamento consistente delle normali dal valore
// estremo in assoluto della soglia fissa).
const ANOMALY_TYPES = {
  heat: { id: 'heat',  label: 'Caldo oltre la media stagionale',  icon: 'thermometer-chevron-up',  color: '#ef4444', bgColor: '#f9731622', borderColor: '#f9731655', seasonal: true },
  cold: { id: 'cold',  label: 'Freddo sotto la media stagionale', icon: 'thermometer-chevron-down', color: '#38bdf8', bgColor: '#38bdf822', borderColor: '#38bdf855', seasonal: true },
  rain: { id: 'rain',  label: 'Pioggia oltre la media stagionale', icon: 'weather-pouring',         color: '#6366f1', bgColor: '#818cf822', borderColor: '#818cf855', seasonal: true },
  wind: { id: 'wind',  label: 'Vento oltre la media stagionale',   icon: 'weather-windy',           color: '#f59e0b', bgColor: '#fbbf2422', borderColor: '#fbbf2455', seasonal: true },
  // Nessun tipo UV: l'archivio storico non fornisce UV → niente media stagionale UV.
};

// ── Analisi dati ──────────────────────────────────────────────────────────────
/**
 * Analizza i dati meteo aggregati e restituisce un array di alert attivi.
 * Combina due livelli:
 * 1. Soglie fisse (pavimento di sicurezza — sempre attive)
 * 2. Anomalia climatica (confronto con medie storiche — se disponibili)
 *
 * @param {Object}   params
 * @param {Array}    params.daily       - giorni aggregati (da buildAggregateDays)
 * @param {Array}    params.hourly      - ore aggregate (da buildAggregateHourly)
 * @param {Object}   params.consensus   - dati consenso corrente
 * @param {Object}   params.thresholds  - soglie personalizzate
 * @param {Object|null} params.climate  - medie climatiche (da getClimateNormals)
 * @returns {Array}
 */
// Formattazione compatta del valore per ciascun tipo (usata quando la stessa
// soglia è superata sia oggi che domani: "Oggi e domani: max 36°C e 38°C").
const METRIC = {
  heat: { prefix: 'max ', short: v => `${Math.round(v)}°C` },
  cold: { prefix: 'min ', short: v => `${Math.round(v)}°C` },
  uv:   { prefix: '',     short: v => `UV ${Math.round(v)}` },
  rain: { prefix: '',     short: v => `${v.toFixed(1)} mm` },
  wind: { prefix: 'raffiche fino a ', short: v => `${Math.round(v)} km/h` },
};

export function detectAlerts({ daily = [], hourly = [], consensus, thresholds, climate }) {
  const t = thresholds || DEFAULT_THRESHOLDS;

  // Raccoglie tutti i trigger grezzi per (tipo, giorno). Si controllano DUE
  // giorni: Oggi (index 0) e Domani (index 1). Se la stessa soglia scatta in
  // entrambi, alla fine i due trigger vengono fusi in un unico banner con
  // l'etichetta "Oggi e domani".
  const raw = [];
  const push = (typeInfo, { day, value, source, detail }) => {
    raw.push({
      id: typeInfo.id, label: typeInfo.label, icon: typeInfo.icon, color: typeInfo.color,
      bgColor: typeInfo.bgColor, borderColor: typeInfo.borderColor,
      day, value, source, detail, seasonal: !!typeInfo.seasonal,
    });
  };

  const DAY_DEFS = [
    { idx: 0, label: 'Oggi' },
    { idx: 1, label: 'Domani' },
  ];

  DAY_DEFS.forEach(({ idx, label }) => {
    const day = daily[idx];
    if (!day) return;

    // ── SOGLIE FISSE ────────────────────────────────────────────────────
    if (day.tempMax != null && Math.round(day.tempMax) >= t.heatMax) {
      push(ALERT_TYPES.heat, { day: label, value: day.tempMax, source: 'fixed', detail: `max ${Math.round(day.tempMax)}°C` });
    }
    if (day.tempMin != null && Math.round(day.tempMin) <= t.coldMin) {
      push(ALERT_TYPES.cold, { day: label, value: day.tempMin, source: 'fixed', detail: `min ${Math.round(day.tempMin)}°C` });
    }
    if (day.uvIndex != null && Math.round(day.uvIndex) >= t.uvMax) {
      push(ALERT_TYPES.uv, { day: label, value: day.uvIndex, source: 'fixed', detail: `UV ${Math.round(day.uvIndex)} (protezione indispensabile)` });
    }
    if (day.precipitation != null && day.precipitation >= t.rainMmH) {
      push(ALERT_TYPES.rain, { day: label, value: day.precipitation, source: 'fixed', detail: `${day.precipitation.toFixed(1)} mm previsti` });
    }

    // ── ANOMALIA CLIMATICA (solo se abbiamo le medie storiche) ───────
    if (climate) {
      if (day.tempMax != null && climate.avgTempMax != null) {
        const threshold = climate.avgTempMax + ANOMALY_DELTA.heatDelta;
        if (day.tempMax >= threshold) {
          const diff = Math.round(day.tempMax - climate.avgTempMax);
          push(ANOMALY_TYPES.heat, { day: label, value: day.tempMax, source: 'anomaly', detail: `${Math.round(day.tempMax)}°C (+${diff}° sulla media stagionale)` });
        }
      }
      if (day.tempMin != null && climate.avgTempMin != null) {
        const threshold = climate.avgTempMin - ANOMALY_DELTA.coldDelta;
        if (day.tempMin <= threshold) {
          const diff = Math.round(climate.avgTempMin - day.tempMin);
          push(ANOMALY_TYPES.cold, { day: label, value: day.tempMin, source: 'anomaly', detail: `${Math.round(day.tempMin)}°C (${diff}° sotto la media stagionale)` });
        }
      }
      // NB: nessuna anomalia UV — l'archivio storico Open-Meteo usato in
      // climateNormals.js non fornisce l'UV, quindi non esiste una media UV
      // stagionale di riferimento. L'UV resta gestito solo dalla soglia fissa.
      if (day.precipitation != null && climate.avgPrecip != null && climate.avgPrecip > 0.5) {
        const threshold = climate.avgPrecip * ANOMALY_DELTA.rainFactor;
        if (day.precipitation >= threshold) {
          const factor = (day.precipitation / climate.avgPrecip).toFixed(1);
          push(ANOMALY_TYPES.rain, { day: label, value: day.precipitation, source: 'anomaly', detail: `${day.precipitation.toFixed(1)} mm (${factor}× la media stagionale)` });
        }
      }
    }
  });

  // ── Vento Oggi/Domani: picco orario per ciascun giorno ──────────────────
  const dateOf = h => (h?.time || '').replace(' ', 'T').slice(0, 10);
  const now = new Date();
  const maxWindForDate = (dateStr, futureOnly) => {
    if (!dateStr) return 0;
    return (hourly || []).reduce((max, h) => {
      if (dateOf(h) !== dateStr) return max;
      if (futureOnly && !(new Date(h.time) > now)) return max; // Oggi: solo ore future, come temp
      const ws = h?.windspeed;
      return (ws != null && ws > max) ? ws : max;
    }, 0);
  };
  DAY_DEFS.forEach(({ idx, label }) => {
    const day = daily[idx];
    if (!day) return;
    const maxWind = maxWindForDate(day.date, idx === 0);
    if (maxWind >= t.windKmh) {
      push(ALERT_TYPES.wind, { day: label, value: maxWind, source: 'fixed', detail: `raffiche fino a ${Math.round(maxWind)} km/h` });
    } else if (climate?.avgWindMax != null && climate.avgWindMax > 5) {
      const threshold = climate.avgWindMax * ANOMALY_DELTA.windFactor;
      if (maxWind >= threshold) {
        const factor = (maxWind / climate.avgWindMax).toFixed(1);
        push(ANOMALY_TYPES.wind, { day: label, value: maxWind, source: 'anomaly', detail: `${Math.round(maxWind)} km/h (${factor}× la media stagionale)` });
      }
    }
  });

  // ── Raggruppa per tipo, de-duplica per giorno (fixed > anomaly, poi più grave),
  //    poi fonde Oggi+Domani in un unico banner "Oggi e domani". ─────────────
  const byType = new Map();
  for (const r of raw) {
    const entry = byType.get(r.id) || { id: r.id, perDay: new Map() };
    const ex = entry.perDay.get(r.day);
    if (!ex) entry.perDay.set(r.day, r);
    else if (r.source === 'fixed' && ex.source === 'anomaly') entry.perDay.set(r.day, r);
    else if (r.source === ex.source && Math.abs(r.value) > Math.abs(ex.value)) entry.perDay.set(r.day, r);
    byType.set(r.id, entry);
  }

  const out = [];
  byType.forEach(entry => {
    const oggi = entry.perDay.get('Oggi');
    const domani = entry.perDay.get('Domani');
    const days = [];
    if (oggi) days.push('Oggi');
    if (domani) days.push('Domani');
    if (!days.length) return;

    // Per etichetta/colore preferisci un trigger "fixed" se presente
    const primary = (oggi && oggi.source === 'fixed') ? oggi
                  : (domani && domani.source === 'fixed') ? domani
                  : (oggi || domani);

    let dayPhrase, message;
    if (days.length === 2) {
      dayPhrase = 'Oggi e domani';
      const m = METRIC[entry.id] || { prefix: '', short: v => `${v}` };
      message = `${dayPhrase}: ${m.prefix}${m.short(oggi.value)} e ${m.short(domani.value)}`;
      if (primary.source === 'anomaly') message += ' (oltre la media stagionale)';
    } else {
      const only = oggi || domani;
      dayPhrase = days[0];
      message = `${dayPhrase}: ${only.detail}`;
    }

    out.push({
      id: entry.id, label: primary.label, icon: primary.icon, color: primary.color,
      bgColor: primary.bgColor, borderColor: primary.borderColor,
      message, day: dayPhrase, value: primary.value, source: primary.source,
      seasonal: primary.source === 'anomaly',
    });
  });

  return out;
}

// ── Controllo soglie per un singolo giorno (per evidenziare nelle previsioni) ──
/**
 * Controlla se un giorno aggregato supera una o più soglie.
 * Restituisce un array di { id, color, icon } per ogni soglia superata.
 * Usato per mostrare indicatori visivi nelle liste giornaliere/orarie.
 *
 * @param {Object} day - giorno aggregato (da buildAggregateDays)
 * @param {Object} thresholds - soglie personalizzate
 * @returns {Array<{id: string, color: string, icon: string}>}
 */
export function checkDayThresholds(day, thresholds) {
  if (!day) return [];
  const t = thresholds || DEFAULT_THRESHOLDS;
  const exceeded = [];

  // Usa Math.round() per coerenza con i valori mostrati nell'UI:
  // se display mostra 35° (da 34.6 arrotondato), il check deve scattare.
  if (day.tempMax != null && Math.round(day.tempMax) >= t.heatMax) {
    exceeded.push({ id: 'heat', color: ALERT_TYPES.heat.color, icon: ALERT_TYPES.heat.icon, bgColor: ALERT_TYPES.heat.bgColor });
  }
  if (day.tempMin != null && Math.round(day.tempMin) <= t.coldMin) {
    exceeded.push({ id: 'cold', color: ALERT_TYPES.cold.color, icon: ALERT_TYPES.cold.icon, bgColor: ALERT_TYPES.cold.bgColor });
  }
  if (day.precipitation != null && day.precipitation >= t.rainMmH) {
    exceeded.push({ id: 'rain', color: ALERT_TYPES.rain.color, icon: ALERT_TYPES.rain.icon, bgColor: ALERT_TYPES.rain.bgColor });
  }
  if (day.uvIndex != null && Math.round(day.uvIndex) >= t.uvMax) {
    exceeded.push({ id: 'uv', color: ALERT_TYPES.uv.color, icon: ALERT_TYPES.uv.icon, bgColor: ALERT_TYPES.uv.bgColor });
  }
  // windMax nei daily (se disponibile)
  if (day.windMax != null && Math.round(day.windMax) >= t.windKmh) {
    exceeded.push({ id: 'wind', color: ALERT_TYPES.wind.color, icon: ALERT_TYPES.wind.icon, bgColor: ALERT_TYPES.wind.bgColor });
  }

  return exceeded;
}

// ── Controllo soglie per una singola ora ────────────────────────────────────
/**
 * Controlla se un'ora supera una o più soglie.
 * @param {Object} hour - ora aggregata
 * @param {Object} thresholds
 * @returns {Array<{id: string, color: string, icon: string}>}
 */
export function checkHourThresholds(hour, thresholds) {
  if (!hour) return [];
  const t = thresholds || DEFAULT_THRESHOLDS;
  const exceeded = [];

  // Usa Math.round() per coerenza con i valori mostrati nell'UI
  const temp = hour.temp ?? hour.temperature;
  if (temp != null && Math.round(temp) >= t.heatMax) {
    exceeded.push({ id: 'heat', color: ALERT_TYPES.heat.color, icon: ALERT_TYPES.heat.icon, bgColor: ALERT_TYPES.heat.bgColor });
  }
  if (temp != null && Math.round(temp) <= t.coldMin) {
    exceeded.push({ id: 'cold', color: ALERT_TYPES.cold.color, icon: ALERT_TYPES.cold.icon, bgColor: ALERT_TYPES.cold.bgColor });
  }

  const precip = hour.precipMm ?? hour.precipitation;
  if (precip != null && precip >= t.rainMmH) {
    exceeded.push({ id: 'rain', color: ALERT_TYPES.rain.color, icon: ALERT_TYPES.rain.icon, bgColor: ALERT_TYPES.rain.bgColor });
  }

  const wind = hour.windspeed;
  if (wind != null && Math.round(wind) >= t.windKmh) {
    exceeded.push({ id: 'wind', color: ALERT_TYPES.wind.color, icon: ALERT_TYPES.wind.icon, bgColor: ALERT_TYPES.wind.bgColor });
  }

  return exceeded;
}

// ── Allerte UFFICIALI (da provider terzi, oggi: WeatherAPI.com) ──────────────
// A differenza di tutto quanto sopra (calcolato dall'app su soglie/anomalie),
// queste sono allerte EMESSE da enti meteorologici/civili terzi e riprodotte
// così come ricevute — nessuna logica di calcolo, nessuna convalida da parte
// di Solo1Meteo. WeatherAPI usa la scala di severità NWS (Extreme/Severe/
// Moderate/Minor); la mappiamo sui 3 livelli colore standard italiani.
const OFFICIAL_SEVERITY_MAP = {
  extreme:  { level: 'red',    color: '#dc2626', label: 'Allerta rossa' },
  severe:   { level: 'orange', color: '#f97316', label: 'Allerta arancione' },
  moderate: { level: 'yellow', color: '#facc15', label: 'Allerta gialla' },
  minor:    { level: 'yellow', color: '#facc15', label: 'Allerta gialla' },
};
const DEFAULT_OFFICIAL_SEVERITY = { level: 'yellow', color: '#facc15', label: 'Allerta gialla' };

function mapOfficialSeverity(raw) {
  return OFFICIAL_SEVERITY_MAP[String(raw || '').toLowerCase()] || DEFAULT_OFFICIAL_SEVERITY;
}

// WeatherAPI non fornisce un campo "issuer" dedicato — l'ente emittente è
// spesso riportato in coda all'headline ("... by NWS"). Fallback generico
// se non identificabile, per non lasciare il campo vuoto in UI.
function extractIssuer(headline, category) {
  const m = String(headline || '').match(/\bby\s+([^.]+)$/i);
  if (m) return m[1].trim();
  return category || 'Ente meteorologico locale';
}

/**
 * Estrae le allerte ufficiali ricevute da WeatherAPI.com (campo `alerts.alert`
 * della risposta), normalizzandole in un array uniforme. Tollerante a:
 * array, oggetto singolo, o campo assente/null (caso più comune — la
 * copertura allerte di WeatherAPI per l'Italia è limitata).
 *
 * @param {Object} weather - oggetto weather completo (da fetchAll/WeatherContext)
 * @returns {Array<{id, severity, color, severityLabel, issuer, headline, description, areas, effective, expires, url}>}
 */
export function extractOfficialAlerts(weather) {
  const raw = weather?.weatherApi?.alerts?.alert;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];

  return list.filter(Boolean).map((a, idx) => {
    const sev = mapOfficialSeverity(a.severity);
    const areas = String(a.areas || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    return {
      id: `wapi_${idx}_${a.event || a.headline || idx}`,
      severity: sev.level,
      color: sev.color,
      severityLabel: sev.label,
      issuer: extractIssuer(a.headline, a.category),
      headline: a.headline || a.event || 'Allerta meteo',
      description: a.desc || a.instruction || '',
      areas,
      effective: a.effective || null,
      expires: a.expires || null,
      url: a.url || null,
    };
  });
}
