/**
 * GEOCODING SERVICE (inverso: coordinate → "Quartiere, Comune")
 *
 * FIX 2026-07-21 — interroga il backend, che a sua volta chiama Nominatim con
 * cache server-side (vedi backend/server.js /geocode/reverse). Risolve il
 * "Municipio mancante su Android": il geocoder nativo Android non espone il
 * quartiere per l'Italia, e la chiamata diretta a Nominatim dal device è meno
 * affidabile (rete mobile + policy 1 req/s). Il backend è la fonte preferita;
 * il client mantiene comunque i fallback Nominatim-diretto e nativo (vedi
 * reverseGeocodeOSM/reverseGeocodeCity in HomeScreen.js) così se il backend è
 * irraggiungibile o l'endpoint non è ancora deployato la geolocalizzazione
 * continua a funzionare come prima.
 */

import axios from 'axios';
import { BACKEND_URL, APP_SECRET_TOKEN } from './config';

const authHeaders = APP_SECRET_TOKEN ? { 'X-App-Token': APP_SECRET_TOKEN } : {};

// Ritorna { name, region, country, countryCode, lat, lon } oppure null.
export async function reverseGeocodeBackend(latitude, longitude) {
  try {
    const { data } = await axios.get(`${BACKEND_URL}/geocode/reverse`, {
      params: { lat: latitude, lon: longitude },
      headers: authHeaders,
      timeout: 6000,
    });
    if (!data || data.error || !data.name) return null;
    return {
      name: data.name,
      region: data.region || '',
      country: data.country || '',
      countryCode: data.countryCode || '',
      lat: latitude,
      lon: longitude,
    };
  } catch (_) {
    return null;
  }
}
