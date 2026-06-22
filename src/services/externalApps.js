// Strumenti complementari — Solo1Meteo non include radar live né mappe
// vento animate; queste app colmano quel gap senza essere alternative dirette.
export const EXTERNAL_APPS = [
  {
    name: 'Windy',
    domain: 'windy.com',
    fallback: '🌬️',
    note: 'Mappe interattive vento, pioggia e pressione',
    appStore: 'https://apps.apple.com/app/windy-wind-weather-forecast/id1161387262',
  },
  {
    name: 'Meteo Radar',
    domain: 'meteoeradar.it',
    fallback: '📡',
    note: 'Radar pluviometrico in tempo reale',
    appStore: 'https://apps.apple.com/it/app/meteo-radar/id545993260',
  },
];
