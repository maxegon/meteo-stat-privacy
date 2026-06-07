/**
 * WeatherContext — stato globale condiviso tra le schermate.
 * Permette a StatsScreen di sapere quale città è selezionata in HomeScreen.
 */
import React, { createContext, useContext, useState } from 'react';

const WeatherContext = createContext(null);

export function WeatherProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(null);
  // { name, region, country, lat, lon }

  return (
    <WeatherContext.Provider value={{ selectedCity, setSelectedCity }}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  return useContext(WeatherContext);
}
