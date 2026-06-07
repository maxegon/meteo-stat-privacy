/**
 * Restituisce il colore appropriato per ogni icona meteo MaterialCommunityIcons.
 * Usato in ForecastModal, WeatherCard, HomeScreen.
 */
export function getIconColor(iconName, dark = true) {
  const n = iconName || '';
  // Sole pieno
  if (n === 'weather-sunny')                           return '#fbbf24';
  // Sole dietro le nuvole → giallo (il sole domina visivamente)
  if (n === 'weather-partly-cloudy')                   return '#fbbf24';
  // Qualsiasi altra icona "sunny" (es. night-partly-cloudy con sole)
  if (n.includes('sunny'))                             return '#fbbf24';
  // Fulmine / temporale
  if (n.includes('lightning'))                         return '#f59e0b';
  // Neve
  if (n.includes('snowy'))                             return dark ? '#bfdbfe' : '#93c5fd';
  // Pioggia / rovescio
  if (n.includes('rainy') || n.includes('pouring'))   return '#38bdf8';
  // Nebbia / grandine
  if (n.includes('fog') || n.includes('hail'))        return dark ? '#94a3b8' : '#64748b';
  // Notte (luna, stelle) → viola/indigo
  if (n.includes('night'))                             return '#818cf8';
  // Nuvoloso totale → bianco (dark) o grigio medio (light)
  if (n.includes('cloudy'))                            return dark ? '#f1f5f9' : '#94a3b8';
  // Default
  return dark ? '#e2e8f0' : '#64748b';
}
