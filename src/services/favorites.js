/**
 * favorites.js — Gestione città preferite via AsyncStorage.
 *
 * Ogni preferita è: { name, region, country, countryCode, lat, lon }
 * Stesso formato usato da recentCities e selectedCity nel WeatherContext.
 *
 * API esportata:
 *   loadFavorites()           → Promise<City[]>
 *   addFavorite(city)         → Promise<City[]>  — aggiunge in testa, dedup per lat/lon
 *   removeFavorite(city)      → Promise<City[]>  — rimuove per lat/lon
 *   isFavorite(city, list)    → boolean          — check sincrono (lista già caricata)
 *   toggleFavorite(city, list)→ Promise<City[]>  — aggiunge o rimuove
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'favoriteCities_v1';
const MAX_FAVORITES = 20;

// Chiave di confronto: usa lat/lon arrotondati a 4 decimali per evitare
// differenze minime di coordinate per la stessa città.
function cityKey(city) {
  if (!city) return '';
  return `${parseFloat(city.lat).toFixed(4)}_${parseFloat(city.lon).toFixed(4)}`;
}

export async function loadFavorites() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return [];
}

export async function addFavorite(city) {
  try {
    const list = await loadFavorites();
    const key = cityKey(city);
    const filtered = list.filter(c => cityKey(c) !== key);
    const next = [city, ...filtered].slice(0, MAX_FAVORITES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch (_) {
    return [];
  }
}

export async function removeFavorite(city) {
  try {
    const list = await loadFavorites();
    const key = cityKey(city);
    const next = list.filter(c => cityKey(c) !== key);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch (_) {
    return [];
  }
}

export function isFavorite(city, list) {
  if (!city || !list) return false;
  const key = cityKey(city);
  return list.some(c => cityKey(c) === key);
}

export async function toggleFavorite(city, list) {
  if (isFavorite(city, list)) {
    return removeFavorite(city);
  }
  return addFavorite(city);
}
