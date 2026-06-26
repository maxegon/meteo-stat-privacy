import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedGradientBg from '../components/AnimatedGradientBg';
import { useTheme } from '../context/ThemeContext';

import { fetchHistoricalRange } from '../services/aggregator';
import ProviderBadge from '../components/ProviderBadge';
import { PROVIDERS } from '../services/providers';
import { useWeather } from '../context/WeatherContext';

const MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const thisYear = new Date().getFullYear();
const END_YEAR = thisYear - 1;
const START_YEAR = thisYear - 10;
// Decennio dinamico: ultimi 10 anni interi rispetto a oggi, più recente per primo
const DECADE_YEARS = Array.from({ length: 10 }, (_, i) => END_YEAR - i);

function avg(arr) {
  const v = arr.filter(x => x != null);
  return v.length ? v.reduce((a,b) => a+b,0) / v.length : null;
}
function round1(n) { return n != null ? Math.round(n * 10) / 10 : null; }

// Estrae e aggrega le statistiche di un singolo anno dal dataset decennale già
// scaricato (nessuna nuova richiesta di rete al cambio anno). Null-safe: se la
// località non ha dati per quell'anno, ritorna null invece di rompere la UI
// (es. Math.max su array vuoto darebbe -Infinity).
function statsForYear(daily, year) {
  if (!daily?.time) return null;
  const idxs = [];
  daily.time.forEach((t, i) => { if (t.startsWith(String(year))) idxs.push(i); });
  if (!idxs.length) return null;

  const maxT  = idxs.map(i => daily.temperature_2m_max[i]);
  const minT  = idxs.map(i => daily.temperature_2m_min[i]);
  const meanT = idxs.map(i => daily.temperature_2m_mean[i]);
  const rain  = idxs.map(i => daily.precipitation_sum[i]);
  const time  = idxs.map(i => daily.time[i]);

  const validMax = maxT.filter(x => x != null);
  const validMin = minT.filter(x => x != null);
  const absMax = validMax.length ? Math.max(...validMax) : null;
  const absMin = validMin.length ? Math.min(...validMin) : null;
  const idxMax = absMax != null ? maxT.indexOf(absMax) : -1;
  const idxMin = absMin != null ? minT.indexOf(absMin) : -1;

  const stats = {
    year,
    absMax, absMin,
    dateMax: idxMax >= 0 ? time[idxMax] : null,
    dateMin: idxMin >= 0 ? time[idxMin] : null,
    meanAnnual: round1(avg(meanT)),
    totalRain: round1(rain.reduce((a,b) => a + (b||0), 0)),
    rainDays: rain.filter(x => x != null && x >= 1).length,
    hotDays: maxT.filter(x => x != null && x >= 30).length,
    coldDays: minT.filter(x => x != null && x <= 0).length,
  };

  const m = Array(12).fill(null).map(() => ({ temps: [], rain: 0 }));
  time.forEach((t, i) => {
    const mo = new Date(t).getMonth();
    if (meanT[i] != null) m[mo].temps.push(meanT[i]);
    if (rain[i] != null) m[mo].rain += rain[i];
  });
  const monthly = m.map(mo => ({
    avgTemp: round1(avg(mo.temps)),
    totalRain: round1(mo.rain),
  }));

  return { stats, monthly };
}

export default function StatsScreen({ navigation }) {
  const { selectedCity: cityInfo } = useWeather();
  const [year, setYear] = useState(END_YEAR);
  const [decadeDaily, setDecadeDaily] = useState(null);
  const [loading, setLoading] = useState(false);
  const { colors: c, dark } = useTheme();
  const styles = useMemo(() => makeStyles(c, dark), [c, dark]);

  // Carica l'intero decennio in UNA sola richiesta Archive API appena c'è una
  // città selezionata (può essere lenta: ~10 anni di dati giornalieri).
  useEffect(() => {
    if (cityInfo && !decadeDaily && !loading) {
      loadDecade(cityInfo);
    }
  }, [cityInfo]);

  const loadDecade = async (city) => {
    if (!city) { Alert.alert('', 'Prima seleziona una città dalla scheda Meteo.'); return; }
    setLoading(true);
    try {
      const data = await fetchHistoricalRange(city.lat, city.lon, START_YEAR, END_YEAR);
      setDecadeDaily(data.daily);
    } catch (e) {
      Alert.alert('Errore', 'Impossibile caricare i dati storici.');
    } finally {
      setLoading(false);
    }
  };

  // Anno selezionato: derivato istantaneamente dal decennio già in memoria —
  // cambiare anno non fa nessuna nuova richiesta di rete.
  const current = useMemo(
    () => (decadeDaily ? statsForYear(decadeDaily, year) : null),
    [decadeDaily, year]
  );
  const stats = current?.stats ?? null;
  const monthly = current?.monthly ?? null;

  // Tendenza decennale: media annuale di temperatura per ciascuno dei 10 anni,
  // ordine cronologico. Anni senza dati per questa località restano null
  // (barra minima + "—") invece di far saltare l'intera vista.
  const decadeTrend = useMemo(() => {
    if (!decadeDaily) return [];
    return DECADE_YEARS.slice().reverse().map(y => {
      const r = statsForYear(decadeDaily, y);
      return { year: y, avgTemp: r?.stats?.meanAnnual ?? null };
    });
  }, [decadeDaily]);

  const trendTemps = decadeTrend.map(d => d.avgTemp).filter(x => x != null);
  const trendMin = trendTemps.length ? Math.min(...trendTemps) : 0;
  const trendMax = trendTemps.length ? Math.max(...trendTemps) : 1;
  const trendRange = trendMax - trendMin || 1;

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${dt.getDate()} ${MONTHS_IT[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  return (
    <AnimatedGradientBg>
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>📊 Statistiche Storiche</Text>
        <Text style={styles.sub}>Dati climatici annuali e mensili — ultimi 10 anni</Text>

        {/* Year selector — chip orizzontali scrollabili (decennio {START_YEAR}-{END_YEAR}) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.yearScroll}
          contentContainerStyle={styles.yearRow}
        >
          {DECADE_YEARS.map(y => (
            <TouchableOpacity
              key={y}
              style={[styles.yearChip, year === y && styles.yearChipActive]}
              onPress={() => setYear(y)}
              accessibilityRole="button"
              accessibilityLabel={`Anno ${y}`}
            >
              <Text style={[styles.yearLabel, year === y && styles.yearLabelActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {!cityInfo ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="map-marker-question" size={60} color="#38bdf8" />
            <Text style={styles.emptyText}>
              Seleziona prima una città per vedere le statistiche storiche.
            </Text>
            <TouchableOpacity
              style={styles.goSearchBtn}
              onPress={() => navigation.navigate('Home')}
              accessibilityLabel="Cerca una città" accessibilityRole="button"
            >
              <MaterialCommunityIcons name="magnify" size={18} color="#ffffff" />
              <Text style={styles.goSearchText}>Cerca una città</Text>
            </TouchableOpacity>
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText}>Caricamento dati {START_YEAR}-{END_YEAR}...</Text>
          </View>
        ) : decadeDaily ? (
          <>
            <View style={styles.provRow}>
              <ProviderBadge provider={PROVIDERS.OPEN_METEO} size="md" />
              <Text style={styles.provNote}>Archive API — dati ERA5/ECMWF</Text>
            </View>

            {/* Tendenza decennale — discreta, sopra il dettaglio del singolo anno */}
            {trendTemps.length > 0 && (
              <View style={styles.trendBlock}>
                <Text style={styles.sectionTitle}>Tendenza decennale — temperatura media annua</Text>
                <View style={styles.trendRow}>
                  {decadeTrend.map(d => {
                    const h = d.avgTemp != null ? 6 + ((d.avgTemp - trendMin) / trendRange) * 34 : 2;
                    const sel = d.year === year;
                    return (
                      <TouchableOpacity
                        key={d.year}
                        style={styles.trendBar}
                        onPress={() => setYear(d.year)}
                        accessibilityRole="button"
                        accessibilityLabel={`Vai all'anno ${d.year}`}
                      >
                        <Text style={[styles.trendBarLabel, sel && { color: c.accent }]}>
                          {d.avgTemp != null ? `${Math.round(d.avgTemp)}°` : '—'}
                        </Text>
                        <View style={styles.trendBarTrack}>
                          <View style={[
                            styles.trendBarFill,
                            { height: h, backgroundColor: sel ? c.accent : c.border },
                          ]} />
                        </View>
                        <Text style={[styles.trendYearLabel, sel && { color: c.accent, fontWeight: '700' }]}>
                          {"'" + String(d.year).slice(2)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {!stats ? (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="cloud-off-outline" size={48} color="#38bdf8" />
                <Text style={styles.emptyText}>Nessun dato disponibile per il {year} in questa località.</Text>
              </View>
            ) : (
              <>
                {/* Summary stats */}
                <View style={styles.grid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>🌡️ Max assoluta</Text>
                    <Text style={[styles.statVal, { color: '#fb923c' }]}>{stats.absMax != null ? `${round1(stats.absMax)}°C` : '—'}</Text>
                    <Text style={styles.statDate}>{formatDate(stats.dateMax)}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>🥶 Min assoluta</Text>
                    <Text style={[styles.statVal, { color: '#38bdf8' }]}>{stats.absMin != null ? `${round1(stats.absMin)}°C` : '—'}</Text>
                    <Text style={styles.statDate}>{formatDate(stats.dateMin)}</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>📊 Media annuale</Text>
                    <Text style={styles.statVal}>{stats.meanAnnual != null ? `${stats.meanAnnual}°C` : '—'}</Text>
                    <Text style={styles.statDate}>Temperatura media giornaliera</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>🌧️ Pioggia totale</Text>
                    <Text style={[styles.statVal, { color: '#38bdf8' }]}>{stats.totalRain != null ? `${stats.totalRain} mm` : '—'}</Text>
                    <Text style={styles.statDate}>{stats.rainDays} giorni di pioggia (≥1mm)</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>☀️ Giorni caldi ≥30°</Text>
                    <Text style={[styles.statVal, { color: '#fb923c' }]}>{stats.hotDays}</Text>
                    <Text style={styles.statDate}>Ondate di calore</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statLabel}>❄️ Giorni gelo ≤0°</Text>
                    <Text style={[styles.statVal, { color: '#a5f3fc' }]}>{stats.coldDays}</Text>
                    <Text style={styles.statDate}>Notti sotto zero</Text>
                  </View>
                </View>

                {/* Monthly table */}
                <Text style={styles.sectionTitle}>Medie mensili {stats.year}</Text>
                {monthly && MONTHS_IT.map((m, i) => (
                  <View key={m} style={styles.monthRow}>
                    <Text style={styles.monthName}>{m}</Text>
                    {/* Temp bar */}
                    <View style={styles.monthBar}>
                      <View
                        style={[styles.monthBarFill, {
                          width: `${Math.max(5, Math.min(100, ((monthly[i].avgTemp + 5) / 40) * 100))}%`,
                          backgroundColor: monthly[i].avgTemp > 20 ? '#fb923c' : monthly[i].avgTemp > 10 ? '#4ade80' : '#38bdf8',
                        }]}
                      />
                    </View>
                    <Text style={styles.monthTemp}>
                      {monthly[i].avgTemp != null ? `${monthly[i].avgTemp}°C` : '—'}
                    </Text>
                    <Text style={styles.monthRain}>
                      {monthly[i].totalRain != null ? `${monthly[i].totalRain}mm` : '—'}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
    </AnimatedGradientBg>
  );
}

function makeStyles(c, dark) {
  return {
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, padding: 16 },
  title: { color: dark ? c.text : c.accent, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sub: { color: c.textMuted, fontSize: 14, marginBottom: 16 },
  yearScroll: { marginBottom: 16 },
  yearRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  yearChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, backgroundColor: c.bgCard, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  yearChipActive: { backgroundColor: c.accent + '22', borderColor: c.accent },
  yearLabel: { color: c.textMuted, fontWeight: '600' },
  yearLabelActive: { color: c.accent },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 16 },
  emptyText: { color: c.textMuted, textAlign: 'center', lineHeight: 22 },
  goSearchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: c.accent, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 12, marginTop: 4,
  },
  goSearchText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  center: { paddingTop: 60, alignItems: 'center', gap: 12 },
  loadingText: { color: c.textSub },
  provRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  provNote: { color: c.textMuted, fontSize: 11 },
  trendBlock: { marginBottom: 16 },
  trendRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: 6 },
  trendBar: { flex: 1, alignItems: 'center', gap: 2 },
  trendBarTrack: { height: 40, justifyContent: 'flex-end' },
  trendBarFill: { width: 10, borderRadius: 3, minHeight: 2 },
  trendBarLabel: { color: c.textMuted, fontSize: 9, fontWeight: '600' },
  trendYearLabel: { color: c.textMuted, fontSize: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: c.bgCard, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14 },
  statLabel: { color: c.textSub, fontSize: 12, marginBottom: 4 },
  statVal: { color: c.text, fontSize: 24, fontWeight: '700' },
  statDate: { color: c.textMuted, fontSize: 11, marginTop: 4 },
  sectionTitle: { color: c.textSub, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 8 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border },
  monthName: { color: c.textSub, width: 32, fontSize: 13, fontWeight: '600' },
  monthBar: { flex: 1, height: 8, backgroundColor: c.border, borderRadius: 4, overflow: 'hidden' },
  monthBarFill: { height: '100%', borderRadius: 4 },
  monthTemp: { color: c.text, width: 52, textAlign: 'right', fontSize: 13, fontWeight: '600' },
  monthRain: { color: c.accent, width: 52, textAlign: 'right', fontSize: 12 },
  };
}
