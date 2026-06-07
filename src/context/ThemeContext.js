import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'app_theme_v2'; // v2 = reset preferenza salvata, default dark

export const ThemeContext = createContext({
  dark: true,
  toggleTheme: () => {},
  colors: {},
});

export const DARK_COLORS = {
  bg:         '#0f172a',
  bgSecond:   '#1e293b',
  bgCard:     'rgba(255,255,255,0.07)',
  border:     'rgba(255,255,255,0.25)',
  text:       '#ffffff',
  textSub:    '#f1f5f9',
  textMuted:  '#ffffff',
  accent:     '#38bdf8',
  // gradiente sfondo animato (3 colori che ciclano)
  grad: [
    ['#0c1f3f', '#071628', '#0f2952'],
    ['#071628', '#0a2244', '#051220'],
    ['#0f2952', '#0c1f3f', '#071628'],
  ],
};

export const LIGHT_COLORS = {
  bg:         '#c0e4fc',
  bgSecond:   '#f0faff',
  bgCard:     'rgba(255,255,255,0.04)',
  border:     'rgba(56,189,248,0.45)',
  text:       '#0260a8',
  textSub:    '#0260a8',
  textMuted:  '#0369a1',
  accent:     '#0260a8',
  grad: [
    ['#f0faff', '#c8e8fc', '#78c8f0'],
    ['#eaf8ff', '#b8e4f8', '#60b8e8'],
    ['#e8f6ff', '#b8e0f8', '#68b8e8'],
  ],
};

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then(v => {
      if (v !== null) setDark(v === 'dark');
    });
  }, []);

  const toggleTheme = () => {
    setDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
      return next;
    });
  };

  const colors = dark ? DARK_COLORS : LIGHT_COLORS;
  return (
    <ThemeContext.Provider value={{ dark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
