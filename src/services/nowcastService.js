/**
 * NOWCASTING SERVICE
 *
 * Interroga il backend per sapere se il radar RainViewer rileva pioggia in
 * corso ORA vicino alle coordinate indicate (segnale indipendente dai modelli
 * previsionali dei provider). Usato solo per correggere icona/descrizione del
 * consensus quando i modelli mostrano "sereno" mentre piove davvero in zona.
 */

import axios from 'axios';
import { BACKEND_URL, APP_SECRET_TOKEN } from './config';

const authHeaders = APP_SECRET_TOKEN ? { 'X-App-Token': APP_SECRET_TOKEN } : {};

export async function getNowcast(lat, lon) {
  try {
    const { data } = await axios.get(`${BACKEND_URL}/nowcast`, {
      params: { lat, lon },
      headers: authHeaders,
      timeout: 10000,
    });
    return data;
  } catch (err) {
    return { isRainingNow: false, intensity: null, frameTime: null };
  }
}
