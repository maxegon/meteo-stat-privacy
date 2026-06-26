/**
 * Open-Meteo Service
 * API ufficiale gratuita — https://open-meteo.com
 * Licenza: CC BY 4.0
 * Nessuna API key richiesta.
 *
 * Fonte dati: ECMWF (Europa), DWD (Germania), NOAA (USA)
 */

import axios from 'axios';
import { PROVIDERS } from './providers';

const BASE = PROVIDERS.OPEN_METEO.baseUrl;
const ARCHIVE = PROVIDERS.OPEN_METEO.archiveUrl;

// WMO weather code → descrizione italiana
export function wmoDescription(code) {
  if (code === 0)  return 'Sereno';
  if (code <= 2)   return 'Poco nuvoloso';
  if (code <= 3)   return 'Nuvoloso';
  if (code <= 48)  return 'Nebbia';
  if (code <= 57)  return 'Pioggerella';
  if (code <= 67)  return 'Pioggia';
  if (code <= 77)  return 'Neve';
  if (code <= 82)  return 'Rovesci';
  if (code <= 86)  return 'Neve forte';
  if (code <= 99)  return 'Temporale';
  return 'Variabile';
}

export function wmoIcon(code) {
  if (code === 0)  return 'weather-sunny';
  if (code <= 2)   return 'weather-partly-cloudy';
  if (code <= 3)   return 'weather-cloudy';
  if (code <= 48)  return 'weather-fog';
  if (code <= 57)  return 'weather-rainy';
  if (code <= 67)  return 'weather-pouring';
  if (code <= 77)  return 'weather-snowy';
  if (code <= 82)  return 'weather-rainy';
  if (code <= 86)  return 'weather-snowy-heavy';
  if (code <= 99)  return 'weather-lightning-rainy';
  return 'weather-partly-cloudy';
}

/**
 * Previsioni 7 giorni per coordinate
 * @returns {Promise<OpenMeteoForecast>}
 */
export async function fetchForecast(lat, lon) {
  const { data } = await axios.get(`${BASE}/forecast`, {
    params: {
      latitude: lat,
      longitude: lon,
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'weathercode',
        'windspeed_10m_max',
        'uv_index_max',
        'precipitation_probability_max',
        'sunrise',
        'sunset',
      ].join(','),
      hourly: [
        'temperature_2m',
        'relativehumidity_2m',
        'apparent_temperature',
        'precipitation_probability',
        'precipitation',
        'weathercode',
        'windspeed_10m',
        'winddirection_10m',
      ].join(','),
      current: 'temperature_2m,relativehumidity_2m,apparent_temperature,weathercode,windspeed_10m,winddirection_10m,precipitation,surface_pressure',
      timezone: 'auto',
      forecast_days: 16,
    },
    timeout: 8000,
  });

  const cur = data.current;

  // Usa il nearest hourly slot per icona/descrizione: il current di Open-Meteo
  // è basato sull'output del modello NWP e può essere in ritardo rispetto all'orario reale.
  // L'hourly forecast per l'ora corrente è più fedele alle condizioni del momento.
  const nowIso = new Date().toISOString().slice(0, 13); // "2026-06-07T10"
  const nearestHourlyIdx = data.hourly.time.findIndex(t => t >= `${nowIso}:00`);
  const nearestCode = nearestHourlyIdx >= 0
    ? data.hourly.weathercode[nearestHourlyIdx]
    : cur.weathercode;

  return {
    provider: PROVIDERS.OPEN_METEO,
    current: {
      temperature: cur.temperature_2m,
      feelsLike: cur.apparent_temperature,
      humidity: cur.relativehumidity_2m,
      windspeed: cur.windspeed_10m,
      winddir: cur.winddirection_10m,
      pressure: cur.surface_pressure ?? null,
      weathercode: nearestCode,
      description: wmoDescription(nearestCode),
      icon: wmoIcon(nearestCode),
      time: cur.time,
    },
    daily: data.daily.time.map((date, i) => ({
      date,
      tempMax: data.daily.temperature_2m_max[i],
      tempMin: data.daily.temperature_2m_min[i],
      precipitation: data.daily.precipitation_sum[i],
      precipProbability: data.daily.precipitation_probability_max[i],
      weathercode: data.daily.weathercode[i],
      description: wmoDescription(data.daily.weathercode[i]),
      icon: wmoIcon(data.daily.weathercode[i]),
      windMax: data.daily.windspeed_10m_max[i],
      uvIndex: data.daily.uv_index_max[i],
      sunrise: data.daily.sunrise[i],
      sunset: data.daily.sunset[i],
    })),
    hourly: (() => {
      // Keep all hours of today + future (don't cut at current hour — night fascia needs 00-06)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return data.hourly.time
        .map((t, i) => ({
          time: t,
          temp: data.hourly.temperature_2m[i],
          feelsLike: data.hourly.apparent_temperature[i],
          humidity: data.hourly.relativehumidity_2m[i],
          precipProb: data.hourly.precipitation_probability[i],
          precipMm:   data.hourly.precipitation?.[i] ?? null,
          windspeed: data.hourly.windspeed_10m[i],
          winddir: data.hourly.winddirection_10m?.[i],
          weathercode: data.hourly.weathercode[i],
          description: wmoDescription(data.hourly.weathercode[i]),
          icon: wmoIcon(data.hourly.weathercode[i]),
        }))
        .filter(h => new Date(h.time) >= today)
        .slice(0, 16 * 24);
    })(),
    timezone: data.timezone,
  };
}

/**
 * Dati mare (OpenMeteo Marine API) — wave height, direction, period
 * Disponibile solo per zone costiere/marine; restituisce null per zone interne.
 */
export async function fetchMarine(lat, lon) {
  try {
    const { data } = await axios.get('https://marine-api.open-meteo.com/v1/marine', {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_direction,swell_wave_period',
        hourly: 'wave_height,wave_direction,wave_period',
        forecast_days: 3,
        timezone: 'auto',
      },
      timeout: 8000,
    });
    const c = data.current;
    if (!c || c.wave_height == null) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return {
      current: {
        waveHeight: c.wave_height,
        waveDir: c.wave_direction,
        wavePeriod: c.wave_period,
        swellHeight: c.swell_wave_height,
        swellDir: c.swell_wave_direction,
        swellPeriod: c.swell_wave_period,
      },
      hourly: data.hourly.time.map((t, i) => ({
        time: t,
        waveHeight: data.hourly.wave_height[i],
        waveDir: data.hourly.wave_direction[i],
        wavePeriod: data.hourly.wave_period[i],
      })).filter(h => new Date(h.time) >= today),
    };
  } catch {
    return null;
  }
}

/**
 * Dati storici su un range di anni in UNA sola chiamata (per la tendenza
 * decennale in StatsScreen) — evita N richieste separate, l'Archive API
 * accetta range arbitrari.
 * @returns {Promise<Object>}
 */
export async function fetchHistoricalRange(lat, lon, startYear, endYear) {
  const { data } = await axios.get(`${ARCHIVE}/archive`, {
    params: {
      latitude: lat,
      longitude: lon,
      start_date: `${startYear}-01-01`,
      end_date: `${endYear}-12-31`,
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'temperature_2m_mean',
        'precipitation_sum',
        'windspeed_10m_max',
      ].join(','),
      timezone: 'auto',
    },
    // Range ampi (es. 1940-oggi per il grafico tendenza "Tutto") restituiscono
    // payload grandi: l'Archive API non documenta un limite di range, ma niente
    // timeout di default significherebbe attesa potenzialmente infinita.
    timeout: 45000,
  });
  return { provider: PROVIDERS.OPEN_METEO, startYear, endYear, daily: data.daily };
}

/**
 * Geocoding — cerca città per nome
 * Open-Meteo ha anche una Geocoding API gratuita
 */
export async function searchCity(query) {
  const { data } = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
    params: { name: query, count: 8, language: 'it', format: 'json' },
  });
  return (data.results || []).map(r => ({
    id: r.id,
    name: r.name,
    region: r.admin1 || '',
    country: r.country || '',
    countryCode: r.country_code || '',
    lat: r.latitude,
    lon: r.longitude,
    elevation: r.elevation,
    timezone: r.timezone,
  }));
}
