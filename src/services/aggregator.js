/**
 * AGGREGATOR SERVICE
 *
 * Chiama il backend proxy che gestisce tutti i provider in parallelo
 * con caching e API key sicure lato server.
 *
 * Fallback automatico alle chiamate dirette se il backend non è raggiungibile.
 */

import axios from 'axios';
import { BACKEND_URL, APP_SECRET_TOKEN } from './config';
import * as OpenMeteo from './openMeteoService';
import * as OpenWeather from './openWeatherService';
import * as WeatherApi from './weatherApiService';
import * as MetNorway from './metNorwayService';
import { withRetry } from '../utils/withRetry';
import { logError } from '../utils/errorLogger';

// Header di autenticazione da allegare a tutte le chiamate al backend proxy
const authHeaders = APP_SECRET_TOKEN ? { 'X-App-Token': APP_SECRET_TOKEN } : {};

/**
 * Recupera meteo da tutti i provider tramite backend proxy.
 * Fallback alle chiamate dirette se il backend non risponde.
 */
export async function fetchAll(lat, lon) {
  try {
    // Retry automatico: 2 tentativi con backoff 1s → 2s
    const data = await withRetry(
      () => axios.get(`${BACKEND_URL}/weather`, {
        params: { lat, lon },
        headers: authHeaders,
        timeout: 12000, // 12s: provider hanno 8-10s timeout, cold start Vercel aggiunge ~2s
      }).then(r => r.data),
      2,   // maxTries
      1000 // baseDelay ms
    );
    return data;
  } catch (err) {
    // Backend non raggiungibile dopo tutti i retry — chiamate dirette.
    // Il log del backend parte dopo: se anche tutti i provider falliscono per rete,
    // il telefono e' offline e non serve una mail Sentry (SOLO1METEO-3, 19/11/2026).
    return fetchAllDirect(lat, lon, err);
  }
}

// Errore di rete senza risposta HTTP (offline, DNS, connessione rifiutata). I timeout restano esclusi.
const isNetworkError = e => !!e && !e.response && e.code === 'ERR_NETWORK';

async function fetchAllDirect(lat, lon, backendErr = null) {
  const [openMeteo, openWeather, weatherApi, metNorway, marine] = await Promise.allSettled([
    withRetry(() => OpenMeteo.fetchForecast(lat, lon), 2, 800),
    withRetry(() => OpenWeather.fetchForecast(lat, lon), 2, 800),
    withRetry(() => WeatherApi.fetchForecast(lat, lon), 2, 800),
    withRetry(() => MetNorway.fetchForecast(lat, lon), 2, 800),
    withRetry(() => OpenMeteo.fetchMarine(lat, lon), 2, 800),
  ]);

  // Logga provider che hanno fallito anche dopo i retry
  const providers = [['openMeteo', openMeteo], ['openWeather', openWeather], ['weatherApi', weatherApi], ['metNorway', metNorway]];
  const offline = isNetworkError(backendErr)
    && providers.every(([, r]) => r.status === 'rejected' && isNetworkError(r.reason));
  const opts = { skipSentry: offline }; // offline: solo log locale (tab Info)
  if (backendErr) logError('fetchAll:backend', backendErr, offline ? 'offline' : '', opts);
  providers.forEach(([name, r]) => {
    if (r.status === 'rejected') logError(`fetchAllDirect:${name}`, r.reason, '', opts);
  });

  const get = r => r.status === 'fulfilled' ? r.value : null;
  const results = {
    openMeteo:      get(openMeteo),
    openWeather:    get(openWeather),
    weatherApi:     get(weatherApi),
    metNorway:      get(metNorway),
    marine:         get(marine),
    brightsky:      null,
    visualCrossing: null,
    sevenTimer:     null,
    tomorrowIo:     null,
    isFallback:     true, // backend non raggiungibile, dati limitati a 4 provider
    errors: [],
  };

  const available = [results.openMeteo, results.openWeather, results.weatherApi, results.metNorway].filter(Boolean);
  const avg = arr => {
    const v = arr.filter(x => x != null);
    return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
  };
  const majority = arr => {
    const v = arr.filter(Boolean);
    if (!v.length) return null;
    const freq = {};
    v.forEach(x => { freq[x] = (freq[x] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  };

  results.consensus = available.length ? {
    temperature:    avg(available.map(p => p.current?.temperature)),
    feelsLike:      avg(available.map(p => p.current?.feelsLike)),
    humidity:       avg(available.map(p => p.current?.humidity)),
    windspeed:      avg(available.map(p => p.current?.windspeed)),
    pressure:       avg(available.map(p => p.current?.pressure).filter(v => v != null && v > 0)),
    description:    majority(available.map(p => p.current?.description)),
    icon:           majority(available.map(p => p.current?.icon)) || 'weather-partly-cloudy',
    providersCount: available.length,
  } : null;

  return results;
}

export const searchCity           = OpenMeteo.searchCity;
export const fetchHistoricalRange = OpenMeteo.fetchHistoricalRange;
export const fetchMarine          = OpenMeteo.fetchMarine;
