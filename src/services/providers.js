/**
 * PROVIDER METEO — Configurazione e metadati
 *
 * LICENZE:
 *  - Open-Meteo:      CC BY 4.0       https://open-meteo.com/en/license
 *  - OpenWeatherMap:  ToS free tier   https://openweathermap.org/terms
 *  - WeatherAPI.com:  ToS free tier   https://www.weatherapi.com/terms.aspx
 *  - MET Norway:      NLOD + CC BY 4.0 https://api.met.no/doc/
 *  - Brightsky/DWD:   CC BY 4.0       https://brightsky.dev
 *  - Visual Crossing: ToS + attrib.   https://www.visualcrossing.com/weather-services-terms
 *  - 7Timer!:         pubblico        http://www.7timer.info
 *  - Tomorrow.io:     ToS free tier   https://www.tomorrow.io/terms-of-service/
 */

export const PROVIDERS = {
  OPEN_METEO: {
    id: 'open_meteo',
    name: 'Open-Meteo',
    shortName: 'Open-M',
    color: '#38bdf8',
    logo: '🌐',
    licenseUrl: 'https://open-meteo.com/en/license',
    attribution: 'Dati meteo forniti da Open-Meteo.com (CC BY 4.0)',
    apiKeyRequired: false,
    free: true,
    baseUrl: 'https://api.open-meteo.com/v1',
    archiveUrl: 'https://archive-api.open-meteo.com/v1',
  },
  OPEN_WEATHER: {
    id: 'open_weather',
    name: 'OpenWeatherMap',
    shortName: 'OWeather',
    color: '#fb923c',
    logo: '🟠',
    licenseUrl: 'https://openweathermap.org/terms',
    attribution: 'Dati forniti da OpenWeatherMap.org',
    apiKeyRequired: true,
    free: true,
    baseUrl: 'https://api.openweathermap.org/data/2.5',
  },
  WEATHER_API: {
    id: 'weather_api',
    name: 'WeatherAPI.com',
    shortName: 'W.API',
    color: '#a78bfa',
    logo: '🟢',
    licenseUrl: 'https://www.weatherapi.com/terms.aspx',
    attribution: 'Dati forniti da WeatherAPI.com',
    apiKeyRequired: true,
    free: true,
    baseUrl: 'https://api.weatherapi.com/v1',
  },
  MET_NORWAY: {
    id: 'met_norway',
    name: 'MET Norway',
    shortName: 'MET No',
    color: '#f59e0b',
    logo: '🇳🇴',
    licenseUrl: 'https://api.met.no/doc/',
    attribution: 'Dati meteo forniti da MET Norway (Yr.no) — NLOD + CC BY 4.0',
    apiKeyRequired: false,
    free: true,
    baseUrl: 'https://api.met.no/weatherapi/locationforecast/2.0',
  },
  BRIGHTSKY: {
    id: 'brightsky',
    name: 'Brightsky (DWD)',
    shortName: 'DWD',
    color: '#34d399',
    logo: '🇩🇪',
    licenseUrl: 'https://brightsky.dev',
    attribution: 'Dati meteo forniti da Brightsky / Deutscher Wetterdienst (CC BY 4.0)',
    apiKeyRequired: false,
    free: true,
    baseUrl: 'https://api.brightsky.dev',
  },
  VISUAL_CROSSING: {
    id: 'visual_crossing',
    name: 'Visual Crossing',
    shortName: 'VISXG',
    color: '#f472b6',
    logo: '📊',
    licenseUrl: 'https://www.visualcrossing.com/weather-services-terms',
    attribution: 'Powered by Visual Crossing Weather',
    apiKeyRequired: true,
    free: true,
    baseUrl: 'https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services',
  },
  SEVEN_TIMER: {
    id: 'seven_timer',
    name: '7Timer!',
    shortName: '7TMR',
    color: '#60a5fa',
    logo: '7️⃣',
    licenseUrl: 'http://www.7timer.info',
    attribution: 'Dati meteo forniti da 7Timer! (GFS/NOAA)',
    apiKeyRequired: false,
    free: true,
    baseUrl: 'http://www.7timer.info/bin',
  },
  TOMORROW_IO: {
    id: 'tomorrow_io',
    name: 'Tomorrow.io',
    shortName: 'T.IO',
    color: '#e879f9',
    logo: '🔮',
    licenseUrl: 'https://www.tomorrow.io/terms-of-service/',
    attribution: 'Powered by Tomorrow.io',
    apiKeyRequired: true,
    free: true,
    baseUrl: 'https://api.tomorrow.io/v4',
  },
};
