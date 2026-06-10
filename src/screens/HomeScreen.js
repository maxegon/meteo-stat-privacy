import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Linking, Modal, useWindowDimensions, AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchAll, searchCity } from '../services/aggregator';
import WeatherCard from '../components/WeatherCard';
import ProviderBadge from '../components/ProviderBadge';
import WeatherIcon from '../components/WeatherIcon';
import ForecastModal from '../components/ForecastModal';
import AnimatedGradientBg from '../components/AnimatedGradientBg';
import { PROVIDERS } from '../services/providers';

import { useWeather } from '../context/WeatherContext';
import { useTheme } from '../context/ThemeContext';
import { getIconColor } from '../utils/weatherIconColor';
import { windDirArrow, windDirLabel } from '../utils/windDir';
import { translateDescription } from '../utils/weatherDescriptions';
import { isCoastal } from '../utils/isCoastal';

// Scala di Douglas (WMO) basata su velocità del vento — restituisce { label, note }
function seaStateFromWind(kmh) {
  if (kmh == null || isNaN(kmh)) return null;
  if (kmh <  2) return { label: 'Calmo',              note: 'mare a specchio' };
  if (kmh <  6) return { label: 'Quasi calmo',        note: 'onde ~0.1 m' };
  if (kmh < 12) return { label: 'Poco increspato',    note: 'onde ~0.2 m' };
  if (kmh < 20) return { label: 'Leggermente mosso',  note: 'onde ~0.5 m' };
  if (kmh < 29) return { label: 'Mosso',              note: 'onde ~1 m' };
  if (kmh < 39) return { label: 'Molto mosso',        note: 'onde ~2 m' };
  if (kmh < 50) return { label: 'Agitato',            note: 'onde ~3.5 m' };
  if (kmh < 62) return { label: 'Molto agitato',      note: 'onde ~5 m' };
  if (kmh < 75) return { label: 'Grosso',             note: 'onde ~7 m' };
  if (kmh < 89) return { label: 'Molto grosso',       note: 'onde ~10 m' };
  return           { label: 'Tempestoso',             note: 'onde >14 m' };
}

const DAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS_IT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const RECENT_CITIES_KEY = 'recentCities';
const MAX_RECENT = 4;

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${DAYS_IT[d.getDay()]} ${d.getDate()} ${MONTHS_IT[d.getMonth()]}`;
}



export default function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [cityInfo, setCityInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('current');
  const [activeDay, setActiveDay] = useState(0);
  const inlineScrollRef = useRef(null);
  const inlineDayOffsetsRef = useRef([0, 0, 0]);
  const [showCompare, setShowCompare] = useState(false);
  const [recentCities, setRecentCities] = useState([]);
  const [modal, setModal] = useState(null); // { data, title, color }
  const [showBanner, setShowBanner] = useState(true);
  const [gpsBlocked, setGpsBlocked] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [tooltip, setTooltip] = useState(null); // 'provider' | 'compare' | null
  const hasAutoLoaded = useRef(false);
  const scrollRef = useRef(null);
  const cityInfoRef = useRef(null);
  const lastUpdatedRef = useRef(null);
  const { setSelectedCity } = useWeather();
  const { dark, toggleTheme, colors: c } = useTheme();
  const styles = useMemo(() => makeStyles(c, dark), [c, dark]);
  // Colori turchese e viola adattivi (più scuri nel tema chiaro)
  const TC = dark ? '#67e8f9' : '#0369a1';   // turchese → blu scuro
  const TW = dark ? '#7dd3fc' : '#0369a1';   // vento celeste → blu scuro
  const TP = dark ? '#818cf8' : '#3730a3';   // viola notte → indigo scuro

  // Costruisce dati aggregati con orario medio tra i provider
  // Utility condivise
  const aggAvg = arr => { const v = arr.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const aggMajority = arr => {
    const v = arr.filter(Boolean);
    if (!v.length) return null;
    const freq = {};
    v.forEach(x => { freq[x] = (freq[x] || 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
  };
  // Normalizza timestamp a "YYYY-MM-DDTHH" per matching tra provider
  const hourKey = t => t.replace(' ', 'T').slice(0, 13);
  // Normalizza valori che alcuni provider mandano come frazione 0-1 invece di 0-100
  const pct = v => { if (v == null || isNaN(v)) return null; return (v > 0 && v <= 1) ? v * 100 : v; };

  // Media hourly su tutti i provider disponibili per quella ora
  const buildAggregateHourly = (w) => {
    const base = w.openMeteo?.hourly || [];
    if (!base.length) return [];
    // Mappa ora→slot per ogni provider secondario
    const otherMaps = [
      w.openWeather, w.weatherApi, w.metNorway,
      w.brightsky, w.visualCrossing, w.sevenTimer, w.tomorrowIo,
    ].filter(p => p?.hourly?.length).map(p => {
      const m = {};
      p.hourly.forEach(h => { m[hourKey(h.time)] = h; });
      return m;
    });
    return base.map(slot => {
      const key = hourKey(slot.time);
      const others = otherMaps.map(m => m[key]).filter(Boolean);
      if (!others.length) return slot;
      const all = [slot, ...others];
      return {
        ...slot,
        temp:       aggAvg(all.map(s => s.temp))            ?? slot.temp,
        humidity:   aggAvg(all.map(s => pct(s.humidity)))   ?? slot.humidity,
        precipProb: aggAvg(all.map(s => pct(s.precipProb))) ?? slot.precipProb,
        precipMm:   slot.precipMm ?? null,
        windspeed:  aggAvg(all.map(s => s.windspeed))       ?? slot.windspeed,
        icon:        aggMajority(all.map(s => s.icon))        || slot.icon,
        description: aggMajority(all.map(s => s.description)) || slot.description,
      };
    });
  };

  const buildAggregateData = (w) => ({
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

  // Daily aggregato sui provider attivi, con icona prevalente dalle ore di luce
  const buildAggregateDays = (w) => {
    const providers = [
      w.openMeteo, w.openWeather, w.weatherApi, w.metNorway,
      w.brightsky, w.visualCrossing, w.sevenTimer, w.tomorrowIo,
    ].filter(p => p?.daily?.length);
    if (!providers.length) return w.openMeteo?.daily || [];
    const base = w.openMeteo?.daily || providers[0].daily;

    // Icona e descrizione prevalente dalle ore di luce su tutti i provider con hourly
    const allHourly = [
      w.openMeteo, w.openWeather, w.weatherApi, w.metNorway,
      w.brightsky, w.visualCrossing, w.sevenTimer, w.tomorrowIo,
    ].filter(p => p?.hourly?.length).flatMap(p => p.hourly);

    const prevalentForDate = (date, field) => {
      const vals = allHourly.filter(h => {
        const hDate = h.time.replace(' ', 'T').slice(0, 10);
        const hr = parseInt(h.time.replace(' ', 'T').slice(11, 13), 10);
        return hDate === date && hr >= 6 && hr < 20;
      }).map(h => h[field]).filter(Boolean);
      return aggMajority(vals);
    };

    return base.map((day, i) => {
      const dayProviders = providers.filter(p => p?.daily?.[i]);
      const maxVals   = dayProviders.map(p => p.daily[i].tempMax).filter(v => v != null);
      const minVals   = dayProviders.map(p => p.daily[i].tempMin).filter(v => v != null);
      const precipVals = dayProviders.map(p => p.daily[i].precipProbability).filter(v => v != null);
      const icon = i === 0
        ? (aggMajority(providers.map(p => p.current?.icon).filter(Boolean)) || prevalentForDate(day.date, 'icon') || day.icon)
        : (prevalentForDate(day.date, 'icon') || aggMajority(dayProviders.map(p => p.daily[i].icon).filter(Boolean)) || day.icon);
      const description = i === 0
        ? (aggMajority(providers.map(p => p.current?.description).filter(Boolean)) || day.description)
        : (prevalentForDate(day.date, 'description') || aggMajority(dayProviders.map(p => p.daily[i].description).filter(Boolean)) || day.description);
      return {
        ...day,
        tempMax: Math.round(aggAvg(maxVals) ?? day.tempMax),
        tempMin: Math.round(aggAvg(minVals) ?? day.tempMin),
        precipProbability: Math.round(aggAvg(precipVals) ?? day.precipProbability),
        icon,
        description,
        providerCount: dayProviders.length,
      };
    });
  };

  // Carica città recenti e avvia GPS al primo mount
  useEffect(() => {
    loadRecentCities();
    autoLoadGPS();
  }, []);

  // Tiene allineati i ref con lo stato corrente, da usare nei listener AppState
  useEffect(() => { cityInfoRef.current = cityInfo; }, [cityInfo]);
  useEffect(() => { lastUpdatedRef.current = lastUpdated; }, [lastUpdated]);

  // Aggiorna automaticamente i dati meteo quando l'app torna in primo piano,
  // se i dati sono più vecchi di 10 minuti (stessa durata della cache backend).
  useEffect(() => {
    const STALE_MS = 10 * 60 * 1000;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const city = cityInfoRef.current;
        const last = lastUpdatedRef.current;
        const isStale = !last || (Date.now() - last.getTime() > STALE_MS);
        if (city?.lat != null && city?.lon != null && isStale) {
          loadWeather(city.lat, city.lon);
        }
      }
    });
    return () => subscription.remove();
  }, []);

  // Torna al tab iniziale quando si preme Meteo dal menu in basso
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      setActiveTab('current');
      setActiveDay(0);
      setShowCompare(false);
      setModal(null);
      setTooltip(null);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return unsubscribe;
  }, [navigation]);

  // Helper per dati orari inline
  function getDateStr(t) { return t.replace('T', ' ').slice(0, 10); }
  function getHour(t) { return parseInt(t.replace('T', ' ').slice(11, 13), 10); }
  function fasciaOf(hr) {
    if (hr < 6) return 'Notte';
    if (hr < 12) return 'Mattina';
    if (hr < 18) return 'Pomeriggio';
    return 'Sera';
  }
  const FASCIA_ORDER = ['Notte', 'Mattina', 'Pomeriggio', 'Sera'];
  const FASCIA_COLOR = dark
    ? { Notte: '#818cf8', Mattina: '#fbbf24', Pomeriggio: '#fb923c', Sera: '#c084fc' }
    : { Notte: '#3730a3', Mattina: '#b45309', Pomeriggio: '#c2410c', Sera: '#6d28d9' };
  const FASCIA_ICON  = { Notte: 'weather-night', Mattina: 'weather-sunny', Pomeriggio: 'white-balance-sunny', Sera: 'weather-night-partly-cloudy' };

  const loadRecentCities = async () => {
    try {
      const json = await AsyncStorage.getItem(RECENT_CITIES_KEY);
      if (json) setRecentCities(JSON.parse(json));
    } catch (_) {}
  };

  const saveRecentCity = async (city) => {
    try {
      const json = await AsyncStorage.getItem(RECENT_CITIES_KEY);
      let list = json ? JSON.parse(json) : [];
      list = list.filter(c => c.name !== city.name);
      list.unshift(city);
      list = list.slice(0, MAX_RECENT);
      await AsyncStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(list));
      setRecentCities(list);
    } catch (_) {}
  };

  const autoLoadGPS = async () => {
    if (hasAutoLoaded.current) return;
    hasAutoLoaded.current = true;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { setGpsBlocked(true); return; }
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const results = await searchCity(`${latitude},${longitude}`).catch(() => []);
      let city;
      if (results.length) {
        city = results[0];
      } else {
        city = { name: 'La tua posizione', lat: latitude, lon: longitude };
      }
      setCityInfo(city);
      setSelectedCity(city);
      setQuery(city.name);
      await loadWeather(latitude, longitude);
    } catch (_) {
      setLoading(false);
    }
  };

  const handleQueryChange = useCallback(async (text) => {
    setQuery(text);
    if (text.length < 2) { setSuggestions([]); return; }
    setSearching(true);
    try {
      const results = await searchCity(text);
      setSuggestions(results);
    } catch (e) {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const selectCity = async (city) => {
    setSuggestions([]);
    setQuery(city.name);
    setCityInfo(city);
    setSelectedCity(city);
    await saveRecentCity(city);
    await loadWeather(city.lat, city.lon);
  };

  const useMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso negato', 'Attiva la posizione nelle impostazioni per usare questa funzione.');
      return;
    }
    setLoading(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      const results = await searchCity(`${latitude},${longitude}`).catch(() => []);
      let city;
      if (results.length) {
        city = results[0];
      } else {
        city = { name: 'La tua posizione', lat: latitude, lon: longitude };
      }
      setCityInfo(city);
      setSelectedCity(city);
      setQuery(city.name);
      await loadWeather(latitude, longitude);
    } catch (e) {
      Alert.alert('Errore posizione', e.message);
      setLoading(false);
    }
  };

  const loadWeather = async (lat, lon) => {
    setLoading(true);
    setSuggestions([]);
    try {
      const data = await fetchAll(lat, lon);
      setWeather(data);
      setLastUpdated(new Date());
    } catch (e) {
      Alert.alert('Errore', 'Impossibile caricare i dati meteo. Controlla la connessione.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (cityInfo?.lat != null && cityInfo?.lon != null) {
      loadWeather(cityInfo.lat, cityInfo.lon);
    }
  };

  // Pulisce il campo quando l'utente tocca per digitare
  const handleSearchFocus = () => {
    if (query && cityInfo && query === cityInfo.name) {
      setQuery('');
      setSuggestions([]);
    }
  };

  const searchBar = (
    <View style={styles.searchRow}>
      <View style={[styles.searchBox, { backgroundColor: c.bgCard, borderColor: c.border }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={c.textMuted} />
        <TextInput
          style={[styles.input, { color: c.text }]}
          placeholder="Cerca una città..."
          placeholderTextColor={c.textMuted}
          value={query}
          onChangeText={handleQueryChange}
          onFocus={handleSearchFocus}
          returnKeyType="search"
        />
        {searching && <ActivityIndicator size="small" color={c.accent} />}
      </View>
      <TouchableOpacity style={[styles.locBtn, { backgroundColor: c.bgCard, borderColor: c.border }]} onPress={useMyLocation} accessibilityLabel="Usa la mia posizione" accessibilityRole="button">
        <MaterialCommunityIcons name="crosshairs-gps" size={22} color={c.accent} />
      </TouchableOpacity>
      <TouchableOpacity style={[styles.locBtn, { backgroundColor: c.bgCard, borderColor: c.border }]} onPress={toggleTheme} accessibilityLabel="Cambia tema" accessibilityRole="button">
        <MaterialCommunityIcons name={dark ? 'weather-sunny' : 'weather-night'} size={22} color={c.accent} />
      </TouchableOpacity>
    </View>
  );

  return (
    <AnimatedGradientBg>
    <SafeAreaView style={styles.safe}>
      {/* Autocomplete — overlay assoluto, visibile sopra ScrollView */}
      {suggestions.length > 0 && (
        <View style={[styles.suggestBox, { position: 'absolute', top: 70, left: 0, right: 0, zIndex: 100 }]}>
          {suggestions.map(city => (
            <TouchableOpacity key={city.id} style={styles.suggestItem} onPress={() => selectCity(city)}>
              <MaterialCommunityIcons name="map-marker-outline" size={16} color={c.textMuted} />
              <Text style={styles.suggestText}>
                {city.name}{city.region ? `, ${city.region}` : ''} <Text style={styles.suggestCountry}>({city.countryCode})</Text>
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Stato: caricamento */}
      {loading && (
        <>
          {searchBar}
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText}>Caricamento da tutte le fonti meteo...</Text>
          </View>
        </>
      )}

      {/* Stato: nessuna città */}
      {!loading && !weather && (
        <>
          {searchBar}
          {gpsBlocked && (
            <TouchableOpacity style={styles.gpsBanner} onPress={() => Linking.openSettings()}>
              <MaterialCommunityIcons name="map-marker-off" size={18} color="#fbbf24" />
              <Text style={styles.gpsBannerText}>GPS non disponibile — tocca per attivarlo in Impostazioni</Text>
              <MaterialCommunityIcons name="chevron-right" size={16} color="#fbbf24" />
            </TouchableOpacity>
          )}
          {suggestions.length === 0 && recentCities.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.recentLabel}>Recenti</Text>
              <View style={styles.recentRow}>
                {recentCities.map((city, i) => (
                  <TouchableOpacity key={i} style={styles.recentChip} onPress={() => selectCity(city)}>
                    <MaterialCommunityIcons name="history" size={13} color={c.textMuted} />
                    <Text style={styles.recentChipText}>{city.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          <View style={styles.welcome}>
            <MaterialCommunityIcons name="weather-partly-cloudy" size={80} color="#38bdf8" />
            <Text style={styles.welcomeTitle}>Solo1Meteo</Text>
            <Text style={styles.welcomeText}>
              Dati da più fonti meteo in un'unica app.{'\n'}
              Cerca una città o usa la tua posizione.
            </Text>
            <View style={styles.providerRow}>
              {Object.values(PROVIDERS).map(p => (
                <ProviderBadge key={p.id} provider={p} size="md" />
              ))}
            </View>
          </View>
        </>
      )}

      {/* Modal Come funziona */}
      <Modal visible={showHowTo} animationType="slide" transparent onRequestClose={() => setShowHowTo(false)}>
        <View style={styles.howToOverlay}>
          <View style={styles.howToCard}>
            <View style={styles.howToHeader}>
              <Text style={styles.howToTitle}>Come funziona</Text>
              <TouchableOpacity onPress={() => setShowHowTo(false)} accessibilityLabel="Chiudi" accessibilityRole="button">
                <MaterialCommunityIcons name="close" size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            {[
              { icon: 'cloud-download-outline', color: '#38bdf8', title: 'Dati da 8 provider attivi', desc: 'L\'app chiama in parallelo fino a 8 servizi meteo indipendenti: Open-Meteo, OpenWeatherMap, WeatherAPI, MET Norway e altri.' },
              { icon: 'scale-balance', color: '#818cf8', title: 'Media e scostamento', desc: 'Viene calcolata la media tra le fonti meteo. Lo scostamento % indica quanto ogni modello si discosta: verde = accordo, giallo = lieve differenza, rosso = divergenza.' },
              { icon: 'gesture-tap', color: '#4ade80', title: 'Tocca una card', desc: 'Toccando una WeatherCard o la card Media si apre il dettaglio con previsioni orarie e giornaliere fino a 16 giorni.' },
              { icon: 'shield-check-outline', color: '#fbbf24', title: 'Quando fidarsi', desc: 'Quando i 3 modelli concordano la previsione è più affidabile. Quando divergono molto, c\'è incertezza reale — nessun modello è "giusto" in anticipo.' },
            ].map((item, i) => (
              <View key={i} style={styles.howToRow}>
                <View style={[styles.howToIconBox, { backgroundColor: item.color + '20' }]}>
                  <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={styles.howToText}>
                  <Text style={styles.howToItemTitle}>{item.title}</Text>
                  <Text style={styles.howToItemDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </Modal>

      {/* Stato: meteo caricato — searchBar scorre con il contenuto */}
      {!loading && weather && (
        <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {searchBar}
          {/* City header */}
          <View style={styles.cityHeader}>
            <View style={styles.appTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', overflow: 'visible', paddingTop: 16 }}>
                <View style={{ position: 'relative', overflow: 'visible' }}>
                  <MaterialCommunityIcons name="white-balance-sunny" size={54} color="#fbbf24" style={{ position: 'absolute', left: -16, top: -20, zIndex: 0, opacity: 0.9 }} />
                  <MaterialCommunityIcons name="cloud" size={36} color="#ffffff" style={{ position: 'absolute', left: 4, top: -16, zIndex: 1, opacity: 0.95 }} />
                  <Text style={[styles.appTitle, { zIndex: 2 }]}>S</Text>
                </View>
                <Text style={styles.appTitle}>olo1Meteo</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHowTo(true)} accessibilityLabel="Come funziona" accessibilityRole="button" style={{ position: 'absolute', right: 0 }}>
                <MaterialCommunityIcons name="information-outline" size={22} color={c.accent} />
              </TouchableOpacity>
            </View>
            <Text style={styles.appSubtitle}>Una previsione, tante fonti</Text>
            <Text style={styles.tagline} numberOfLines={1} adjustsFontSizeToFit>
              {weather
                ? `Previsioni da ${weather.consensus?.providersCount ?? 8} provider meteo ufficiali`
                : 'Previsioni da più fonti meteo ufficiali'}
            </Text>
            <Text style={styles.cityName}>
              📍 {cityInfo?.name || query}{[cityInfo?.region, cityInfo?.country].filter(Boolean).length > 0 ? `, ${[cityInfo?.region, cityInfo?.country].filter(Boolean).join(', ')}` : ''}
            </Text>
            {lastUpdated && (
              <View style={styles.updatedRow}>
                <Text style={styles.updatedText}>
                  Aggiornato alle {lastUpdated.getHours().toString().padStart(2,'0')}:{lastUpdated.getMinutes().toString().padStart(2,'0')}
                </Text>
                <TouchableOpacity onPress={handleRefresh} disabled={loading} style={styles.refreshBtn}>
                  <MaterialCommunityIcons
                    name="refresh"
                    size={16}
                    color={loading ? c.textMuted : c.accent}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>


          {/* Banner fallback: backend non raggiungibile */}
          {weather.isFallback && (
            <View style={styles.fallbackBanner}>
              <MaterialCommunityIcons name="alert-outline" size={15} color="#fbbf24" />
              <Text style={styles.fallbackBannerText}>Connessione al server limitata — mostrati 4 provider su 8</Text>
            </View>
          )}

          {/* Tab bar */}
          <View style={styles.tabs}>
            {['compare', 'forecast'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                  {tab === 'compare' ? '📊 Confronto' : '📅 + Giorni'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Vista principale: visibile quando non si è in Confronto o +Giorni */}
          {activeTab !== 'compare' && activeTab !== 'forecast' && <View>

          {/* Card consenso */}
          {weather.consensus && (
            <TouchableOpacity
              style={styles.consensusCard}
              activeOpacity={0.8}
              accessibilityLabel="Media fonti, tocca per dettagli"
              accessibilityRole="button"
              onPress={() => setModal({ data: buildAggregateData(weather), title: `Media ${weather.consensus.providersCount} fonti`, color: '#38bdf8' })}
            >
              {/* Header: Media N fonti — — — attuale · descrizione > */}
              {(() => {
                const today = buildAggregateDays(weather)[0];
                const humVals = [weather.openMeteo, weather.openWeather, weather.weatherApi, weather.metNorway, weather.brightsky, weather.visualCrossing, weather.tomorrowIo]
                  .map(p => p?.current?.humidity).filter(v => v != null && v > 0);
                const humidity = humVals.length ? Math.round(humVals.reduce((a,b) => a+b,0) / humVals.length) : null;
                const rain = today?.precipProbability ?? null;
                const rainMm = today?.precipitation ?? null;
                return (<>
                  {/* Riga 1: Media N fonti | attuale · descrizione > */}
                  <View style={styles.consensusRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.consensusLabel}>Media {weather.consensus.providersCount} fonti</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.consensusTempLabel}>attuale</Text>
                      <Text style={styles.consensusDesc} numberOfLines={1}>{translateDescription(weather.consensus.description)}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color={c.accent} />
                    </View>
                  </View>
                  {/* Riga 2: temp grande + icona | 🌧 X%  💧 Y% giustificati a destra */}
                  <View style={styles.consensusMainRow}>
                    <Text style={styles.consensusTemp}>{Math.round(weather.consensus.temperature)}°C</Text>
                    <WeatherIcon name={weather.consensus.icon || 'weather-partly-cloudy'} size={48} dark={dark} />
                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {rain != null && (
                          <Text style={styles.consensusBadge}>
                            🌧 {Math.round(rain)}%{rainMm != null && rainMm > 0 ? ` · ${rainMm.toFixed(1)}mm` : ''}
                          </Text>
                        )}
                        {humidity != null && <Text style={styles.consensusBadge}>💧 {humidity}%</Text>}
                      </View>
                    </View>
                  </View>
                </>);
              })()}
              {/* Riga dati orizzontale */}
              {(() => {
                const today = buildAggregateDays(weather)[0];
                return (
                  <View style={styles.consensusDataRow}>
                    {weather.consensus.feelsLike != null && (
                      <View style={styles.consensusDataItem}>
                        <Text style={styles.consensusDataLabel} numberOfLines={1} adjustsFontSizeToFit>Percepita</Text>
                        <Text style={styles.consensusDataVal}>{Math.round(weather.consensus.feelsLike)}°</Text>
                      </View>
                    )}
                    {today && <>
                      <View style={styles.consensusDataItem}>
                        <Text style={styles.consensusDataLabel}>Max</Text>
                        <Text style={[styles.consensusDataVal, { color: '#fb923c' }]}>{Math.round(today.tempMax)}°</Text>
                      </View>
                      <View style={styles.consensusDataItem}>
                        <Text style={styles.consensusDataLabel}>Min</Text>
                        <Text style={[styles.consensusDataVal, { color: TW }]}>{Math.round(today.tempMin)}°</Text>
                      </View>
                    </>}
                    {weather.consensus.windspeed != null && (
                      <View style={styles.consensusDataItem}>
                        <Text style={styles.consensusDataLabel}>Vento</Text>
                        <Text style={styles.consensusDataVal}>
                          {Math.round(weather.consensus.windspeed)}<Text style={styles.consensusDataUnit}> km/h</Text>
                        </Text>
                        {weather.openMeteo?.current?.winddir != null && (
                          <Text style={[styles.consensusDataUnit, { fontSize: 12, color: c.text }]}>{windDirArrow(weather.openMeteo.current.winddir)}</Text>
                        )}
                      </View>
                    )}
                    {today?.uvIndex != null && (
                      <View style={styles.consensusDataItem}>
                        <Text style={styles.consensusDataLabel}>UV</Text>
                        <Text style={[styles.consensusDataVal, { color: today.uvIndex >= 8 ? '#f87171' : today.uvIndex >= 6 ? '#fb923c' : today.uvIndex >= 3 ? '#fbbf24' : '#4ade80' }]}>{Math.round(today.uvIndex)}</Text>
                      </View>
                    )}
                  </View>
                );
              })()}
              {/* Riga Mare — visibile solo se città costiera (entro ~50 km dalla costa) */}
              {isCoastal(cityInfo?.lat, cityInfo?.lon) && seaStateFromWind(weather.consensus.windspeed) && (() => {
                const sea = seaStateFromWind(weather.consensus.windspeed);
                return (
                  <View style={styles.consensusMareRow}>
                    <Text style={styles.consensusMareLabel}>🌊 Mare</Text>
                    <Text style={styles.consensusMareState}>{sea.label}</Text>
                    <Text style={styles.consensusMareSub}> · {sea.note}</Text>
                    {weather.marine?.current?.waveHeight != null && (
                      <Text style={styles.consensusMareSub}> · {weather.marine.current.waveHeight.toFixed(1)} m</Text>
                    )}
                  </View>
                );
              })()}
            </TouchableOpacity>
          )}

          {/* 3 pulsanti giorni — usa dati aggregati tra tutti i provider */}
          {(() => {
            const aggDays = buildAggregateDays(weather);
            return (
              <View style={styles.dayBtnsRow}>
                {[0, 1, 2].map(i => {
                  const day = aggDays[i];
                  const label = i === 0 ? 'Oggi' : i === 1 ? 'Domani' : 'Dopo';
                  const dateLabel = i === 2 && day ? `${new Date(day.date).getDate()} ${MONTHS_IT[new Date(day.date).getMonth()]}` : null;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.dayBtn, activeDay === i && styles.dayBtnActive]}
                      onPress={() => {
                        setActiveDay(i);
                        const offset = inlineDayOffsetsRef.current[i] ?? 0;
                        inlineScrollRef.current?.scrollTo({ x: offset, animated: true });
                      }}
                    >
                      <Text style={[styles.dayBtnLabel, activeDay === i && styles.dayBtnLabelActive, i === 2 && activeDay !== 2 && styles.dayBtnLabelThird]}>{label}</Text>
                      {dateLabel && <Text style={[styles.dayBtnDate, activeDay === 2 && styles.dayBtnDateActive]}>{dateLabel}</Text>}
                      {day && <WeatherIcon name={day.icon} size={30} dark={dark} />}
                      {day && (
                        <View style={styles.dayBtnTemps}>
                          <Text style={styles.dayBtnMax}>{Math.round(day.tempMax)}°</Text>
                          <Text style={[styles.dayBtnMin, i === 2 && activeDay !== 2 && styles.dayBtnMinThird]}>{Math.round(day.tempMin)}°</Text>
                        </View>
                      )}
                      {day?.precipProbability > 0 && (
                        <Text style={[styles.dayBtnRain, i === 2 && activeDay !== 2 && styles.dayBtnRainThird]}>
                          💧{Math.round(day.precipProbability)}%{day.precipitation > 0 ? ` · ${day.precipitation.toFixed(1)}mm` : ''}
                        </Text>
                      )}
                      {day?.providerCount != null && (
                        <Text style={styles.dayBtnSources}>
                          {day.providerCount > 1 ? `${day.providerCount} fonti` : 'Open-Meteo'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })()}


          {/* Previsioni inline — timeline 3 giorni con scroll sincronizzato */}
          {(() => {
            const aggData = buildAggregateData(weather);
            const { hourly, daily } = aggData;
            const selDay = daily?.[activeDay];

            // Raggruppa ore per data, ogni 2 ore
            const byDate = {};
            (hourly || []).forEach(h => {
              const hr = getHour(h.time);
              if (hr % 2 !== 0) return;
              const d = getDateStr(h.time);
              if (!byDate[d]) byDate[d] = [];
              byDate[d].push(h);
            });

            const BLOCK_ORDER = ['Mattina', 'Pomeriggio', 'Notte'];
            const BLOCK_ICON  = { Mattina: 'weather-sunset-up', Pomeriggio: 'white-balance-sunny', Notte: 'weather-night' };
            const BLOCK_COLOR = dark
              ? { Mattina: '#fbbf24', Pomeriggio: '#fb923c', Notte: '#818cf8' }
              : { Mattina: '#b45309', Pomeriggio: '#c2410c', Notte: '#3730a3' };

            return (
              <View style={styles.inlineForecast}>
                {selDay && (
                  <View style={styles.inlineDayHeader}>
                    <WeatherIcon name={selDay.icon} size={32} dark={dark} />
                    <Text style={styles.inlineDayDesc}>{translateDescription(selDay.description)}</Text>
                    <Text style={styles.inlineDayMax}>{Math.round(selDay.tempMax)}°</Text>
                    <Text style={styles.inlineDaySep}>/</Text>
                    <Text style={styles.inlineDayMin}>{Math.round(selDay.tempMin)}°</Text>
                    {selDay.precipProbability > 0 && (
                      <Text style={styles.inlineDayRain}>
                        💧{Math.round(selDay.precipProbability)}%{selDay.precipitation > 0 ? ` · ${selDay.precipitation.toFixed(1)}mm` : ''}
                      </Text>
                    )}
                  </View>
                )}
<ScrollView
                  ref={inlineScrollRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={e => {
                    const x = e.nativeEvent.contentOffset.x;
                    const offsets = inlineDayOffsetsRef.current;
                    let newDay = 0;
                    for (let i = offsets.length - 1; i >= 0; i--) {
                      if (x >= offsets[i] - 30) { newDay = i; break; }
                    }
                    if (newDay !== activeDay) setActiveDay(newDay);
                  }}
                >
                  <View style={styles.inlineHourGrid}>
                    {[0, 1, 2].map(dayIdx => {
                      const day = daily?.[dayIdx];
                      if (!day) return null;
                      const nextD = daily?.[dayIdx + 1];
                      const daySrH = day.sunrise ? parseInt(day.sunrise.slice(11,13), 10) : 6;
                      const daySsH = day.sunset  ? parseInt(day.sunset.slice(11,13),  10) : 20;
                      const nextSrH2 = nextD?.sunrise ? parseInt(nextD.sunrise.slice(11,13), 10) : daySrH;
                      const todayH2 = byDate[day.date]   || [];
                      const nextH2  = byDate[nextD?.date] || [];
                      const isFut2 = h => dayIdx !== 0 || new Date(h.time) > new Date();
                      const dayBlocks = {
                        Mattina:    todayH2.filter(h => { const hr = getHour(h.time); return hr >= daySrH && hr < 12 && isFut2(h); }),
                        Pomeriggio: todayH2.filter(h => { const hr = getHour(h.time); return hr >= 12 && hr < daySsH && isFut2(h); }),
                        Notte: [
                          ...todayH2.filter(h => getHour(h.time) >= daySsH && isFut2(h)),
                          ...nextH2.filter(h => getHour(h.time) < nextSrH2),
                        ],
                      };
                      const hasSlots = BLOCK_ORDER.some(f => dayBlocks[f]?.length);
                      if (!hasSlots) return null;
                      const sunDay = {
                        Mattina:    day.sunrise ? { emoji: '🌄', time: day.sunrise.slice(11,16) } : null,
                        Pomeriggio: null,
                        Notte:      day.sunset  ? { emoji: '🌇', time: day.sunset.slice(11,16) }  : null,
                      };
                      const dayLabel = dayIdx === 0 ? 'Oggi' : dayIdx === 1 ? 'Domani' : `${new Date(day.date).getDate()} ${MONTHS_IT[new Date(day.date).getMonth()]}`;
                      return (
                        <React.Fragment key={dayIdx}>
                          {/* Separatore giorno */}
                          <View
                            style={styles.inlineDayDivider}
                            onLayout={e => { inlineDayOffsetsRef.current[dayIdx] = e.nativeEvent.layout.x; }}
                          >
                            <Text style={styles.inlineDayDividerLabel}>{dayLabel}</Text>
                            <Text style={styles.inlineDayDividerTemp}>{Math.round(day.tempMax)}°/{Math.round(day.tempMin)}°</Text>
                            <WeatherIcon name={day.icon} size={22} dark={dark} />
                            <Text style={styles.inlineDayDividerSources}>
                              {day.providerCount > 1 ? `${day.providerCount} fonti` : 'Open-Meteo'}
                            </Text>
                          </View>
                          {/* Fasce del giorno */}
                          {BLOCK_ORDER.map(f => {
                            const slots = dayBlocks[f];
                            if (!slots?.length) return null;
                            const sun = sunDay[f];
                            return (
                              <React.Fragment key={f}>
                                <View style={[styles.inlineHourCard, styles.inlineFasciaCard, { borderLeftColor: BLOCK_COLOR[f], borderLeftWidth: 2 }]}>
                                  <MaterialCommunityIcons name={BLOCK_ICON[f]} size={18} color={BLOCK_COLOR[f]} />
                                  <Text style={[styles.inlineFasciaName, { color: BLOCK_COLOR[f] }]} numberOfLines={2} adjustsFontSizeToFit>{f}</Text>
                                  {sun && <Text style={styles.inlineFasciaSunTime}>{sun.emoji} {sun.time}</Text>}
                                </View>
                                {slots.map((h, j) => (
                                  <View key={j} style={styles.inlineHourCard}>
                                    <Text style={styles.inlineHourTime}>{h.time.slice(11, 16)}</Text>
                                    <WeatherIcon name={h.icon || 'weather-partly-cloudy'} size={28} dark={dark} />
                                    <Text style={styles.inlineHourTemp}>{Math.round(h.temp)}°</Text>
                                    <View style={styles.inlineHourMeta}>
                                      {h.humidity != null && !isNaN(h.humidity) && <Text style={styles.inlineHourHumidity}>💧{Math.round(h.humidity)}%</Text>}
                                      <Text style={styles.inlineHourRain}>🌧{h.precipProb != null ? Math.round(h.precipProb) : 0}%{h.precipMm > 0 ? ` · ${h.precipMm.toFixed(1)}mm` : ''}</Text>
                                    </View>
                                    {h.windspeed != null && (
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                        <MaterialCommunityIcons name="weather-windy" size={10} color={TW} />
                                        <Text style={styles.inlineHourWind}>
                                          {Math.round(h.windspeed)}{h.winddir != null ? ` ${windDirArrow(h.winddir)}` : ''}
                                          {isCoastal(cityInfo?.lat, cityInfo?.lon) && seaStateFromWind(h.windspeed) ? ` 🌊${seaStateFromWind(h.windspeed).label}` : ''}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                ))}
                              </React.Fragment>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            );
          })()}

          {/* Pulsanti azione */}
          <View style={styles.actionBtnsSection}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowCompare(true)} accessibilityRole="button">
              <MaterialCommunityIcons name="thermometer" size={20} color={c.accent} />
              <Text style={styles.actionBtnText}>Dati meteo per fonte</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={c.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setModal({ data: buildAggregateData(weather), title: `Media ${weather.consensus?.providersCount ?? 8} fonti`, color: '#38bdf8', initialDay: 0 })} accessibilityRole="button">
              <MaterialCommunityIcons name="clock-time-four-outline" size={20} color={c.accent} />
              <Text style={styles.actionBtnText}>Previsioni orarie</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={c.textMuted} />
            </TouchableOpacity>
          </View>


          </View>}{/* fine vista principale */}

          {/* TAB: CONFRONTO */}
          {activeTab === 'compare' && (() => {
            const providers = [
              weather.openMeteo, weather.openWeather, weather.weatherApi, weather.metNorway,
              weather.brightsky, weather.visualCrossing, weather.sevenTimer, weather.tomorrowIo,
            ].filter(Boolean);
            const days = ['Oggi', 'Domani', 'Dopo'];
            const pct = (val, mean) => {
              if (val == null || !mean) return null;
              const d = ((val - mean) / Math.abs(mean)) * 100;
              return d >= 0 ? `+${Math.round(d)}%` : `${Math.round(d)}%`;
            };
            const pctColor = (val, mean) => {
              if (val == null || !mean) return c.textMuted;
              return Math.abs(val - mean) < 0.5 ? '#22c55e' : Math.abs(val - mean) < 2 ? '#fbbf24' : '#f87171';
            };
            const params = [
              { key: 'temperature', label: 'Temperatura', unit: '°C',  mean: weather.consensus?.temperature },
              { key: 'feelsLike',   label: 'Percepita',   unit: '°C',  mean: weather.consensus?.feelsLike },
              { key: 'humidity',    label: 'Umidità',     unit: '%',   mean: weather.consensus?.humidity },
              { key: 'windspeed',   label: 'Vento',       unit: 'km/h',mean: weather.consensus?.windspeed },
            ];
            return (
              <View>
                {showBanner && (
                  <View style={styles.bannerCard}>
                    <View style={styles.bannerRow}>
                      <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#fbbf24" />
                      <Text style={styles.bannerText}>
                        <Text style={[styles.bannerBold, { color: '#22c55e' }]}>Verde</Text> = i modelli concordano &nbsp;·&nbsp;
                        <Text style={{ color: '#fbbf24' }}>Giallo</Text> = lieve differenza &nbsp;·&nbsp;
                        <Text style={{ color: '#f87171' }}>Rosso</Text> = divergenza
                      </Text>
                      <TouchableOpacity onPress={() => setShowBanner(false)} accessibilityRole="button">
                        <MaterialCommunityIcons name="close" size={16} color={c.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Confronto parametri attuali</Text>
                  <TouchableOpacity onPress={() => setTooltip(tooltip === 'compare' ? null : 'compare')} accessibilityRole="button" style={styles.tooltipBtn}>
                    <MaterialCommunityIcons name="help-circle-outline" size={22} color="#38bdf8" />
                  </TouchableOpacity>
                </View>
                {tooltip === 'compare' && (
                  <View style={styles.tooltipBox}>
                    <Text style={styles.tooltipText}>Lo scostamento % mostra quanto ogni fonte si discosta dalla media. 🟢 &lt;0.5° accordo · 🟡 0.5-2° lieve differenza · 🔴 &gt;2° divergenza significativa.</Text>
                  </View>
                )}
                {params.map(({ key, label, unit, mean }) => (
                  <View key={key} style={styles.cmpBlock}>
                    <View style={styles.cmpMeanRow}>
                      <Text style={styles.cmpLabel}>{label}</Text>
                      <Text style={styles.cmpMean}>{mean != null ? `${Math.round(mean)}${unit}` : '—'} <Text style={styles.cmpMeanNote}>media</Text></Text>
                    </View>
                    <View style={styles.cmpProviderRow}>
                      {providers.map(p => {
                        const val = p.current[key];
                        const diff = pct(val, mean);
                        const col  = pctColor(val, mean);
                        return (
                          <View key={p.provider.id} style={styles.cmpCell}>
                            <Text style={[styles.cmpProvName, { color: p.provider.color }]}>{p.provider.shortName}</Text>
                            <Text style={[styles.cmpVal, { color: p.provider.color }]}>{val != null ? `${Math.round(val)}${unit}` : '—'}</Text>
                            {diff && <Text style={[styles.cmpPct, { color: col }]}>{diff}</Text>}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
                <Text style={styles.sectionTitle}>Previsioni 3 giorni comuni</Text>
                <View style={styles.dayCompareHeader}>
                  <Text style={styles.dayCompareDay} />
                  {providers.map(p => (
                    <Text key={p.provider.id} style={[styles.dayCompareProvName, { color: p.provider.color }]}>{p.provider.shortName}</Text>
                  ))}
                </View>
                {[0, 1, 2].map(i => {
                  const vals = providers.map(p => p.daily?.[i]?.tempMax).filter(v => v != null);
                  const meanMax = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                  return (
                    <TouchableOpacity key={i} style={[styles.dayCompareRow, i === 0 && styles.dayCompareRowToday]}
                      onPress={() => setModal({ data: buildAggregateData(weather), title: `Media ${weather.consensus.providersCount} fonti`, color: '#38bdf8', initialDay: i })}
                      activeOpacity={0.7}>
                      <Text style={[styles.dayCompareDay, i === 0 && { color: '#38bdf8', fontWeight: '700' }]}>{days[i]}</Text>
                      {providers.map(p => {
                        const d = p.daily?.[i];
                        const diff = pct(d?.tempMax, meanMax);
                        const col  = pctColor(d?.tempMax, meanMax);
                        return (
                          <View key={p.provider.id} style={styles.dayCompareCell}>
                            {d ? (<>
                              <MaterialCommunityIcons name={d.icon || 'weather-partly-cloudy'} size={16} color={getIconColor(d.icon, dark)} />
                              <Text style={styles.dayCompareMax}>{Math.round(d.tempMax)}°</Text>
                              <Text style={styles.dayCompareMin}>{Math.round(d.tempMin)}°</Text>
                              {diff && <Text style={[styles.cmpPct, { color: col }]}>{diff}</Text>}
                              {d.precipProbability > 0 && <Text style={styles.dayCompareRain}>💧{Math.round(d.precipProbability)}%</Text>}
                            </>) : <Text style={styles.dayCompareNa}>—</Text>}
                          </View>
                        );
                      })}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })()}

          {/* TAB: 7 GIORNI */}
          {activeTab === 'forecast' && weather.openMeteo && (() => {
            const aggDays = buildAggregateDays(weather);
            const aggData = buildAggregateData(weather);
            return (
            <View>
              <View style={styles.forecastHeader}>
                <Text style={styles.sectionTitle}>Prossimi 7 giorni</Text>
              </View>
              {/* Legenda: solo il fatto, senza spiegazioni */}
              <View style={styles.forecastAttrib}>
                <MaterialCommunityIcons name="information-outline" size={11} color={c.textMuted} />
                <Text style={styles.forecastAttribText}>
                  Media provider attivi per quel giorno · "Xf" = numero fonti · "OM" = solo Open-Meteo
                </Text>
              </View>
              {weather.openMeteo.daily.map((omDay, i) => {
                const day = aggDays[i] || omDay;
                return (
                  <TouchableOpacity key={omDay.date} style={[styles.dayRow, i === 0 && styles.dayRowToday]}
                    onPress={() => setModal({ data: aggData, title: `Media ${weather.consensus?.providersCount ?? 8} fonti`, color: '#38bdf8', initialDay: i })}
                    activeOpacity={0.7}>
                    <Text style={[styles.dayName, i === 0 && styles.dayNameToday]}>{i === 0 ? 'Oggi' : formatDate(omDay.date)}</Text>
                    <WeatherIcon name={day.icon} size={24} dark={dark} />
                    <Text style={styles.dayDesc}>{translateDescription(day.description)}</Text>
                    <View style={styles.dayTemps}>
                      <Text style={styles.dayMax}>{Math.round(day.tempMax)}°</Text>
                      <Text style={styles.dayMin}>{Math.round(day.tempMin)}°</Text>
                    </View>
                    {omDay.precipitation > 0 && <Text style={styles.dayRain}>💧 {Math.round(omDay.precipitation)}mm</Text>}
                    {day.providerCount != null && (
                      <Text style={styles.daySingleBadge}>
                        {day.providerCount > 1 ? `${day.providerCount}f` : 'OM'}
                      </Text>
                    )}
                    <MaterialCommunityIcons name="chevron-right" size={14} color={c.textMuted} />
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.tabCloseBtn} onPress={() => setActiveTab('current')} accessibilityRole="button">
                <MaterialCommunityIcons name="chevron-up" size={18} color={c.textMuted} />
                <Text style={styles.tabCloseBtnText}>Chiudi</Text>
              </TouchableOpacity>
            </View>
            );
          })()}


        </ScrollView>
      )}
      {/* Overlay fonti dati meteo — assoluto, tab bar rimane visibile */}
      {showCompare && (
        <View style={styles.compareOverlay}>
          <TouchableOpacity style={styles.compareBackdrop} onPress={() => setShowCompare(false)} activeOpacity={1} />
          <AnimatedGradientBg>
            <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]} edges={['top', 'left', 'right', 'bottom']}>
              {/* drag handle */}
              <TouchableOpacity onPress={() => setShowCompare(false)} style={styles.dragHandleRow} activeOpacity={0.7}>
                <View style={styles.dragHandle} />
              </TouchableOpacity>
              <Text style={styles.compareModalTitle}>Dati meteo per fonte</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
                {weather && (
                  <View style={[styles.cardsList, { paddingTop: 12 }]}>
                    {[
                      weather.openMeteo, weather.openWeather, weather.weatherApi,
                      weather.metNorway, weather.brightsky, weather.visualCrossing,
                      weather.sevenTimer, weather.tomorrowIo,
                    ].filter(Boolean).map(p => (
                      <WeatherCard
                        key={p.provider.id}
                        data={p}
                        style={{ marginBottom: 10, paddingVertical: 14 }}
                        onPress={() => setModal({ data: p, title: p.provider.name, color: p.provider.color })}
                      />
                    ))}
                    <View style={styles.compareAdSlot}>
                      <MaterialCommunityIcons name="tag-outline" size={13} color={c.textMuted} />
                      <Text style={styles.compareAdSlotText}>Spazio riservato</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </AnimatedGradientBg>
        </View>
      )}

      {/* Modal dettaglio previsioni */}
      <ForecastModal
        visible={modal !== null}
        onClose={() => setModal(null)}
        data={modal?.data}
        title={modal?.title}
        color={modal?.color}
        initialDay={modal?.initialDay ?? 0}
        marine={weather?.marine}
      />
    </SafeAreaView>
    </AnimatedGradientBg>
  );
}

function makeStyles(c, dark) {
  return {
  safe: { flex: 1, backgroundColor: 'transparent' },
  searchRow: { flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 0 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.bgCard, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: c.border,
  },
  input: { flex: 1, color: c.text, fontSize: 15 },
  locBtn: {
    backgroundColor: c.bgCard, borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center',
  },
  suggestBox: {
    marginHorizontal: 12, marginTop: 4,
    backgroundColor: dark ? '#1e293b' : '#ffffff',
    borderRadius: 12, borderWidth: 1, borderColor: c.border,
    overflow: 'hidden',
  },
  suggestItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  suggestText: { color: c.text, fontSize: 14 },
  suggestCountry: { color: c.textMuted },
  recentSection: { paddingHorizontal: 12, paddingTop: 12 },
  recentLabel: { color: c.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  recentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: c.bgCard, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: c.border,
  },
  recentChipText: { color: c.textSub, fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: c.textSub, fontSize: 14 },
  welcome: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  welcomeTitle: { color: c.text, fontSize: 22, fontWeight: '700', marginTop: 8 },
  welcomeText: { color: c.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  providerRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' },
  scroll: { flex: 1 },
  cityHeader: { padding: 16, paddingBottom: 8, alignItems: 'center', overflow: 'visible' },
  appTitleRow: { width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  appTitle: { color: dark ? '#ffffff' : c.accent, fontSize: 32, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center', textShadowColor: dark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  appSubtitle: { color: dark ? '#ffffff' : c.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center', marginTop: 2 },
  tagline: { color: '#fb923c', fontSize: 13, fontWeight: '700', marginTop: 14, textAlign: 'center' },
  cityName: { color: c.textMuted, fontSize: 13, fontWeight: '300', marginTop: 6, textAlign: 'center' },
  updatedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4, gap: 4 },
  updatedText: { color: c.textMuted, fontSize: 11, fontWeight: '400' },
  refreshBtn: { padding: 2 },
  tabs: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 12, gap: 6 },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: dark ? 'rgba(255,255,255,0.10)' : c.bgCard,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.25)' : c.border,
  },
  tabBtnActive: { backgroundColor: c.accent + '33', borderColor: c.accent },
  tabLabel: { color: dark ? '#ffffff' : c.accent, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  tabLabelActive: { color: '#ffffff', fontWeight: '800' },
  consensusCard: {
    marginHorizontal: 12, marginBottom: 10, marginTop: 4,
    padding: 12, borderRadius: 14,
    backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.accent + '30',
  },
  consensusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  consensusLabel: { color: c.accent, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  consensusMainRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  consensusTemp: { color: dark ? '#ffffff' : c.accent, fontSize: 42, fontWeight: '800', lineHeight: 46, textShadowColor: dark ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  consensusTempLabel: { color: c.textSub, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  consensusDesc: { color: c.accent, fontSize: 13, textTransform: 'capitalize', fontWeight: '500' },
  consensusBadge: { color: c.accent, fontSize: 12, fontWeight: '700' },
  consensusDataRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
  consensusDataItem: { flex: 1, alignItems: 'center', gap: 2 },
  consensusDataLabel: { color: c.textSub, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  consensusDataVal: { color: c.text, fontSize: 14, fontWeight: '700' },
  consensusDataUnit: { fontSize: 10, fontWeight: '400' },
  consensusMareRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8, marginTop: 2, gap: 6 },
  consensusMareLabel: { color: c.text, fontSize: 13, fontWeight: '700' },
  consensusMareState: { color: c.text, fontSize: 13, fontWeight: '600', flex: 1 },
  consensusMareSub: { color: c.textMuted, fontSize: 12 },
  consensusStats: { alignItems: 'flex-end', gap: 4 },
  consensusMeta: { color: c.textMuted, fontSize: 12 },
  sectionTitle: { color: c.textSub, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: 12, marginBottom: 8, marginTop: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12 },
  tooltipBtn: { padding: 6 },
  tooltipBox: { marginHorizontal: 12, marginBottom: 10, padding: 12, backgroundColor: c.bgCard, borderRadius: 10, borderWidth: 1, borderColor: c.border },
  tooltipText: { color: c.textSub, fontSize: 12, lineHeight: 18 },
  bannerCard: { marginHorizontal: 12, marginBottom: 8, padding: 10, backgroundColor: c.bgCard, borderRadius: 10, borderWidth: 1, borderColor: '#fbbf2430' },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerText: { flex: 1, color: c.textSub, fontSize: 11, lineHeight: 16 },
  bannerBold: { color: '#22c55e', fontWeight: '600' },
  howToOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  howToCard: { backgroundColor: c.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: c.border },
  howToHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  howToTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
  howToRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 18 },
  howToIconBox: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  howToText: { flex: 1 },
  howToItemTitle: { color: c.text, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  howToItemDesc: { color: c.textMuted, fontSize: 12, lineHeight: 18 },
  cardsList: { paddingHorizontal: 12 },

  gpsBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 12, marginTop: 8, padding: 12, backgroundColor: dark ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.15)', borderRadius: 10, borderWidth: 1, borderColor: '#fbbf24' },
  gpsBannerText: { flex: 1, color: '#fbbf24', fontSize: 12, fontWeight: '600' },
  fallbackBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 8, padding: 10, backgroundColor: dark ? 'rgba(251,191,36,0.10)' : 'rgba(251,191,36,0.12)', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(251,191,36,0.5)' },
  fallbackBannerText: { flex: 1, color: '#fbbf24', fontSize: 11, fontWeight: '500' },
  hintCard: { margin: 12, padding: 12, backgroundColor: c.bgCard, borderRadius: 10, borderWidth: 1, borderColor: c.border },
  hintText: { color: c.textMuted, fontSize: 12, lineHeight: 18 },
  hintCode: { color: c.accent, fontFamily: 'monospace' },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, marginBottom: 10 },
  compareBar: { flex: 1, height: 8, backgroundColor: c.bgCard, borderRadius: 4, overflow: 'hidden' },
  compareBarFill: { height: '100%', borderRadius: 4 },
  compareTemp: { width: 48, textAlign: 'right', fontWeight: '700', fontSize: 15 },
  paramRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  cmpBlock: { marginHorizontal: 12, marginBottom: 10, backgroundColor: c.bgCard, borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
  cmpMeanRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  cmpLabel: { color: c.textSub, fontSize: 12, fontWeight: '600' },
  cmpMean: { color: c.text, fontSize: 15, fontWeight: '700' },
  cmpMeanNote: { color: c.textMuted, fontSize: 10, fontWeight: '400' },
  cmpProviderRow: { flexDirection: 'row' },
  cmpCell: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 2 },
  cmpProvName: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  cmpVal: { fontSize: 14, fontWeight: '700' },
  cmpPct: { fontSize: 10, fontWeight: '600' },
  dayCompareHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 4 },
  dayCompareRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  dayCompareRowToday: { backgroundColor: c.accent + '18' },
  dayCompareDay: { color: c.textSub, fontSize: 12, width: 68 },
  dayCompareProvName: { flex: 1, fontSize: 10, fontWeight: '700', textAlign: 'center' },
  dayCompareCell: { flex: 1, alignItems: 'center', gap: 1 },
  dayCompareMax: { color: '#fb923c', fontWeight: '700', fontSize: 13 },
  dayCompareMin: { color: c.accent, fontSize: 13 },
  dayCompareRain: { color: c.accent, fontSize: 9 },
  dayCompareNa: { color: c.border, fontSize: 13 },
  paramLabel: { color: c.textSub, fontSize: 13, width: 80 },
  paramCell: { flex: 1, alignItems: 'center' },
  paramProvider: { fontSize: 10, fontWeight: '600' },
  paramValue: { color: c.text, fontSize: 14, fontWeight: '600' },
  forecastHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12, marginBottom: 0 },
  dayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  dayRowToday: { backgroundColor: 'rgba(56,189,248,0.15)' },
  dayName: { color: c.text, width: 76, fontSize: 13, fontWeight: '500' },
  dayNameToday: { color: c.accent, fontWeight: '700' },
  dayDesc: { flex: 1, color: c.textSub, fontSize: 12, textTransform: 'capitalize' },
  dayTemps: { flexDirection: 'row', gap: 6 },
  dayMax: { color: '#fb923c', fontWeight: '700', fontSize: 15 },
  dayMin: { color: c.accent, fontSize: 15 },
  dayRain: { color: c.accent, fontSize: 12 },
  attribSection: { margin: 12, marginTop: 24, padding: 14, backgroundColor: c.bgCard, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  attribTitle: { color: c.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  attribRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  attribLine: { flex: 1, color: c.textMuted, fontSize: 11, fontWeight: '300', lineHeight: 18 },
  // 3 pulsanti giorni
  dayBtnsRow: { flexDirection: 'row', marginHorizontal: 12, marginTop: 10, marginBottom: 4, gap: 8 },
  dayBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)', gap: 4,
  },
  dayBtnActive: {
    backgroundColor: dark ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.25)',
    borderColor: c.accent,
  },
  dayBtnLabel: { color: dark ? '#94a3b8' : '#94a3b8', fontSize: 11, fontWeight: '700' },
  dayBtnLabelActive: { color: c.accent, fontWeight: '800' },
  dayBtnLabelThird: { color: '#94a3b8' },
  dayBtnDate: { color: '#94a3b8', fontSize: 9, fontWeight: '500', marginTop: -2 },
  dayBtnDateActive: { color: c.accent },
  dayBtnTemps: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dayBtnMax: { color: '#fb923c', fontWeight: '700', fontSize: 14 },
  dayBtnMin: { color: dark ? '#94a3b8' : c.accent, fontSize: 13 },
  dayBtnMinThird: { color: '#94a3b8' },
  dayBtnRain: { color: dark ? '#94a3b8' : c.accent, fontSize: 9 },
  dayBtnSources: { fontSize: 8, color: c.textMuted, textAlign: 'center', marginTop: 1 },
  dayBtnRainThird: { color: '#94a3b8' },
  // Attribuzione fonte dati
  inlineAttrib: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  inlineAttribText: { color: c.textMuted, fontSize: 10, fontStyle: 'italic', flex: 1 },
  forecastAttrib: { flexDirection: 'row', alignItems: 'center', gap: 4, marginHorizontal: 12, marginBottom: 6 },
  forecastAttribText: { color: c.textMuted, fontSize: 10, fontStyle: 'italic', flex: 1 },
  daySingleBadge: { color: c.textMuted, fontSize: 9, fontWeight: '700', backgroundColor: c.border, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  // Previsioni inline
  inlineForecast: { marginHorizontal: 12, marginTop: 8 },
  inlineDayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, padding: 10, backgroundColor: c.bgCard, borderRadius: 12, borderWidth: 1, borderColor: c.border },
  inlineDayDesc: { flex: 1, color: c.textSub, fontSize: 12, textTransform: 'capitalize' },
  inlineDayMax: { color: '#fb923c', fontWeight: '700', fontSize: 20 },
  inlineDaySep: { color: c.textMuted, fontSize: 16 },
  inlineDayMin: { color: c.accent, fontSize: 20 },
  inlineDayRain: { color: c.accent, fontSize: 11 },
  inlineFascia: { marginBottom: 8 },
  inlineDayDivider: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8, gap: 3, minWidth: 64, borderRightWidth: 1, borderRightColor: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.10)' },
  inlineDayDividerLabel: { fontSize: 11, fontWeight: '800', color: c.accent, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  inlineDayDividerTemp: { fontSize: 10, color: c.textSub, textAlign: 'center' },
  inlineDayDividerSources: { fontSize: 8, color: c.textMuted, textAlign: 'center' },
  inlineFasciaCard: { justifyContent: 'center', gap: 4, backgroundColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' },
  inlineFasciaName: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0.4 },
  inlineFasciaSunTime: { fontSize: 10, color: c.textSub, textAlign: 'center' },
  inlineHourGrid: { flexDirection: 'row', flexWrap: 'nowrap' },
  inlineHourCard: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, gap: 3, minWidth: 72 },
  inlineHourTime: { color: c.textMuted, fontSize: 11, fontWeight: '700' },
  inlineHourTemp: { color: dark ? '#ffffff' : c.accent, fontSize: 20, fontWeight: '700' },
  inlineHourMeta: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  inlineHourHumidity: { color: dark ? '#7dd3fc' : '#0369a1', fontSize: 10 },
  inlineHourRain: { color: dark ? '#a5f3fc' : '#0e7490', fontSize: 10, fontWeight: '700' },
  inlineHourWind: { color: dark ? '#7dd3fc' : '#0369a1', fontSize: 11 },
  // Pulsanti azione (Confronto + 7 giorni)
  actionBtnsSection: { marginHorizontal: 12, marginTop: 12, gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: c.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: c.border,
  },
  actionBtnText: { flex: 1, color: c.text, fontSize: 15, fontWeight: '600' },
  // Modal confronto
  tabCloseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 18, marginTop: 8 },
  tabCloseBtnText: { color: c.textMuted, fontSize: 15, fontWeight: '600' },
  compareModalBack: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10 },
  compareModalBackText: { color: c.text, fontSize: 15, fontWeight: '600' },
  compareModalTitle: { color: c.text, fontSize: 24, fontWeight: '800', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  compareAdSlot: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 0, marginTop: 8, marginBottom: 4,
    height: 36, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: c.border,
  },
  compareAdSlotText: { color: c.textMuted, fontSize: 10 },
  compareOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  compareBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  dragHandleRow: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border },
  };
}
