/**
 * weatherAggregator.js
 *
 * Funzioni pure di aggregazione dei dati meteo multi-provider.
 * Nessuna dipendenza da React, state, context o closure UI.
 *
 * INVARIANTE — vedi CLAUDE.md "Regole intoccabili":
 * Il valore mostrato in qualsiasi area dell'app DEVE essere la media
 * dei provider disponibili per quel giorno/ora specifico.
 */

// ─── UTILITY PURE ────────────────────────────────────────────────────────────

/** Media aritmetica escludendo null/NaN */
export const aggAvg = arr => {
  const v = arr.filter(x => x != null && !isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

/**
 * FIX 2026-07-03 — conta i provider "core" attivi nella risposta backend
 * (stessa lista di 8 chiavi usata da buildAggregateHourly/Days e dal backend
 * in HEALTH_PROVIDER_KEYS — marine escluso, non fa parte del conteggio
 * salute). Usato da ProviderStatusBanner per l'avviso "servizio ridotto".
 */
export const getActiveProviderCount = (w) => {
  if (!w) return null;
  return [
    w.openMeteo, w.openWeather, w.weatherApi, w.metNorway,
    w.brightsky, w.visualCrossing, w.sevenTimer, w.tomorrowIo,
  ].filter(Boolean).length;
};

/** Valore più frequente (moda) su array di stringhe */
export const aggMajority = arr => {
  const v = arr.filter(Boolean);
  if (!v.length) return null;
  const freq = {};
  v.forEach(x => { freq[x] = (freq[x] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
};

/**
 * Vota icona+descrizione INSIEME come coppia, così l'icona mostrata
 * corrisponde sempre alla descrizione testuale e non a quella di un altro
 * provider/slot (es. "Sereno" con icona nuvola).
 */
export const aggMajorityPair = items => {
  const v = items.filter(x => x?.icon && x?.description);
  if (!v.length) return null;
  // Le descrizioni contengono spazi (es. "clear sky"): non si puo'
  // ricostruire la coppia da una stringa concatenata, quindi la coppia
  // originale viene conservata insieme al conteggio per ogni chiave.
  const freq = new Map();
  v.forEach(x => {
    const key = x.icon + '' + x.description;
    const entry = freq.get(key);
    if (entry) entry.count += 1;
    else freq.set(key, { count: 1, pair: { icon: x.icon, description: x.description } });
  });
  let best = null;
  freq.forEach(entry => { if (!best || entry.count > best.count) best = entry; });
  return best.pair;
};

/**
 * FIX 2026-07-02 — bug fuso orario nel matching multi-provider (vedi
 * MEMORIA_METEO_PROGETTO.md, sessione "Diagnosi bug fuso orario").
 *
 * I provider restituiscono l'orario in due formati incompatibili:
 * - LOCALE (Europe/Rome ecc.), stringa "naive" senza offset: Open-Meteo,
 *   WeatherAPI.com, Visual Crossing (es. "2026-07-02T16:00")
 * - UTC, con "Z" o offset esplicito: OpenWeatherMap, MET Norway, Brightsky,
 *   7Timer, Tomorrow.io (es. "2026-07-02T14:00:00Z")
 *
 * Prima del fix, hourKey() tagliava solo la stringa: per un'ora reale
 * identica, i due gruppi producevano chiavi diverse (scarto pari
 * all'offset UTC della città, es. ~2h con l'ora legale) — quindi la media
 * oraria accoppiava per errore ore reali diverse tra i due gruppi.
 *
 * `toUtcEpoch` converte qualsiasi formato in un istante UTC reale usando
 * `utcOffsetSeconds` (fornito da Open-Meteo nella risposta backend, campo
 * `utcOffsetSeconds` — vedi server.js). Le stringhe con offset esplicito
 * si parsano correttamente da sole; quelle "naive" vengono trattate come
 * UTC dal parser e poi ricorrette sottraendo l'offset locale.
 */
const HAS_TZ_INFO = /Z$|[+-]\d{2}:?\d{2}$/;
export const toUtcEpoch = (t, utcOffsetSeconds = 0) => {
  const norm = t.replace(' ', 'T');
  if (HAS_TZ_INFO.test(norm)) return new Date(norm).getTime();
  return new Date(norm + 'Z').getTime() - utcOffsetSeconds * 1000;
};

/** Chiave oraria canonica "YYYY-MM-DDTHH" nell'orario LOCALE della città,
 * indipendente dal formato con cui il provider ha restituito il timestamp
 * (vedi commento sopra su `toUtcEpoch`). */
export const hourKey = (t, utcOffsetSeconds = 0) => {
  const epoch = toUtcEpoch(t, utcOffsetSeconds);
  return new Date(epoch + utcOffsetSeconds * 1000).toISOString().slice(0, 13);
};

/** Normalizza valori che alcuni provider mandano come frazione 0-1 invece di 0-100 */
export const pct = v => { if (v == null || isNaN(v)) return null; return (v > 0 && v <= 1) ? v * 100 : v; };

/** Estrae la data "YYYY-MM-DD" da un timestamp ISO o spazio-separato */
export function getDateStr(t) { return t.replace('T', ' ').slice(0, 10); }

/** Estrae l'ora (0-23) da un timestamp ISO o spazio-separato */
export function getHour(t) { return parseInt(t.replace('T', ' ').slice(11, 13), 10); }

// ─── AGGREGATORI PRINCIPALI ───────────────────────────────────────────────────

/**
 * INVARIANTE — vedi CLAUDE.md "Regole intoccabili"
 * Media oraria: solo provider che hanno dati per quell'ora specifica
 * (filter(Boolean) sulla mappa ora→slot)
 */
export const buildAggregateHourly = (w) => {
  const allHourlyProviders = [
    w.openMeteo, w.openWeather, w.weatherApi, w.metNorway,
    w.brightsky, w.visualCrossing, w.sevenTimer, w.tomorrowIo,
  ].filter(p => p?.hourly?.length);
  if (!allHourlyProviders.length) return [];
  // Offset UTC della città (secondi), fornito da Open-Meteo — vedi commento
  // su toUtcEpoch/hourKey. Se Open-Meteo non è disponibile per questa
  // richiesta usiamo 0 (stesso comportamento pre-fix, nessuna regressione:
  // caso raro, Open-Meteo ha già 3 retry sul backend).
  const offsetSec = w.utcOffsetSeconds ?? 0;
  // Base: preferiamo Open-Meteo (copertura fino a 16 giorni). Se non disponibile
  // (es. provider temporaneamente offline), usiamo il provider con più ore
  // disponibili così "Previsioni orarie" non resta vuota.
  const base = w.openMeteo?.hourly?.length
    ? w.openMeteo.hourly
    : allHourlyProviders.reduce((longest, p) => p.hourly.length > longest.hourly.length ? p : longest, allHourlyProviders[0]).hourly;
  // Mappa ora→slot per ogni provider secondario (tutti tranne quello usato come base)
  const otherMaps = allHourlyProviders
    .filter(p => p.hourly !== base)
    .map(p => {
      const m = {};
      p.hourly.forEach(h => { m[hourKey(h.time, offsetSec)] = h; });
      return m;
    });
  // I mm di pioggia orari sono esposti come `precipitation` da MET Norway/Brightsky
  // (gli altri provider non forniscono mm orari, solo probabilità `precipProb`).
  // Prima si cercava un campo `precipMm` che non esiste mai in nessun provider,
  // quindi i mm orari risultavano sempre assenti.
  const precipMmOf = s => (s.precipitation != null ? s.precipitation : (s.precipMm != null ? s.precipMm : null));
  return base.map(slot => {
    const key = hourKey(slot.time, offsetSec);
    const others = otherMaps.map(m => m[key]).filter(Boolean);
    const all = [slot, ...others];
    // INVARIANTE — vedi CLAUDE.md "Regole intoccabili": media solo sui provider
    // che hanno un dato di mm per quest'ora specifica (filtrati prima).
    const precipMmVals = all.map(precipMmOf).filter(v => v != null);
    const precipMm = precipMmVals.length ? aggAvg(precipMmVals) : null;
    if (!others.length) return { ...slot, precipMm };
    return {
      ...slot,
      temp:       aggAvg(all.map(s => s.temp))            ?? slot.temp,
      humidity:   aggAvg(all.map(s => pct(s.humidity)))   ?? slot.humidity,
      precipProb: aggAvg(all.map(s => pct(s.precipProb))) ?? slot.precipProb,
      precipMm,
      windspeed:  aggAvg(all.map(s => s.windspeed))       ?? slot.windspeed,
      // INVARIANTE — vedi CLAUDE.md "Regole intoccabili": icona e descrizione
      // vengono votate INSIEME come coppia (stesso provider/slot), così non
      // si presentano combinazioni incoerenti (es. "Sereno" con icona nuvola).
      ...(aggMajorityPair(all.map(s => ({ icon: s.icon, description: s.description }))) || { icon: slot.icon, description: slot.description }),
    };
  });
};

/**
 * INVARIANTE — vedi CLAUDE.md "Regole intoccabili"
 * Media giornaliera: dayProviders = providers.filter(p => p?.daily?.[i])
 * esclude chi non ha il giorno i.
 * providerCount deve essere sempre calcolato e passato al renderer.
 */
export const buildAggregateDays = (w) => {
  const providers = [
    w.openMeteo, w.openWeather, w.weatherApi, w.metNorway,
    w.brightsky, w.visualCrossing, w.sevenTimer, w.tomorrowIo,
  ].filter(p => p?.daily?.length);
  if (!providers.length) return w.openMeteo?.daily || [];
  const base = w.openMeteo?.daily || providers[0].daily;
  // Vedi commento su toUtcEpoch/hourKey in cima al file: serve per riportare
  // all'orario/giorno locale corretto anche i provider che restituiscono UTC.
  const offsetSec = w.utcOffsetSeconds ?? 0;

  // COERENZA temp (richiesta utente): max/min del giorno derivati dalla STESSA
  // serie oraria aggregata mostrata nelle card (media dei provider ora per ora,
  // stessa granularità di 2 ore). Così la max e la min mostrate nella card del
  // giorno compaiono SEMPRE in almeno una card oraria, e provengono dallo stesso
  // tipo di calcolo (media) della temperatura oraria — non dalla media dei
  // max/min giornalieri dichiarati dai provider (calcolo diverso).
  const aggHourly = buildAggregateHourly(w);
  const hourlyByDate = {};
  aggHourly.forEach(h => {
    if (h?.temp == null || isNaN(h.temp)) return;
    if (getHour(h.time) % 2 !== 0) return; // stessa granularità delle card (ogni 2 ore)
    const d = getDateStr(h.time);
    (hourlyByDate[d] = hourlyByDate[d] || []).push(h);
  });

  // FIX 2026-07-21 — richiesta utente: la probabilità di pioggia della card
  // GIORNALIERA si intende "su tutta la giornata", con lo STESSO metodo delle
  // card fascia (max sull'arco): MAX delle probabilità orarie aggregate del
  // giorno. Così il giorno è sempre >= di ogni sua fascia (coerenza) e ogni
  // ora resta la media dei provider con dato per quell'ora (INVARIANTE
  // media+filtro). Fallback alla media dei valori giornalieri dei provider
  // (precipVals sotto) quando un giorno non ha copertura oraria (giorni lontani).
  // Stessa granularità di 2 ore delle card (come tempMax/tempMin sopra): così
  // il MAX giornaliero coincide sempre con una card oraria/fascia visibile e non
  // con un'ora dispari nascosta.
  const precipProbByDate = {};
  aggHourly.forEach(h => {
    if (h?.precipProb == null || isNaN(h.precipProb)) return;
    if (getHour(h.time) % 2 !== 0) return;
    const d = getDateStr(h.time);
    (precipProbByDate[d] = precipProbByDate[d] || []).push(h.precipProb);
  });

  // Icona e descrizione prevalente dalle ore di luce su tutti i provider con hourly
  const allHourly = [
    w.openMeteo, w.openWeather, w.weatherApi, w.metNorway,
    w.brightsky, w.visualCrossing, w.sevenTimer, w.tomorrowIo,
  ].filter(p => p?.hourly?.length).flatMap(p => p.hourly);

  // Icona+descrizione prevalenti come COPPIA (stesso slot orario), così
  // l'icona corrisponde sempre al testo della previsione mostrata.
  const prevalentPairForDate = (date) => {
    const items = allHourly.filter(h => {
      // FIX 2026-07-02: prima si tagliava la stringa grezza (mix di orari
      // locali e UTC tra provider, vedi commento su toUtcEpoch/hourKey),
      // qui si usa la chiave oraria canonica per leggere data/ora reali.
      const key  = hourKey(h.time, offsetSec); // "YYYY-MM-DDTHH" locale
      const hDate = key.slice(0, 10);
      const hr    = parseInt(key.slice(11, 13), 10);
      return hDate === date && hr >= 6 && hr < 20;
    }).map(h => ({ icon: h.icon, description: h.description }));
    return aggMajorityPair(items);
  };

  return base.map((day, i) => {
    const dayProviders = providers.filter(p => p?.daily?.[i]);
    const maxVals   = dayProviders.map(p => p.daily[i].tempMax).filter(v => v != null);
    const minVals   = dayProviders.map(p => p.daily[i].tempMin).filter(v => v != null);
    const precipVals = dayProviders.map(p => p.daily[i].precipProbability).filter(v => v != null);
    // INVARIANTE — vedi CLAUDE.md "Regole intoccabili": anche i mm di pioggia
    // devono essere la media dei provider che hanno il dato per quel giorno
    // (prima venivano presi solo da `base`, violando la regola).
    const precipMmVals = dayProviders.map(p => p.daily[i].precipitation).filter(v => v != null);
    // INVARIANTE — vedi CLAUDE.md "Regole intoccabili": UV aggregato come media
    const uvVals = dayProviders.map(p => p.daily[i].uvIndex).filter(v => v != null);
    // INVARIANTE — vedi CLAUDE.md "Regole intoccabili": icona e descrizione
    // vengono votate INSIEME come coppia (stesso provider/slot orario), mai
    // separatamente — altrimenti l'icona "vincente" può appartenere a un
    // provider diverso da quello della descrizione "vincente" e mostrare
    // combinazioni incoerenti (es. testo "Sereno" con icona nuvola).
    const pair = i === 0
      ? (aggMajorityPair(providers.map(p => ({ icon: p.current?.icon, description: p.current?.description })))
          || prevalentPairForDate(day.date)
          || { icon: day.icon, description: day.description })
      : (prevalentPairForDate(day.date)
          || aggMajorityPair(dayProviders.map(p => ({ icon: p.daily[i].icon, description: p.daily[i].description })))
          || { icon: day.icon, description: day.description });
    // Ore aggregate di questo giorno (per oggi, i===0, solo ore future come le
    // card). Se disponibili, max/min derivano da queste (così compaiono nelle
    // card orarie); altrimenti fallback alla media dei max/min giornalieri.
    const dayHours = hourlyByDate[day.date] || [];
    // INVARIANTE COERENZA: tempMax/tempMin usano TUTTE le ore del giorno (passate
    // + future), così il massimo non è mai inferiore alla temperatura attuale
    // mostrata in card (che può essere il picco già raggiunto stamattina).
    // Per i===0 aggiungiamo anche consensus.temperature come candidato floor,
    // eliminando la discrepanza "banner 35° / card 36°" quando il picco è già
    // passato ma la temperatura attuale supera le previsioni rimanenti.
    const allDayTemps = dayHours.map(h => h.temp).filter(v => v != null && !isNaN(v));
    if (i === 0 && w.consensus?.temperature != null) allDayTemps.push(w.consensus.temperature);
    const tempMaxVal = allDayTemps.length ? Math.round(Math.max(...allDayTemps)) : Math.round(aggAvg(maxVals) ?? day.tempMax);
    const tempMinVal = allDayTemps.length ? Math.round(Math.min(...allDayTemps)) : Math.round(aggAvg(minVals) ?? day.tempMin);
    return {
      ...day,
      tempMax: tempMaxVal,
      tempMin: tempMinVal,
      precipProbability: (precipProbByDate[day.date]?.length
        ? Math.round(Math.max(...precipProbByDate[day.date]))
        : Math.round(aggAvg(precipVals) ?? day.precipProbability)),
      precipitation: precipMmVals.length ? aggAvg(precipMmVals) : (day.precipitation ?? null),
      uvIndex: uvVals.length ? Math.round(aggAvg(uvVals) * 10) / 10 : (day.uvIndex ?? null),
      icon: pair.icon,
      description: pair.description,
      providerCount: dayProviders.length,
    };
  });
};

/**
 * "Il tempo di domani" (bottone home) — sintesi discorsiva breve generata con
 * TEMPLATE A REGOLE dai valori GIÀ calcolati da buildAggregateDays/buildAggregateHourly
 * (indice 1 = "Domani"). Nessuna nuova aggregazione backend, nessuna chiamata a
 * un modello linguistico: stessa media+contatore dell'INVARIANTE §7.1
 * (CLAUDE.md), solo trascritta in prosa invece che in numeri separati.
 * Linguaggio fisso e controllato per restare conforme alla REGOLA ANTI-CLAIM
 * §7.2: mai un tono assertivo tipo "domani pioverà", sempre "probabilità
 * secondo la media di N fonti" — non deve mai sembrare una previsione
 * elaborata da meteorologi né un bollettino ufficiale.
 * NOTA: qui vengono citati solo campi che sono GENUINAMENTE media multi-provider
 * (temp/pioggia da buildAggregateDays, fascia+umidità da buildAggregateHourly,
 * UV da uvVals aggAvg, confronto oggi/dopodomani da tempMax/precipProbability
 * degli stessi giorni aggregati). Volutamente NON include vento/alba-tramonto:
 * quei campi in buildAggregateDays provengono da un solo provider (Open-Meteo,
 * vedi spread `...day`), quindi citarli qui violerebbe l'invariante media+contatore.
 * Ritorna `null` se non ci sono ancora dati per il giorno "Domani".
 */
export const buildTomorrowNarrative = (aggregateDays, aggregateHourly, locationLabel) => {
  const today = aggregateDays?.[0]; // 0 = Oggi
  const day = aggregateDays?.[1];   // 1 = Domani
  const dayAfter = aggregateDays?.[2]; // 2 = Dopodomani
  if (!day) return null;

  const place = locationLabel ? ` a ${locationLabel}` : '';
  const tempMax = day.tempMax != null && !isNaN(day.tempMax) ? Math.round(day.tempMax) : null;
  const tempMin = day.tempMin != null && !isNaN(day.tempMin) ? Math.round(day.tempMin) : null;
  const rainProb = day.precipProbability != null && !isNaN(day.precipProbability) ? Math.round(day.precipProbability) : null;
  const rainMm = day.precipitation;
  const sources = day.providerCount ?? null;

  const skyPart = day.description ? `${day.description}. ` : '';

  let tempPart = '';
  if (tempMax != null && tempMin != null) {
    tempPart = `Temperature tra ${tempMin}° e ${tempMax}°. `;
  }

  let rainPart = '';
  if (rainProb != null) {
    const mmSuffix = (rainMm != null && rainMm >= 0.05) ? `, circa ${rainMm.toFixed(1)}mm` : '';
    if (rainProb >= 60) rainPart = `Probabilità di pioggia alta (${rainProb}%)${mmSuffix}. `;
    else if (rainProb >= 30) rainPart = `Probabilità di pioggia moderata (${rainProb}%)${mmSuffix}. `;
    else rainPart = `Probabilità di pioggia bassa (${rainProb}%). `;
  }

  // Dettaglio Mattina/Pomeriggio/Sera — stessi bucket orari già usati per le
  // card fascia in HomeScreen.js (vedi fasciaOf/FASCIA_ORDER), nessun nuovo
  // calcolo backend: per ogni fascia si rilegge lo stesso `aggregateHourly`
  // già mostrato nelle card orarie. Ogni campo resta una vera media/voto
  // multi-provider (temp/umidità: aggAvg per ora, poi media delle ore della
  // fascia; pioggia: MAX delle ore, stesso metodo delle card fascia esistenti;
  // descrizione: aggMajorityPair sulle ore della fascia — stesso meccanismo
  // di voto icona+testo già usato altrove, mai da una singola ora/provider).
  let fasciaLines = '';
  if (Array.isArray(aggregateHourly) && aggregateHourly.length) {
    const fasciaOf = (hr) => (hr < 6 ? 'Notte' : hr < 12 ? 'Mattina' : hr < 18 ? 'Pomeriggio' : 'Sera');
    const byFascia = { Mattina: [], Pomeriggio: [], Sera: [] };
    aggregateHourly.forEach(h => {
      if (h?.time == null || getDateStr(h.time) !== day.date) return;
      const f = fasciaOf(getHour(h.time));
      if (byFascia[f]) byFascia[f].push(h);
    });
    const rows = ['Mattina', 'Pomeriggio', 'Sera']
      .map(f => {
        const hours = byFascia[f];
        if (!hours.length) return null;
        const temps = hours.map(h => h.temp).filter(v => v != null && !isNaN(v));
        const rains = hours.map(h => h.precipProb).filter(v => v != null && !isNaN(v));
        const humids = hours.map(h => h.humidity).filter(v => v != null && !isNaN(v));
        const pair = aggMajorityPair(hours.map(h => ({ icon: h.icon, description: h.description })));
        const tempAvg = temps.length ? Math.round(aggAvg(temps)) : null;
        const rainMax = rains.length ? Math.round(Math.max(...rains)) : null;
        const humidAvg = humids.length ? Math.round(aggAvg(humids)) : null;
        const descText = (pair?.description || day.description || '').toLowerCase();
        const parts = [descText].filter(Boolean);
        if (tempAvg != null) parts.push(`~${tempAvg}°`);
        if (rainMax != null) parts.push(`pioggia ${rainMax}%`);
        if (humidAvg != null) parts.push(`umidità ${humidAvg}%`);
        return parts.length ? `${f}: ${parts.join(', ')}.` : null;
      })
      .filter(Boolean);
    if (rows.length) fasciaLines = `\n${rows.join('\n')}\n`;
  }

  // Confronto con oggi e tendenza per dopodomani — stessi campi tempMax/
  // precipProbability già aggregati da buildAggregateDays per quei giorni,
  // nessun nuovo calcolo. Utile per dare contesto oltre al singolo giorno.
  let trendPart = '';
  if (today?.tempMax != null && tempMax != null) {
    const diff = Math.round(tempMax - today.tempMax);
    trendPart += Math.abs(diff) >= 2
      ? `Rispetto a oggi (max ${Math.round(today.tempMax)}°), domani sarà ${diff > 0 ? `più caldo di circa ${diff}°` : `più fresco di circa ${Math.abs(diff)}°`}. `
      : `Temperature simili a oggi (max ${Math.round(today.tempMax)}°). `;
  }
  if (dayAfter?.tempMax != null && !isNaN(dayAfter.tempMax)) {
    const dayAfterMax = Math.round(dayAfter.tempMax);
    const rainDiff = (dayAfter.precipProbability ?? 0) - (rainProb ?? 0);
    const outlook = rainDiff >= 20 ? 'tempo in peggioramento (più pioggia)'
      : rainDiff <= -20 ? 'tempo in miglioramento'
      : 'condizioni stabili';
    trendPart += `Dopodomani: ${outlook}, massima ${dayAfterMax}°.`;
  }
  trendPart = trendPart.trim();

  // UV: day.uvIndex è una vera media multi-provider (uvVals in buildAggregateDays),
  // non un dato a fonte singola — quindi citabile senza violare l'invariante.
  // Scala WHO/EPA standard, pubblica: 0-2 basso, 3-5 moderato, 6-7 alto,
  // 8-10 molto alto, 11+ estremo. Mostrato solo da moderato in su (il basso
  // non è un'informazione utile da segnalare).
  let uvPart = '';
  if (day.uvIndex != null && !isNaN(day.uvIndex) && day.uvIndex >= 3) {
    const uvLabel = day.uvIndex >= 11 ? 'estremo' : day.uvIndex >= 8 ? 'molto alto' : day.uvIndex >= 6 ? 'alto' : 'moderato';
    uvPart = `Indice UV ${uvLabel} (${day.uvIndex}). `;
  }

  const sourcesPart = sources != null
    ? `Valori calcolati come media di ${sources} ${sources > 1 ? 'fonti' : 'fonte'} meteo di terze parti.`
    : '';

  // Attenzione: si collassano solo gli spazi multipli (/ +/g), MAI i newline
  // (/\s+/g li avrebbe distrutti) — servono per separare intro, fascia e
  // chiusura su righe distinte nel popup.
  const introPart = `${skyPart}${tempPart}${rainPart}`.replace(/ +/g, ' ').trim();
  const closingPart = `${uvPart}${sourcesPart}`.replace(/ +/g, ' ').trim();
  return [`Domani${place}: ${introPart}`, fasciaLines.trim(), trendPart, closingPart].filter(Boolean).join('\n\n');
};

/**
 * Compone i dati aggregati completi (current + hourly + daily).
 * `current` viene dal consensus calcolato dal backend.
 */
export const buildAggregateData = (w) => ({
  current: w.consensus ? {
    temperature: w.consensus.temperature,
    feelsLike:   w.consensus.feelsLike,
    humidity:    w.consensus.humidity,
    windspeed:   w.consensus.windspeed,
    description: w.consensus.description,
    icon:        w.consensus.icon || 'weather-partly-cloudy',
  } : null,
  hourly: buildAggregateHourly(w),
  daily:  buildAggregateDays(w),
});
