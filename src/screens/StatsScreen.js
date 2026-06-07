import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedGradientBg from '../components/AnimatedGradientBg';
import { useTheme } from '../context/ThemeContext';

import { fetchHistorical } from '../services/aggregator';
import ProviderBadge from '../components/ProviderBadge';
import { PROVIDERS } from '../services/providers';
import { useWeather } from '../context/WeatherContext';

const MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const thisYear = new Date().getFullYear();

function avg(arr) {
  const v = arr.filter(x => x != null);
  return v.length ? v.reduce((a,b) => a+b,0) / v.length : null;
}
function round1(n) { return n != null ? Math.round(n * 10) / 10 : null; }

export default function StatsScreen({ navigation }) {
  const { selectedCity: cityInfo } = useWeather();
  const [year, setYear] = useState(thisYear - 1);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const { colors: c, dark } = useTheme();
  const styles = useMemo(() => makeStyles(c, dark), [c, dark]);

  // Carica automaticamente appena c'è una città selezionata
  useEffect(() => {
    if (cityInfo && !stats && !loading) {
      loadStats(cityInfo, thisYear - 1);
    }
  }, [cityInfo]);

  const loadStats = async (city, y) => {
    if (!city) { Alert.alert('', 'Prima seleziona una città dalla scheda Meteo.'); return; }
    setLoading(true);
    try {
      const data = await fetchHistorical(city.lat, city.lon, y);
      processStats(data, y);
    } catch (e) {
      Alert.alert('Errore', 'Impossibile caricare i dati storici.');
    } finally {
      setLoading(false);
    }
  };

  const processStats = (data, y) => {
    const d = data.daily;
    const maxT = d.temperature_2m_max;
    const minT = d.temperature_2m_min;
    const meanT = d.temperature_2m_mean;
    const rain = d.precipitation_sum;

    const absMax = Math.max(...maxT.filter(Boolean));
    const absMin = Math.min(...minT.filter(Boolean));
    const idxMax = maxT.indexOf(absMax);
    const idxMin = minT.indexOf(absMin);

    setStats({
      year: y,
      absMax, absMin,
      dateMax: d.time[idxMax],
      dateMin: d.time[idxMin],
      meanAnnual: round1(avg(meanT)),
      totalRain: round1(rain.reduce((a,b) => a + (b||0), 0)),
      rainDays: rain.filter(x => x >= 1).length,
      hotDays: maxT.filter(x => x >= 30).length,
      coldDays: minT.filter(x => x <= 0).length,
    });

    // Aggregazione mensile
    const m = Array(12).fill(null).map(() => ({ temps: [], rain: 0 }));
    d.time.forEach((t, i) => {
      const mo = new Date(t).getMonth();
      if (meanT[i] != null) m[mo].temps.push(meanT[i]);
      if (rain[i] != null) m[mo].rain += rain[i];
    });
    setMonthly(m.map(mo => ({
      avgTemp: round1(avg(mo.temps)),
      totalRain: round1(mo.rain),
    })));
  };

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
        <Text style={styles.sub}>Dati climatici annuali e mensili</Text>

        {/* Year selector */}
        <View style={styles.yearRow}>
          {[thisYear-1, thisYear-2, thisYear-3, thisYear-4].map(y => (
            <TouchableOpacity
              key={y}
              style={[styles.yearBtn, year === y && styles.yearBtnActive]}
              onPress={() => { setYear(y); if (cityInfo) loadStats(cityInfo, y); }}
            >
              <Text style={[styles.yearLabel, year === y && styles.yearLabelActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
            <Text style={styles.loadingText}>Caricamento dati {year}...</Text>
          </View>
        ) : stats ? (
          <>
            <View style={styles.provRow}>
              <ProviderBadge provider={PROVIDERS.OPEN_METEO} size="md" />
              <Text style={styles.provNote}>Archive API — dati ERA5/ECMWF</Text>
            </View>

            {/* Summary stats */}
            <View style={styles.grid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>🌡️ Max assoluta</Text>
                <Text style={[styles.statVal, { color: '#fb923c' }]}>{round1(stats.absMax)}°C</Text>
                <Text style={styles.statDate}>{formatDate(stats.dateMax)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>🥶 Min assoluta</Text>
                <Text style={[styles.statVal, { color: '#38bdf8' }]}>{round1(stats.absMin)}°C</Text>
                <Text style={styles.statDate}>{formatDate(stats.dateMin)}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>📊 Media annuale</Text>
                <Text style={styles.statVal}>{stats.meanAnnual}°C</Text>
                <Text style={styles.statDate}>Temperatura media giornaliera</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>🌧️ Pioggia totale</Text>
                <Text style={[styles.statVal, { color: '#38bdf8' }]}>{stats.totalRain} mm</Text>
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
  yearRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  yearBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: c.bgCard, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  yearBtnActive: { backgroundColor: c.accent + '22', borderColor: c.accent },
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
