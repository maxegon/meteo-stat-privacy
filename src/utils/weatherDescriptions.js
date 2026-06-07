/**
 * Mappa descrizioni meteo EN → IT
 * Copre i formati usati da Open-Meteo, OpenWeatherMap, WeatherAPI e MET Norway
 */
const DESC_MAP = {
  // Sereno / Soleggiato
  'clear sky':                    'Cielo sereno',
  'clear':                        'Sereno',
  'sunny':                        'Soleggiato',
  'mainly clear':                 'Prevalentemente sereno',

  // Poco nuvoloso
  'few clouds':                   'Poco nuvoloso',
  'partly cloudy':                'Parzialmente nuvoloso',
  'partly sunny':                 'Parzialmente soleggiato',

  // Nuvoloso
  'scattered clouds':             'Nuvole sparse',
  'broken clouds':                'Nuvoloso',
  'overcast clouds':              'Coperto',
  'overcast':                     'Coperto',
  'cloudy':                       'Nuvoloso',

  // Nebbia
  'fog':                          'Nebbia',
  'mist':                         'Foschia',
  'haze':                         'Foschia',
  'freezing fog':                 'Nebbia gelata',
  'depositing rime fog':          'Nebbia con brina',

  // Pioviggine
  'light drizzle':                'Pioviggine leggera',
  'moderate drizzle':             'Pioviggine moderata',
  'dense drizzle':                'Pioviggine intensa',
  'drizzle':                      'Pioviggine',
  'freezing drizzle':             'Pioviggine gelata',
  'heavy freezing drizzle':       'Pioviggine gelata intensa',
  'patchy light drizzle':         'Pioviggine leggera a tratti',

  // Pioggia
  'light rain':                   'Pioggia leggera',
  'moderate rain':                'Pioggia moderata',
  'heavy rain':                   'Pioggia forte',
  'heavy intensity rain':         'Pioggia molto forte',
  'very heavy rain':              'Pioggia torrenziale',
  'extreme rain':                 'Pioggia estrema',
  'freezing rain':                'Pioggia gelata',
  'light freezing rain':          'Pioggia gelata leggera',
  'light intensity drizzle rain': 'Pioggerellina',
  'drizzle rain':                 'Pioggerellina',
  'shower rain':                  'Rovescio',
  'light intensity shower rain':  'Rovescio leggero',
  'heavy intensity shower rain':  'Rovescio forte',
  'ragged shower rain':           'Rovescio irregolare',
  'patchy rain possible':         'Possibili piogge sparse',
  'patchy rain nearby':           'Piogge sparse vicine',
  'light rain shower':            'Rovescio leggero',
  'moderate or heavy rain shower':'Rovescio moderato/forte',
  'torrential rain shower':       'Rovescio torrenziale',
  'slight rain':                  'Pioggia leggera',
  'moderate rain (at times heavy)':'Pioggia moderata (a tratti forte)',
  'slight, moderate or heavy rain showers': 'Rovesci leggeri/moderati/forti',

  // Neve
  'light snow':                   'Neve leggera',
  'snow':                         'Neve',
  'heavy snow':                   'Neve abbondante',
  'sleet':                        'Nevischio',
  'light shower sleet':           'Nevischio leggero',
  'shower sleet':                 'Nevischio a rovesci',
  'light rain and snow':          'Pioggia mista a neve',
  'rain and snow':                'Pioggia mista a neve',
  'light shower snow':            'Rovescio di neve leggero',
  'shower snow':                  'Rovescio di neve',
  'heavy shower snow':            'Rovescio di neve abbondante',
  'blowing snow':                 'Tormenta di neve',
  'patchy snow possible':         'Possibile neve a tratti',
  'blizzard':                     'Bufera di neve',
  'slight or moderate snow showers': 'Nevicate leggere/moderate',
  'heavy snow showers':           'Nevicate abbondanti',
  'slight snowfall':              'Nevicata leggera',
  'moderate snowfall':            'Nevicata moderata',
  'heavy snowfall':               'Nevicata abbondante',

  // Grandine
  'ice pellets':                  'Grandine fine',
  'light showers of ice pellets': 'Grandine fine leggera',
  'moderate or heavy showers of ice pellets': 'Grandine moderata/forte',
  'thunderstorm with slight hail':'Temporale con grandine leggera',
  'thunderstorm with heavy hail': 'Temporale con grandine forte',

  // Temporali
  'thunderstorm':                         'Temporale',
  'thunderstorm with light rain':         'Temporale con pioggia leggera',
  'thunderstorm with rain':               'Temporale con pioggia',
  'thunderstorm with heavy rain':         'Temporale con pioggia forte',
  'light thunderstorm':                   'Temporale leggero',
  'heavy thunderstorm':                   'Temporale forte',
  'ragged thunderstorm':                  'Temporale irregolare',
  'thunderstorm with light drizzle':      'Temporale con pioviggine',
  'thunderstorm with drizzle':            'Temporale con pioviggine',
  'thunderstorm with heavy drizzle':      'Temporale con pioviggine intensa',
  'slight or moderate thunderstorm':      'Temporale leggero/moderato',
  'violent thunderstorm':                 'Temporale violento',
  'thunderstorm with slight and heavy hail': 'Temporale con grandine',

  // Vento / Polvere
  'dust':                         'Polvere',
  'sand':                         'Sabbia',
  'sand/dust whirls':             'Mulinelli di sabbia',
  'squalls':                      'Raffiche',
  'tornado':                      'Tornado',
};

/**
 * Traduce una descrizione meteo dall'inglese all'italiano.
 * Se non trovata nella mappa, restituisce la stringa originale.
 */
export function translateDescription(desc) {
  if (!desc) return desc;
  const key = desc.toLowerCase().trim();
  return DESC_MAP[key] ?? desc;
}
