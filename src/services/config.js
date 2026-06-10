/**
 * CONFIGURAZIONE APP
 *
 * BACKEND_URL: punta al backend proxy che gestisce tutte le API key e il caching.
 *  - Sviluppo locale (simulatore):   'http://localhost:3000'
 *  - Sviluppo locale (device fisico): 'http://IP_DEL_MAC:3000'
 *    (il tuo IP locale lo trovi con: ifconfig | grep "inet 192")
 *  - Produzione (Vercel):             'https://backend-eta-seven-21.vercel.app'
 */
export const BACKEND_URL = 'https://backend-eta-seven-21.vercel.app';

// Chiavi di fallback usate solo se il backend non è raggiungibile
// In produzione le chiavi stanno SOLO nel backend .env
export const API_KEYS = {
  OPEN_WEATHER_MAP: 'b6921bdbf271ffed3c33f436fb488b69',
  WEATHER_API:      '19b0af350d2c4dcea77125018260106',
};
