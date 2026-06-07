import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';

const LOG_KEY = 'app_error_log_v1';
const MAX_LOGS = 20;

/**
 * Registra un errore:
 * 1. Lo invia a Sentry → ti arriva email automatica
 * 2. Lo salva in AsyncStorage → visibile nella tab Info (5 tap versione)
 *
 * Silente: non lancia mai eccezioni.
 */
export async function logError(context, error, extra = '') {
  // ── Sentry (email automatica) ───────────────────────────────────────────
  try {
    Sentry.withScope(scope => {
      scope.setTag('context', String(context));
      if (extra) scope.setExtra('detail', String(extra).slice(0, 300));
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureMessage(`${context}: ${String(error)}`, 'error');
      }
    });
  } catch (_) {}

  // ── AsyncStorage (log locale per diagnostica in-app) ────────────────────
  try {
    const entry = {
      ts:      new Date().toISOString(),
      context: String(context),
      message: error?.message ?? String(error),
      stack:   (error?.stack ?? '').slice(0, 500),
      extra:   String(extra).slice(0, 300),
    };
    const raw  = await AsyncStorage.getItem(LOG_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift(entry);
    if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
    await AsyncStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch (_) {}
}

/** Legge i log locali (tab Info → 5 tap versione). */
export async function readErrorLogs() {
  try {
    const raw = await AsyncStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Svuota i log locali. */
export async function clearErrorLogs() {
  try {
    await AsyncStorage.removeItem(LOG_KEY);
  } catch (_) {}
}
