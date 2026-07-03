/**
 * WeatherAPI.com Service
 * API ufficiale — https://www.weatherapi.com
 * Licenza: ToS ufficiale (https://www.weatherapi.com/terms.aspx)
 * Free tier: 1.000.000 chiamate/mese, previsioni fino a 3 giorni
 *
 * COME OTTENERE LA CHIAVE GRATUITA:
 *  1. Registrati su https://www.weatherapi.com/signup.aspx
 *  2. Dashboard → copia la tua API key
 *  3. Incollala in src/services/config.js
 */

import axios from 'axios';
import { PROVIDERS } from './providers';

const BASE = PROVIDERS.WEATHER_API.baseUrl;
// KEY non disponibile lato app: le chiamate dirette sono disabilitate.
// Il provider è raggiunto esclusivamente tramite il backend proxy.
const KEY = undefined;

function wapiIcon(condCode, isDay) {
  // WeatherAPI usa codici condizione propri
  // Mappiamo i principali a MaterialCommunityIcons
  const map = {
    1000: isDay ? 'weather-sunny' : 'weather-night',
    1003: isDay ? 'weather-partly-cloudy' : 'weather-night-partly-cloudy',
    1006: 'weather-cloudy',
    1009: 'weather-cloudy',
    1030: 'weather-fog',
    1063: 'weather-rainy',
    1066: 'weather-snowy',
    1069: 'weather-snowy-rainy',
    1072: 'weather-rainy',
    1087: 'weather-lightning',
    1114: 'weather-snowy',
    1117: 'weather-snowy-heavy',
    1135: 'weather-fog',
    1147: 'weather-fog',
    1150: 'weather-rainy',
    1153: 'weather-rainy',
    1168: 'weather-rainy',
    1171: 'weather-pouring',
    1180: 'weather-rainy',
    1183: 'weather-rainy',
    1186: 'weather-pouring',
    1189: 'weather-pouring',
    1192: 'weather-pouring',
    1195: 'weather-pouring',
    1198: 'weather-snowy-rainy',
    1201: 'weather-snowy-rainy',
    1204: 'weather-snowy-rainy',
    1207: 'weather-snowy-rainy',
    1210: 'weather-snowy',
    1213: 'weather-snowy',
    1216: 'weather-snowy',
    1219: 'weather-snowy',
    1222: 'weather-snowy-heavy',
    1225: 'weather-snowy-heavy',
    1237: 'weather-hail',
    1240: 'weather-rainy',
    1243: 'weather-pouring',
    1246: 'weather-pouring',
    1249: 'weather-snowy-rainy',
    1252: 'weather-snowy-rainy',
    1255: 'weather-snowy',
    1258: 'weather-snowy-heavy',
    1261: 'weather-hail',
    1264: 'weather-hail',
    1273: 'weather-lightning-rainy',
    1276: 'weather-lightning-rainy',
    1279: 'weather-lightning',
    1282: 'weather-lightning',
  };
  return map[condCode] || 'weather-partly-cloudy';
}

/**
 * Meteo attuale + previsioni 3 giorni (con forecast orario)
 */
export async function fetchForecast(lat, lon) {
  if (!KEY || KEY.startsWith('INSERISCI')) {
    return null; // API key non configurata
  }

  const { data } = await axios.get(`${BASE}/forecast.json`, {
    params: {
      key: KEY,
      q: `${lat},${lon}`,
      days: 3,
      aqi: 'yes',
      alerts: 'yes',
      lang: 'it',
    },
    timeout: 8000,
  });

  const curr = data.current;

  return {
    provider: PROVIDERS.WEATHER_API,
    current: {
      temperature: curr.temp_c,
      feelsLike: curr.feelslike_c,
      humidity: curr.humidity,
      windspeed: curr.wind_kph,
      windDir: curr.wind_dir,
      description: curr.condition.text,
      icon: wapiIcon(curr.condition.code, curr.is_day),
      pressure: curr.pressure_mb,
      visibility: curr.vis_km,
      uvIndex: curr.uv,
      airQualityIndex: curr.air_quality?.['us-epa-index'] || null,
    },
    daily: data.forecast.forecastday.map(day => ({
      date: day.date,
      tempMax: day.day.maxtemp_c,
      tempMin: day.day.mintemp_c,
      tempMean: day.day.avgtemp_c,
      precipitation: day.day.totalprecip_mm,
      precipProbability: day.day.daily_chance_of_rain,
      description: day.day.condition.text,
      icon: wapiIcon(day.day.condition.code, 1),
      windMax: day.day.maxwind_kph,
      humidity: day.day.avghumidity,
      uvIndex: day.day.uv,
      sunrise: day.astro.sunrise,
      sunset: day.astro.sunset,
      moonrise: day.astro.moonrise,
    })),
    hourly: data.forecast.forecastday.flatMap(day =>
      day.hour.map(h => ({
        time: h.time,
        temp: h.temp_c,
        feelsLike: h.feelslike_c,
        humidity: h.humidity,
        precipProb: h.chance_of_rain,
        windspeed: h.wind_kph,
        description: h.condition.text,
        icon: wapiIcon(h.condition.code, h.is_day),
      }))
    ).filter(h => new Date(h.time) >= new Date()),
    alerts: data.alerts?.alert || [],
  };
}
