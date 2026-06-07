import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Alert, Linking, Image, Modal,
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
import { EXTERNAL_APPS } from '../services/externalApps';
import { useWeather } from '../context/WeatherContext';
import { useTheme } from '../context/ThemeContext';
import { getIconColor } from '../utils/weatherIconColor';

const DAYS_IT = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS_IT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
const RECENT_CITIES_KEY = 'recentCities';
const MAX_RECENT = 4;

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${DAYS_IT[d.getDay()]} ${d.getDate()} ${MONTHS_IT[d.getMonth()]}`;
}

function AppButton({ app, styles }) {
  const [useFallback, setUseFallback] = useState(false);
  return (
    <TouchableOpacity style={styles.extBtn} onPress={() => Linking.openURL(app.appStore)}>
      {useFallback ? (
        <Text style={styles.extFallback}>{app.fallback}</Text>
      ) : (
        <Image
          source={{ uri: `https://www.google.com/s2/favicons?domain=${app.domain}&sz=64` }}
          style={styles.extFavicon}
          onError={() => setUseFallback(true)}
        />
      )}
      <Text style={styles.extName}>{app.name}</Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [cityInfo, setCityInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('current');
  const [recentCities, setRecentCities] = useState([]);
  const [modal, setModal] = useState(null); // { data, title, color }
  const [showBanner, setShowBanner] = useState(true);
  const [showHowTo, setShowHowTo] = useState(false);
  const [tooltip, setTooltip] = useState(null); // 'provider' | 'compare' | null
  const hasAutoLoaded = useRef(false);
  const { setSelectedCity } = useWeather();
  const { dark, toggleTheme, colors: c } = useTheme();
  const styles = useMemo(() => makeStyles(c, dark), [c, dark]);

  // Costruisce dati aggregati con orario medio tra i provider
  const buildAggregateData = (w) => {
    const providers = [w.openMeteo, w.openWeather, w.weatherApi].filter(Boolean);
    // Hourly aggregato: usa Open-Meteo come base (dati più completi)
    const baseHourly = w.openMeteo?.hourly || w.weatherApi?.hourly || [];
    return {
      current: w.consensus ? {
        temperature: w.consensus.temperature,
        feelsLike: w.consensus.feelsLike,
        humidity: w.consensus.humidity,
        windspeed: w.consensus.windspeed,
        description: w.consensus.description,
        icon: providers[0]?.current?.icon || 'weather-partly-cloudy',
      } : null,
      hourly: baseHourly,
      daily: w.openMeteo?.daily || [],
    };
  };

  // Carica città recenti e avvia GPS al primo mount
  useEffect(() => {
    loadRecentCities();
    autoLoadGPS();
  }, []);

  // Torna alla tab "Attuale" quando si preme Meteo dal menu in basso
  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      setActiveTab('current');
    });
    return unsubscribe;
  }, [navigation]);

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
    if (status !== 'granted') return;
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
    } catch (e) {
      Alert.alert('Errore', 'Impossibile caricare i dati meteo. Controlla la connessione.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedGradientBg>
    <SafeAreaView style={styles.safe}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: c.bgCard, borderColor: c.border }]}>
          <MaterialCommunityIcons name="magnify" size={20} color={c.textMuted} />
          <TextInput
            style={[styles.input, { color: c.text }]}
            placeholder="Cerca una città..."
            placeholderTextColor={c.textMuted}
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
          />
          {searching && <ActivityIndicator size="small" color={c.accent} />}
        </View>
        <TouchableOpacity style={[styles.locBtn, { backgroundColor: c.bgCard, borderColor: c.border }]} onPress={useMyLocation} accessibilityLabel="Usa la mia posizione" accessibilityRole="button">
          <MaterialCommunityIcons name="crosshairs-gps" size={22} color={c.accent} />
        </TouchableOpacity>
        {/* Toggle tema chiaro/scuro */}
        <TouchableOpacity style={[styles.locBtn, { backgroundColor: c.bgCard, borderColor: c.border }]} onPress={toggleTheme} accessibilityLabel="Cambia tema" accessibilityRole="button">
          <MaterialCommunityIcons name={dark ? 'weather-sunny' : 'weather-night'} size={22} color={c.accent} />
        </TouchableOpacity>
      </View>

      {/* Autocomplete */}
      {suggestions.length > 0 && (
        <View style={styles.suggestBox}>
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

      {/* Città recenti — solo nella empty state, senza suggerimenti attivi */}
      {!loading && !weather && suggestions.length === 0 && recentCities.length > 0 && (
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

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.loadingText}>Caricamento da tutti i provider...</Text>
        </View>
      )}

      {!loading && !weather && (
        <View style={styles.welcome}>
          <MaterialCommunityIcons name="weather-partly-cloudy" size={80} color="#334155" />
          <Text style={styles.welcomeTitle}>Meteo Aggregator</Text>
          <Text style={styles.welcomeText}>
            Dati da più provider meteo in un'unica app.{'\n'}
            Cerca una città o usa la tua posizione.
          </Text>
          <View style={styles.providerRow}>
            {Object.values(PROVIDERS).map(p => (
              <ProviderBadge key={p.id} provider={p} size="md" />
            ))}
          </View>
        </View>
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
              { icon: 'cloud-download-outline', color: '#38bdf8', title: 'Dati da 8 modelli', desc: 'L\'app chiama in parallelo fino a 8 servizi meteo indipendenti: Open-Meteo, OWM, WeatherAPI, MET Norway, Brightsky/DWD, Visual Crossing, 7Timer! e Tomorrow.io.' },
              { icon: 'scale-balance', color: '#818cf8', title: 'Media e scostamento', desc: 'Viene calcolata la media tra i provider. Lo scostamento % indica quanto ogni modello si discosta: verde = accordo, giallo = lieve differenza, rosso = divergenza.' },
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

      {!loading && weather && (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* City header */}
          <View style={styles.cityHeader}>
            <View style={styles.appTitleRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', overflow: 'visible', paddingTop: 16 }}>
                <View style={{ position: 'relative', overflow: 'visible' }}>
                  <MaterialCommunityIcons name="white-balance-sunny" size={54} color="#fbbf24" style={{ position: 'absolute', left: -16, top: -20, zIndex: 0, opacity: 0.9 }} />
                  <MaterialCommunityIcons name="cloud" size={36} color="#ffffff" style={{ position: 'absolute', left: 4, top: -10, zIndex: 1, opacity: 0.95 }} />
                  <Text style={[styles.appTitle, { zIndex: 2 }]}>O</Text>
                </View>
                <Text style={styles.appTitle}>nlyOneMeteo</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHowTo(true)} accessibilityLabel="Come funziona" accessibilityRole="button" style={{ position: 'absolute', right: 0 }}>
                <MaterialCommunityIcons name="information-outline" size={22} color="#38bdf8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.appSubtitle}>Una previsione, tante fonti</Text>
            <Text style={styles.tagline} numberOfLines={1} adjustsFontSizeToFit>
              {weather
                ? `Confronto previsioni da ${weather.consensus?.providersCount ?? 4} modelli meteo ufficiali`
                : 'Confronto previsioni da più modelli meteo ufficiali'}
            </Text>
            <Text style={styles.cityName}>
              📍 {cityInfo?.name || query}{[cityInfo?.region, cityInfo?.country].filter(Boolean).length > 0 ? `, ${[cityInfo?.region, cityInfo?.country].filter(Boolean).join(', ')}` : ''}
            </Text>
          </View>

          {/* Banner spiegazione (collassabile) */}
          {showBanner && (
            <View style={styles.bannerCard}>
              <View style={styles.bannerRow}>
                <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#fbbf24" />
                <Text style={styles.bannerText}>
                  <Text style={[styles.bannerBold, { color: '#22c55e' }]}>Verde</Text> = i modelli concordano &nbsp;·&nbsp;
                  <Text style={{ color: '#fbbf24' }}>Giallo</Text> = lieve differenza &nbsp;·&nbsp;
                  <Text style={{ color: '#f87171' }}>Rosso</Text> = divergenza
                </Text>
                <TouchableOpacity onPress={() => setShowBanner(false)} accessibilityLabel="Chiudi suggerimento" accessibilityRole="button">
                  <MaterialCommunityIcons name="close" size={16} color={c.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Tab bar */}
          <View style={styles.tabs}>
            {['current', 'compare', 'forecast'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
                  {tab === 'current' ? '📍 Attuale' : tab === 'compare' ? '🔄 Confronto' : '📅 7 giorni'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TAB: ATTUALE */}
          {activeTab === 'current' && (
            <View>
              {weather.consensus && (

                <TouchableOpacity
                  style={styles.consensusCard}
                  activeOpacity={0.8}
                  accessibilityLabel="Media provider, tocca per dettagli"
                  accessibilityRole="button"
                  onPress={() => setModal({ data: buildAggregateData(weather), title: `Media ${weather.consensus.providersCount} provider`, color: '#38bdf8' })}
                >
                  <View style={styles.consensusRow}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.consensusLabel}>Media {weather.consensus.providersCount} provider  ›</Text>
                        <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); setTooltip(tooltip === 'consensus' ? null : 'consensus'); }} style={{ padding: 2 }}>
                          <MaterialCommunityIcons name="help-circle-outline" size={16} color="#38bdf8" />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.consensusTemp}>{weather.consensus.temperature}°C</Text>
                      <Text style={styles.consensusDesc}>{weather.consensus.description}</Text>
                    </View>
                    {weather.consensus.humidity != null && (
                      <View style={styles.consensusStats}>
                        <Text style={styles.consensusMeta}>💧 {Math.round(weather.consensus.humidity)}%</Text>
                        <Text style={styles.consensusMeta}>💨 {Math.round(weather.consensus.windspeed)} km/h</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              {tooltip === 'consensus' && (
                <View style={styles.tooltipBox}>
                  <Text style={styles.tooltipText}>La card Media calcola la media di temperatura, umidità e vento tra tutti i provider attivi. È il valore più affidabile quando i modelli concordano. Tocca la card per vedere le previsioni aggregate.</Text>
                </View>
              )}
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Dati per provider</Text>
                <TouchableOpacity onPress={() => setTooltip(tooltip === 'provider' ? null : 'provider')} accessibilityLabel="Info dati per provider" accessibilityRole="button" style={styles.tooltipBtn}>
                  <MaterialCommunityIcons name="help-circle-outline" size={22} color="#38bdf8" />
                </TouchableOpacity>
              </View>
              {tooltip === 'provider' && (
                <View style={styles.tooltipBox}>
                  <Text style={styles.tooltipText}>Ogni card mostra i dati in tempo reale di un modello meteo diverso. Tocca una card per vedere le previsioni orarie e giornaliere di quel provider.</Text>
                </View>
              )}
              <View style={styles.cardsList}>
                {[
                  weather.openMeteo, weather.openWeather, weather.weatherApi,
                  weather.metNorway, weather.brightsky, weather.visualCrossing,
                  weather.sevenTimer, weather.tomorrowIo,
                ].filter(Boolean).map(p => (
                  <WeatherCard
                    key={p.provider.id}
                    data={p}
                    onPress={() => setModal({ data: p, title: p.provider.name, color: p.provider.color })}
                  />
                ))}
              </View>
              {(!weather.openWeather || !weather.weatherApi) && (
                <View style={styles.hintCard}>
                  <Text style={styles.hintText}>
                    💡 Per abilitare tutti i provider, inserisci le API key gratuite in{' '}
                    <Text style={styles.hintCode}>src/services/config.js</Text>
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* TAB: CONFRONTO */}
          {activeTab === 'compare' && (() => {
            const providers = [weather.openMeteo, weather.openWeather, weather.weatherApi, weather.metNorway].filter(Boolean);
            const days = ['Oggi', 'Domani', 'Dopo'];

            // Calcola scostamento % di un valore dalla media
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
                {/* Parametri attuali con media e scostamento */}
                <View style={styles.sectionRow}>
                  <Text style={styles.sectionTitle}>Confronto parametri attuali</Text>
                  <TouchableOpacity onPress={() => setTooltip(tooltip === 'compare' ? null : 'compare')} accessibilityLabel="Info confronto" accessibilityRole="button" style={styles.tooltipBtn}>
                    <MaterialCommunityIcons name="help-circle-outline" size={22} color="#38bdf8" />
                  </TouchableOpacity>
                </View>
                {tooltip === 'compare' && (
                  <View style={styles.tooltipBox}>
                    <Text style={styles.tooltipText}>Lo scostamento % mostra quanto ogni provider si discosta dalla media. 🟢 &lt;0.5° accordo · 🟡 0.5-2° lieve differenza · 🔴 &gt;2° divergenza significativa.</Text>
                  </View>
                )}
                {params.map(({ key, label, unit, mean }) => (
                  <View key={key} style={styles.cmpBlock}>
                    {/* Riga media */}
                    <View style={styles.cmpMeanRow}>
                      <Text style={styles.cmpLabel}>{label}</Text>
                      <Text style={styles.cmpMean}>{mean != null ? `${Math.round(mean)}${unit}` : '—'} <Text style={styles.cmpMeanNote}>media</Text></Text>
                    </View>
                    {/* Riga provider */}
                    <View style={styles.cmpProviderRow}>
                      {providers.map(p => {
                        const val = p.current[key];
                        const diff = pct(val, mean);
                        const col  = pctColor(val, mean);
                        return (
                          <View key={p.provider.id} style={styles.cmpCell}>
                            <Text style={[styles.cmpProvName, { color: p.provider.color }]}>{p.provider.shortName}</Text>
                            <Text style={[styles.cmpVal, { color: p.provider.color }]}>
                              {val != null ? `${Math.round(val)}${unit}` : '—'}
                            </Text>
                            {diff && <Text style={[styles.cmpPct, { color: col }]}>{diff}</Text>}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}

                {/* Confronto 3 giorni comuni */}
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
                    <TouchableOpacity
                      key={i}
                      style={[styles.dayCompareRow, i === 0 && styles.dayCompareRowToday]}
                      onPress={() => setModal({ data: buildAggregateData(weather), title: `Media ${weather.consensus.providersCount} provider`, color: '#38bdf8', initialDay: i })}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dayCompareDay, i === 0 && { color: '#38bdf8', fontWeight: '700' }]}>{days[i]}</Text>
                      {providers.map(p => {
                        const d = p.daily?.[i];
                        const diff = pct(d?.tempMax, meanMax);
                        const col  = pctColor(d?.tempMax, meanMax);
                        return (
                          <View key={p.provider.id} style={styles.dayCompareCell}>
                            {d ? (
                              <>
                                <MaterialCommunityIcons name={d.icon || 'weather-partly-cloudy'} size={16} color={getIconColor(d.icon, dark)} />
                                <Text style={styles.dayCompareMax}>{Math.round(d.tempMax)}°</Text>
                                <Text style={styles.dayCompareMin}>{Math.round(d.tempMin)}°</Text>
                                {diff && <Text style={[styles.cmpPct, { color: col }]}>{diff}</Text>}
                                {d.precipProbability > 0 && <Text style={styles.dayCompareRain}>💧{d.precipProbability}%</Text>}
                              </>
                            ) : <Text style={styles.dayCompareNa}>—</Text>}
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
          {activeTab === 'forecast' && weather.openMeteo && (
            <View>
              <View style={styles.forecastHeader}>
                <Text style={styles.sectionTitle}>Prossimi 7 giorni</Text>
                <ProviderBadge provider={PROVIDERS.OPEN_METEO} size="sm" />
              </View>
              {weather.openMeteo.daily.map((day, i) => {
                const wapiDay = weather.weatherApi?.daily?.[i];
                const diffMax = wapiDay ? Math.abs(day.tempMax - wapiDay.tempMax) : null;
                const diffMin = wapiDay ? Math.abs(day.tempMin - wapiDay.tempMin) : null;
                const devColor = diffMax === null ? null : diffMax < 1 ? '#22c55e' : diffMax < 3 ? '#fbbf24' : '#f87171';
                const devColorMin = diffMin === null ? null : diffMin < 1 ? '#22c55e' : diffMin < 3 ? '#fbbf24' : '#f87171';
                return (
                  <TouchableOpacity
                    key={day.date}
                    style={[styles.dayRow, i === 0 && styles.dayRowToday]}
                    onPress={() => setModal({ data: weather.openMeteo, title: weather.openMeteo.provider.name, color: weather.openMeteo.provider.color, initialDay: i })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayName, i === 0 && styles.dayNameToday]}>
                      {i === 0 ? 'Oggi' : formatDate(day.date)}
                    </Text>
                    <WeatherIcon name={day.icon} size={24} dark={dark} />
                    <Text style={styles.dayDesc}>{day.description}</Text>
                    <View style={styles.dayTemps}>
                      <Text style={[styles.dayMax, devColor && { color: devColor }]}>{Math.round(day.tempMax)}°</Text>
                      <Text style={[styles.dayMin, devColorMin && { color: devColorMin }]}>{Math.round(day.tempMin)}°</Text>
                    </View>
                    {day.precipitation > 0 && (
                      <Text style={styles.dayRain}>💧 {Math.round(day.precipitation)}mm</Text>
                    )}
                    <MaterialCommunityIcons name="chevron-right" size={14} color={c.textMuted} />
                  </TouchableOpacity>
                );
              })}
              {weather.weatherApi && weather.weatherApi.daily?.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <View style={styles.forecastHeader}>
                    <Text style={styles.sectionTitle}>Prossimi 3 giorni</Text>
                    <ProviderBadge provider={PROVIDERS.WEATHER_API} size="sm" />
                  </View>
                  {weather.weatherApi.daily.map((day, i) => {
                    const omDay = weather.openMeteo?.daily?.[i];
                    const diffMax = omDay ? Math.abs(day.tempMax - omDay.tempMax) : null;
                    const diffMin = omDay ? Math.abs(day.tempMin - omDay.tempMin) : null;
                    const devMax = diffMax === null ? null : diffMax < 1 ? '#22c55e' : diffMax < 3 ? '#fbbf24' : '#f87171';
                    const devMin = diffMin === null ? null : diffMin < 1 ? '#22c55e' : diffMin < 3 ? '#fbbf24' : '#f87171';
                    return (
                      <TouchableOpacity
                        key={day.date}
                        style={[styles.dayRow, i === 0 && styles.dayRowToday]}
                        onPress={() => setModal({ data: weather.weatherApi, title: weather.weatherApi.provider.name, color: weather.weatherApi.provider.color, initialDay: i })}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.dayName, i === 0 && styles.dayNameToday]}>
                          {i === 0 ? 'Oggi' : formatDate(day.date)}
                        </Text>
                        <WeatherIcon name={day.icon} size={24} dark={dark} />
                        <Text style={styles.dayDesc}>{day.description}</Text>
                        <View style={styles.dayTemps}>
                          <Text style={[styles.dayMax, devMax && { color: devMax }]}>{Math.round(day.tempMax)}°</Text>
                          <Text style={[styles.dayMin, devMin && { color: devMin }]}>{Math.round(day.tempMin)}°</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={14} color={c.textMuted} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* App esterne */}
          <View style={styles.extSection}>
            <Text style={styles.extSectionTitle}>Confronta anche su</Text>
            <Text style={styles.extSectionDesc}>(Tap per aprire o scaricare l'app)</Text>
            <View style={styles.extBar}>
              {EXTERNAL_APPS.map(app => (
                <AppButton key={app.name} app={app} styles={styles} />
              ))}
            </View>
          </View>

        </ScrollView>
      )}
      {/* Modal dettaglio previsioni */}
      <ForecastModal
        visible={modal !== null}
        onClose={() => setModal(null)}
        data={modal?.data}
        title={modal?.title}
        color={modal?.color}
        initialDay={modal?.initialDay ?? 0}
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
    backgroundColor: c.bgCard, borderRadius: 12, borderWidth: 1, borderColor: c.border,
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
  appTitle: { color: c.text, fontSize: 32, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.65)', textShadowOffset: { width: 0, height: -3 }, textShadowRadius: 6 },
  appSubtitle: { color: c.bgCard, fontSize: 13, fontWeight: '600', fontStyle: 'italic', letterSpacing: 0.3, marginTop: 2, textAlign: 'center' },
  tagline: { color: c.textSub, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 3, textAlign: 'center' },
  cityName: { color: c.textMuted, fontSize: 13, fontWeight: '300', marginTop: 6, textAlign: 'center' },
  tabs: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 12, gap: 6 },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    backgroundColor: dark ? 'rgba(255,255,255,0.10)' : c.bgCard, alignItems: 'center',
    borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.25)' : c.border,
  },
  tabBtnActive: { backgroundColor: c.accent + '33', borderColor: c.accent },
  tabLabel: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  tabLabelActive: { color: '#ffffff', fontWeight: '800' },
  consensusCard: {
    marginHorizontal: 12, marginBottom: 10, marginTop: 4,
    padding: 12, borderRadius: 14,
    backgroundColor: c.bgCard, borderWidth: 1, borderColor: c.accent + '30',
  },
  consensusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  consensusLabel: { color: c.accent, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  consensusTemp: { color: c.text, fontSize: 34, fontWeight: '700' },
  consensusDesc: { color: c.textSub, fontSize: 12, textTransform: 'capitalize' },
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
  extSection: { marginHorizontal: 12, marginTop: 8, marginBottom: 4 },
  extSectionTitle: { color: c.text, fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  extSectionDesc: { color: c.textMuted, fontSize: 12, fontWeight: '400', textAlign: 'center', marginBottom: 12 },
  extBar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  extBtn: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: c.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: c.border,
    width: '32%', paddingVertical: 16, gap: 8,
  },
  extFavicon: { width: 40, height: 40, borderRadius: 10 },
  extFallback: { fontSize: 32 },
  extName: { color: c.text, fontSize: 11, fontWeight: '600', textAlign: 'center' },
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
  };
}
