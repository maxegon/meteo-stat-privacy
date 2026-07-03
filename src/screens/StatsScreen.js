import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AnimatedGradientBg from '../components/AnimatedGradientBg';
import { useTheme } from '../context/ThemeContext';

import { fetchHistoricalRange } from '../services/aggregator';
import ProviderBadge from '../components/ProviderBadge';
import { PROVIDERS } from '../services/providers';
import { useWeather } from '../context/WeatherContext';
import { MIN_YEAR, MAX_YEAR, round1, statsForYear } from '../utils/yearlyStats';
import TrendChart from '../components/TrendChart';

const MONTHS_IT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const thisYear = new Date().getFullYear();
const PRESET_YEARS = [thisYear-1, thisYear-2, thisYear-3, thisYear-4];
// Lista per il picker "Altro anno…", più recente per primo
const ALL_YEARS = Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MAX_YEAR - i);

export default function StatsScreen({ navigation }) {
  const { selectedCity: cityInfo } = useWeather();
  const [year, setYear] = useState(MAX_YEAR);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [showTrendInfo, setShowTrendInfo] = useState(false); // spiegazione barre rosse/blu del TrendChart
  const { colors: c, dark } = useTheme();
  const styles = useMemo(() => makeStyles(c, dark), [c, dark]);

  // Carica automaticamente appena c'è una città selezionata
  useEffect(() => {
    if (cityInfo && !stats && !loading) {
      loadYear(cityInfo, year);
    }
  }, [cityInfo]);

  const loadYear = async (city, y) => {
    if (!city) { Alert.alert('', 'Prima seleziona una città dalla scheda Meteo.'); return; }
    setLoading(true);
    try {
      // Un solo anno per richiesta: fetchHistoricalRange con startYear===endYear
      // restituisce esattamente i dati di quell'anno (stesso endpoint Archive API).
      const data = await fetchHistoricalRange(city.lat, city.lon, y, y);
      const result = statsForYear(data.daily, y);
      setStats(result?.stats ?? null);
      setMonthly(result?.monthly ?? null);
    } catch (e) {
      Alert.alert('Errore', 'Impossibile caricare i dati storici.');
    } finally {
      setLoading(false);
    }
  };

  const selectYear = (y) => {
    setYear(y);
    if (cityInfo) loadYear(cityInfo, y);
  };

  const isPreset = PRESET_YEARS.includes(year);

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return `${dt.getDate()} ${MONTHS_IT[dt.getMonth()]} ${dt.getFullYear()}`;
  };

  return (
    <AnimatedGradientBg>
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>📊 Statistiche Storiche</Text>
          <TouchableOpacity
            onPress={() => setShowTrendInfo(v => !v)}
            accessibilityRole="button"
            accessibilityLabel="Cosa indicano le barre del grafico"
            style={styles.titleInfoBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="information-outline" size={20} color={c.accent} />
          </TouchableOpacity>
        </View>
        {showTrendInfo && (
          <View style={styles.tooltipBox}>
            <Text style={styles.tooltipText}>
              Nel grafico sopra i bottoni anno, ogni barra è la temperatura media di quell'anno nell'intervallo scelto (5/10/20/50 anni o "Tutto"). Il colore indica lo scostamento dalla media dell'intero intervallo mostrato: 🔴 rosso = anno sopra la media del periodo, 🔵 blu = anno sotto la media del periodo. Tocca una barra per selezionare quell'anno nel dettaglio sotto.
            </Text>
          </View>
        )}
        <Text style={styles.sub}>Dati climatici annuali e mensili</Text>

        {/* Mini-grafico tendenza — sopra i bottoni anno, tap su una barra = seleziona anno */}
        {cityInfo && (
          <TrendChart
            cityInfo={cityInfo}
            selectedYear={year}
            onSelectYear={selectYear}
          />
        )}

        {/* 4 bottoni rapidi (ultimi 4 anni) */}
        <View style={styles.yearRow}>
          {PRESET_YEARS.map(y => (
            <TouchableOpacity
              key={y}
              style={[styles.yearBtn, year === y && styles.yearBtnActive]}
              onPress={() => selectYear(y)}
              accessibilityRole="button"
              accessibilityLabel={`Anno ${y}`}
            >
              <Text style={[styles.yearLabel, year === y && styles.yearLabelActive]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selettore "Altro anno…" — picker con lista 1940-{MAX_YEAR} */}
        <TouchableOpacity
          style={[styles.otherYearBtn, !isPreset && styles.otherYearBtnActive]}
          onPress={() => setPickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Scegli un altro anno"
        >
          <MaterialCommunityIcons name="calendar-search" size={16} color={!isPreset ? c.accent : c.textMuted} />
          <Text style={[styles.otherYearText, !isPreset && styles.otherYearTextActive]}>
            {!isPreset ? `Anno selezionato: ${year}` : 'Altro anno…'}
          </Text>
        </TouchableOpacity>

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
        ) : (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="cloud-off-outline" size={48} color="#38bdf8" />
            <Text style={styles.emptyText}>Nessun dato disponibile per il {year} in questa località.</Text>
          </View>
        )}
      </ScrollView>

      {/* Picker anno custom (1940 - {MAX_YEAR}) */}
      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <AnimatedGradientBg>
          <SafeAreaView style={styles.safe}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeaderTitle}>Scegli un anno</Text>
              <TouchableOpacity
                onPress={() => setPickerVisible(false)}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Chiudi"
              >
                <MaterialCommunityIcons name="close" size={20} color={c.accent} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={ALL_YEARS}
              keyExtractor={(y) => String(y)}
              initialScrollIndex={Math.max(0, ALL_YEARS.indexOf(year))}
              getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
              style={styles.modalList}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              renderItem={({ item: y }) => {
                const sel = y === year;
                return (
                  <TouchableOpacity
                    style={[styles.modalRow, sel && styles.modalRowActive]}
                    onPress={() => { setPickerVisible(false); selectYear(y); }}
                    accessibilityRole="button"
                    accessibilityLabel={`Anno ${y}`}
                  >
                    <Text style={[styles.modalRowText, sel && styles.modalRowTextActive]}>{y}</Text>
                    {sel && <MaterialCommunityIcons name="check" size={18} color={c.accent} />}
                  </TouchableOpacity>
                );
              }}
            />
          </SafeAreaView>
        </AnimatedGradientBg>
      </Modal>
    </SafeAreaView>
    </AnimatedGradientBg>
  );
}

function makeStyles(c, dark) {
  return {
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, padding: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 },
  title: { color: dark ? c.text : c.accent, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  titleInfoBtn: { padding: 2 },
  tooltipBox: { padding: 12, backgroundColor: c.bgCard, borderRadius: 10, borderWidth: 1, borderColor: c.border, marginBottom: 12 },
  tooltipText: { color: c.textSub, fontSize: 12, lineHeight: 18 },
  sub: { color: c.textMuted, fontSize: 14, marginBottom: 16, textAlign: 'center' },
  yearRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  yearBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: c.bgCard, alignItems: 'center', borderWidth: 1, borderColor: c.border },
  yearBtnActive: { backgroundColor: c.accent + '22', borderColor: c.accent },
  yearLabel: { color: c.textMuted, fontWeight: '600' },
  yearLabelActive: { color: c.accent },
  otherYearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: 10, backgroundColor: c.bgCard,
    borderWidth: 1, borderColor: c.border, marginBottom: 16,
  },
  otherYearBtnActive: { backgroundColor: c.accent + '22', borderColor: c.accent },
  otherYearText: { color: c.textMuted, fontWeight: '600', fontSize: 13 },
  otherYearTextActive: { color: c.accent },
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
  // Modal "Altro anno…"
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  modalHeaderTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
  closeBtn: {
    backgroundColor: c.bgCard, borderRadius: 20,
    padding: 6, borderWidth: 1, borderColor: c.border,
  },
  modalList: { flex: 1 },
  modalRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, height: 52, borderBottomWidth: 1, borderBottomColor: c.border,
  },
  modalRowActive: { backgroundColor: c.accent + '14' },
  modalRowText: { color: c.text, fontSize: 16, fontWeight: '600' },
  modalRowTextActive: { color: c.accent, fontWeight: '700' },
  };
}
