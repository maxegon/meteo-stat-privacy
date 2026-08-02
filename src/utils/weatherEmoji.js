/**
 * Mappa icona MaterialCommunityIcons (usata in tutta l'app, vedi WeatherIcon.js)
 * → emoji, per marker Leaflet dentro RadarMap.js (WebView, non può renderizzare
 * MaterialCommunityIcons nativamente).
 */
const ICON_TO_EMOJI = {
  'weather-sunny': '☀️',
  'weather-sunny-alert': '☀️',
  'weather-partly-cloudy': '⛅',
  'weather-night': '🌙',
  'weather-night-partly-cloudy': '🌙',
  'weather-cloudy': '☁️',
  'weather-fog': '🌫️',
  'weather-hail': '🌨️',
  'weather-lightning': '⚡',
  'weather-lightning-rainy': '⛈️',
  'weather-pouring': '🌧️',
  'weather-rainy': '🌦️',
  'weather-snowy': '❄️',
  'weather-snowy-heavy': '❄️',
  'weather-snowy-rainy': '🌨️',
  'weather-windy': '💨',
};

export function weatherIconToEmoji(iconName) {
  return ICON_TO_EMOJI[iconName] || '⛅';
}
