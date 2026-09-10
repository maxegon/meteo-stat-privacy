/**
 * WeatherContext — stato globale condiviso tra le schermate.
 *
 * Espone:
 *   selectedCity      — città attiva { name, region, country, lat, lon }
 *   setSelectedCity   — setter diretto (uso interno: preferire setWeatherData)
 *   weatherData       — risposta raw dal backend (oggetto completo)
 *   nowcast           — ultimo esito del radar RainViewer ({ isRainingNow, intensity, … })
 *   setNowcast        — setter (HomeScreen lo aggiorna con la propria cadenza)
 *   aggregateHourly   — output di buildAggregateHourly(weatherData), pre-calcolato
 *   aggregateDays     — output di buildAggregateDays(weatherData), pre-calcolato
 *   lastUpdated       — Date dell'ultimo fetch completato (o null)
 *   isLoading         — true durante il fetch
 *   isPartial         — true se l'ultima risposta era parziale (campo partial:true)
 *   setWeatherData(data, city) — aggiorna weatherData, selectedCity, lastUpdated
 *                               e ricalcola gli aggregati in un'unica operazione.
 *   setIsLoading      — setter per isLoading (usato da HomeScreen)
 *   setIsPartial      — setter per isPartial (usato da HomeScreen)
 *
 * StatsScreen (e altre schermate) leggono aggregateHourly/aggregateDays dal
 * context senza dover re-fetchare indipendentemente.
 */
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  buildAggregateHourly,
  buildAggregateDays,
} from '../services/weatherAggregator';

const WeatherContext = createContext(null);

export function WeatherProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(null);
  // { name, region, country, lat, lon }

  const [weatherData, setWeatherDataRaw] = useState(null);
  // FIX 2026-09-10 — il nowcast radar viveva solo dentro HomeScreen, quindi la
  // serie oraria (calcolata qui) non poteva tenerne conto e l'ora corrente
  // divergeva dalla card. Ora sta nel context: card e previsioni orarie
  // leggono lo stesso segnale. Vedi resolveNowCondition in weatherAggregator.
  const [nowcast, setNowcast]             = useState(null);
  const [lastUpdated, setLastUpdated]     = useState(null);
  const [isLoading, setIsLoading]         = useState(false);
  const [isPartial, setIsPartial]         = useState(false);

  // Aggregati pre-calcolati — ricalcolati solo quando weatherData cambia.
  // Vengono esposti direttamente così i consumer non devono chiamare
  // buildAggregateHourly/buildAggregateDays per conto proprio.
  const aggregateHourly = useMemo(
    () => (weatherData ? buildAggregateHourly(weatherData, nowcast) : []),
    [weatherData, nowcast],
  );
  const aggregateDays = useMemo(
    () => (weatherData ? buildAggregateDays(weatherData) : []),
    [weatherData],
  );

  /**
   * Setter principale: aggiorna weatherData, selectedCity e lastUpdated
   * in un'unica operazione. Gli aggregati vengono ricalcolati automaticamente
   * tramite useMemo.
   *
   * @param {object} data — risposta raw del backend
   * @param {object} [city] — oggetto città; se omesso, selectedCity resta invariata
   */
  const setWeatherData = useCallback((data, city) => {
    setWeatherDataRaw(data);
    setLastUpdated(new Date());
    if (city !== undefined) setSelectedCity(city);
  }, []);

  const value = {
    // Città
    selectedCity,
    setSelectedCity,

    // Dati meteo raw
    weatherData,
    setWeatherData,

    // Nowcast radar (RainViewer)
    nowcast,
    setNowcast,

    // Aggregati pre-calcolati
    aggregateHourly,
    aggregateDays,

    // Metadati fetch
    lastUpdated,
    isLoading,
    setIsLoading,
    isPartial,
    setIsPartial,
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  return useContext(WeatherContext);
}
