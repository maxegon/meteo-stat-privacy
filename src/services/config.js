/**
 * CONFIGURAZIONE APP
 *
 * BACKEND_URL: punta al backend proxy che gestisce tutte le API key e il caching.
 *  - Sviluppo locale (simulatore):   'http://localhost:3007'
 *  - Sviluppo locale (device fisico): 'http://IP_DEL_MAC:3007'
 *    (il tuo IP locale lo trovi con: ifconfig | grep "inet 192")
 *  - Produzione (Vercel):             'https://backend-eta-seven-21.vercel.app'
 *
 * SICUREZZA: le API key dei provider meteo non sono mai nel codice dell'app.
 * Stanno solo nelle variabili d'ambiente del backend (Vercel → Settings → Env Vars).
 */
export const BACKEND_URL = 'https://backend-eta-seven-21.vercel.app';

/**
 * Token di autenticazione per il backend.
 * Impostare EXPO_PUBLIC_APP_SECRET_TOKEN in MeteoAggregator/.env.local
 * (non committare il valore reale — vedere .env.example).
 */
export const APP_SECRET_TOKEN = process.env.EXPO_PUBLIC_APP_SECRET_TOKEN ?? '';

/**
 * Email di contatto usata nei User-Agent delle chiamate dirette a API di terze parti.
 * Impostare EXPO_PUBLIC_CONTACT_EMAIL in MeteoAggregator/.env.local
 */
export const CONTACT_EMAIL = process.env.EXPO_PUBLIC_CONTACT_EMAIL ?? 'weather-app@example.com';
