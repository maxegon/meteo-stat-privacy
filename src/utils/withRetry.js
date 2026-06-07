/**
 * Esegue fn con retry automatico + exponential backoff.
 *
 * @param {() => Promise<any>} fn        - funzione asincrona da eseguire
 * @param {number}             maxTries  - tentativi massimi (default 3)
 * @param {number}             baseDelay - ritardo iniziale in ms (default 1000)
 * @returns {Promise<any>}               - risultato di fn o lancia l'ultimo errore
 *
 * Backoff: 1s → 2s → 4s (base * 2^tentativo)
 */
export async function withRetry(fn, maxTries = 3, baseDelay = 1000) {
  let lastError;
  for (let attempt = 0; attempt < maxTries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxTries - 1) {
        await sleep(baseDelay * Math.pow(2, attempt));
      }
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
