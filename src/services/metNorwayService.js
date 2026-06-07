/**
 * MET Norway Service (Yr.no)
 * API ufficiale gratuita — https://api.met.no
 * Licenza: NLOD + Creative Commons 4.0 BY
 * Nessuna API key richiesta — solo User-Agent obbligatorio.
 *
 * Fonte dati: ECMWF + modello NWP norvegese
 */

import axios from 'axios';
import { PROVIDERS } from './providers';
import { wmoIcon } from './openMeteoService';

const BASE = 'https://api.met.no/weatherapi/locationforecast/2.0';

// Simbolo MET Norway → descrizione italiana
function symbolToDescription(symbol) {
  if (!symbol) return 'Variabile';
  if (symbol.includes('clearsky'))        return 'Sereno';
  if (symbol.includes('fair'))            return 'Poco nuvoloso';
  if (symbol.includes('partlycloudy'))    return 'Parzialmente nuvoloso';
  if (symbol.includes('cloudy'))          return 'Nuvoloso';
  if (symbol.includes('fog'))             return 'Nebbia';
  if (symbol.includes('heavysnow'))       return 'Neve forte';
  if (symbol.includes('snow'))            return 'Neve';
  if (symbol.includes('sleet'))           return 'Nevischio';
  if (symbol.includes('heavyrain'))       return 'Pioggia intensa';
  if (symbol.includes('lightrain'))       return 'Pioggerella';
  if (symbol.includes('rain'))            return 'Pioggia';
  if (symbol.includes('thunder'))         return 'Temporale';
  return 'Variabile';
}

function symbolToIcon(symbol) {
  if (!symbol) return 'weather-partly-cloudy';
  if (symbol.includes('clearsky'))        return 'weather-sunny';
  if (symbol.includes('fair'))            return 'weather-partly-cloudy';
  if (symbol.includes('partlycloudy'))    return 'weather-partly-cloudy';
  if (symbol.includes('cloudy'))          return 'weather-cloudy';
  if (symbol.includes('fog'))             return 'weather-fog';
  if (symbol.includes('heavysnow'))       return 'weather-snowy-heavy';
  if (symbol.includes('snow'))            return 'weather-snowy';
  if (symbol.includes('sleet'))           return 'weather-snowy-rainy';
  if (symbol.includes('heavyrain'))       return 'weather-pouring';
  if (symbol.includes('lightrain'))       return 'weather-rainy';
  if (symbol.includes('rain'))            return 'weather-rainy';
  if (symbol.includes('thunder'))         return 'weather-lightning-rainy';
  return 'weather-partly-cloudy';
}

export async function fetchForecast(lat, lon) {
  const { data } = await axios.get(`${BASE}/compact`, {
    params: { lat: parseFloat(lat).toFixed(4), lon: parseFloat(lon).toFixed(4) },
    headers: {
      'User-Agent': 'OnlyOneMeteo/1.0 maxegonit@gmail.com',
    },
  });

  const timeseries = data.properties.timeseries;
  if (!timeseries || !timeseries.length) throw new Error('Nessun dato MET Norway');

  // Ora corrente
  const now = timeseries[0];
  const nowDetails = now.data.instant.details;
  const nowSymbol = now.data.next_1_hours?.summary?.symbol_code
    || now.data.next_6_hours?.summary?.symbol_code
    || '';

  const current = {
    temperature: nowDetails.air_temperature,
    feelsLike: nowDetails.air_temperature, // MET non fornisce feelsLike nel compact
    humidity: nowDetails.relative_humidity,
    windspeed: nowDetails.wind_speed * 3.6, // m/s → km/h
    description: symbolToDescription(nowSymbol),
    icon: symbolToIcon(nowSymbol),
  };

  // Orari (prossime 48h)
  const hourly = timeseries.slice(0, 48).map(t => {
    const d = t.data.instant.details;
    const sym = t.data.next_1_hours?.summary?.symbol_code || '';
    return {
      time: t.time,
      temperature: d.air_temperature,
      humidity: d.relative_humidity,
      windspeed: d.wind_speed * 3.6,
      precipitation: t.data.next_1_hours?.details?.precipitation_amount || 0,
      description: symbolToDescription(sym),
      icon: symbolToIcon(sym),
    };
  });

  // Giornaliero (prossimi 7 giorni) — raggruppa per data
  const dailyMap = {};
  timeseries.forEach(t => {
    const date = t.time.slice(0, 10);
    const d = t.data.instant.details;
    const sym = t.data.next_6_hours?.summary?.symbol_code
      || t.data.next_1_hours?.summary?.symbol_code
      || '';
    const precip = t.data.next_6_hours?.details?.precipitation_amount
      || t.data.next_1_hours?.details?.precipitation_amount
      || 0;

    if (!dailyMap[date]) {
      dailyMap[date] = { temps: [], precip: 0, symbols: [] };
    }
    dailyMap[date].temps.push(d.air_temperature);
    dailyMap[date].precip += precip;
    if (sym) dailyMap[date].symbols.push(sym);
  });

  const daily = Object.entries(dailyMap).slice(0, 7).map(([date, v]) => {
    // Simbolo più frequente del giorno
    const freq = {};
    v.symbols.forEach(s => { freq[s] = (freq[s] || 0) + 1; });
    const topSym = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    return {
      date,
      tempMax: Math.max(...v.temps),
      tempMin: Math.min(...v.temps),
      precipitation: v.precip,
      description: symbolToDescription(topSym),
      icon: symbolToIcon(topSym),
    };
  });

  return {
    provider: PROVIDERS.MET_NORWAY,
    current,
    hourly,
    daily,
  };
}
