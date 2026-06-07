/**
 * OpenWeatherMap Service
 * API ufficiale — https://openweathermap.org
 * Licenza: ToS ufficiale (https://openweathermap.org/terms)
 * Free tier: 1.000 chiamate/giorno, 60 chiamate/minuto
 *
 * COME OTTENERE LA CHIAVE GRATUITA:
 *  1. Registrati su https://home.openweathermap.org/users/sign_up
 *  2. Vai su "My API Keys"
 *  3. Copia la chiave e incollala in src/services/config.js
 */

import axios from 'axios';
import { PROVIDERS } from './providers';
import { API_KEYS } from './config';

const BASE = PROVIDERS.OPEN_WEATHER.baseUrl;
const KEY  = API_KEYS.OPEN_WEATHER_MAP;

// Mappa condizione OWM → icona MaterialCommunityIcons
function owmIcon(id, pod) {
  const night = pod === 'n';
  if (id === 800) return night ? 'weather-night' : 'weather-sunny';
  if (id <= 801)  return night ? 'weather-night-partly-cloudy' : 'weather-partly-cloudy';
  if (id <= 804)  return 'weather-cloudy';
  if (id >= 200 && id < 300) return 'weather-lightning-rainy';
  if (id >= 300 && id < 400) return 'weather-rainy';
  if (id >= 500 && id < 504) return 'weather-pouring';
  if (id >= 520 && id < 600) return 'weather-rainy';
  if (id >= 600 && id < 700) return 'weather-snowy';
  if (id >= 700 && id < 800) return 'weather-fog';
  return 'weather-partly-cloudy';
}

/**
 * Meteo attuale + previsioni 5 giorni (ogni 3 ore)
 * Via endpoint /forecast (5-day/3-hour, incluso nel free tier)
 */
export async function fetchForecast(lat, lon) {
  if (!KEY || KEY.startsWith('INSERISCI')) {
    return null; // API key non configurata
  }

  const [currentRes, forecastRes] = await Promise.all([
    axios.get(`${BASE}/weather`, {
      params: { lat, lon, appid: KEY, units: 'metric', lang: 'it' },
    }),
    axios.get(`${BASE}/forecast`, {
      params: { lat, lon, appid: KEY, units: 'metric', lang: 'it', cnt: 40 },
    }),
  ]);

  const curr = currentRes.data;
  const fc   = forecastRes.data;

  // Aggrega le 3h slots in giorni
  const dailyMap = {};
  fc.list.forEach(item => {
    const date = item.dt_txt.split(' ')[0];
    if (!dailyMap[date]) dailyMap[date] = { temps: [], rains: [], descriptions: [], icons: [], ids: [] };
    dailyMap[date].temps.push(item.main.temp);
    dailyMap[date].rains.push(item.rain?.['3h'] || 0);
    dailyMap[date].descriptions.push(item.weather[0].description);
    dailyMap[date].icons.push(owmIcon(item.weather[0].id));
    dailyMap[date].ids.push(item.weather[0].id);
  });

  const daily = Object.entries(dailyMap).slice(0, 7).map(([date, d]) => ({
    date,
    tempMax: Math.max(...d.temps),
    tempMin: Math.min(...d.temps),
    tempMean: d.temps.reduce((a, b) => a + b, 0) / d.temps.length,
    precipitation: d.rains.reduce((a, b) => a + b, 0),
    description: d.descriptions[Math.floor(d.descriptions.length / 2)],
    icon: owmIcon(d.ids[Math.floor(d.ids.length / 2)]),
  }));

  const hourly = fc.list.slice(0, 16).map(item => ({
    time: item.dt_txt,
    temp: item.main.temp,
    feelsLike: item.main.feels_like,
    humidity: item.main.humidity,
    precipProb: Math.round((item.pop || 0) * 100),
    windspeed: item.wind.speed * 3.6,
    description: item.weather[0].description,
    icon: owmIcon(item.weather[0].id, item.weather[0].icon?.slice(-1)),
  }));

  return {
    provider: PROVIDERS.OPEN_WEATHER,
    current: {
      temperature: curr.main.temp,
      feelsLike: curr.main.feels_like,
      humidity: curr.main.humidity,
      windspeed: curr.wind.speed * 3.6,
      description: curr.weather[0].description,
      icon: owmIcon(curr.weather[0].id, curr.weather[0].icon.slice(-1)),
      pressure: curr.main.pressure,
      visibility: curr.visibility / 1000,
    },
    daily,
    hourly,
  };
}
