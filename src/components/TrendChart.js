/**
 * TREND CHART — mini-grafico tendenza (temperatura media annua)
 *
 * Una barra per anno nell'intervallo scelto (5/10/20/50 anni o "Tutto" dal
 * 1940). Colore = anomalia rispetto alla media del periodo mostrato (rosso
 * sopra, blu sotto). Tap su una barra seleziona quell'anno nel dettaglio
 * sotto, stesso effetto di un bottone preset.
 *
 * Una sola chiamata Archive API per l'intero intervallo (mai una per anno),
 * con cache locale 30 giorni in AsyncStorage per evitare ricariche quando si
 * torna su un intervallo già visto.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { fetchHistoricalRange } from '../services/aggregator';
import { MIN_YEAR, MAX_YEAR, avg, statsForYear } from '../utils/yearlyStats';

const CACHE_PREFIX = 'trend_chart_v1_';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

const RANGES = [
  { key: '5',   label: '5 anni' },
  { key: '10',  label: '10 anni' },
  { key: '20',  label: '20 anni' },
  { key: '50',  label: '50 anni' },
  { key: 'all', label: 'Tutto' },
];

function startYearFor(rangeKey) {
  if (rangeKey === 'all') return MIN_YEAR;
  return Math.max(MIN_YEAR, MAX_YEAR - parseInt(rangeKey, 10) + 1);
}

function cacheKeyFor(city, rangeKey) {
  return `${CACHE_PREFIX}${city.lat.toFixed(2)},${city.lon.toFixed(2)}_${rangeKey}`;
}

async function readCache(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { ts, daily } = JSON.parse(raw);
    if (!daily || Date.now() - ts > CACHE_TTL_MS) return null;
    return daily;
  } catch {
    return null;
  }
}
async function writeCache(key, daily) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ ts: Date.now(), daily }));
  } catch {
    // cache best-effort: un fallimento di scrittura non deve rompere il grafico
  }
}

export default function TrendChart({ cityInfo, selectedYear, onSelectYear }) {
  const { colors: c, dark } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [rangeKey, setRangeKey] = useState('10');
  const [loading, setLoading] = useState(false);
  const [yearlyAvgs, setYearlyAvgs] = useState([]);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (cityInfo?.lat != null && cityInfo?.lon != null) {
      loadRange(cityInfo, rangeKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityInfo?.lat, cityInfo?.lon, rangeKey]);

  const loadRange = async (city, rKey) => {
    setLoading(true);
    setErrored(false);
    const startYear = startYearFor(rKey);
    const key = cacheKeyFor(city, rKey);
    try {
      let daily = await readCache(key);
      if (!daily) {
        const data = await fetchHistoricalRange(city.lat, city.lon, startYear, MAX_YEAR);
        daily = data.daily;
        writeCache(key, daily);
      }
      const avgs = [];
      for (let y = startYear; y <= MAX_YEAR; y++) {
        const r = statsForYear(daily, y);
        avgs.push({ year: y, avgTemp: r?.stats?.meanAnnual ?? null });
      }
      setYearlyAvgs(avgs);
    } catch (e) {
      setErrored(true);
      setYearlyAvgs([]);
    } finally {
      setLoading(false);
    }
  };

  const values = yearlyAvgs.map(d => d.avgTemp).filter(x => x != null);
  const baseline = avg(values);
  const vMin = values.length ? Math.min(...values) : 0;
  const vMax = values.length ? Math.max(...values) : 1;
  const vRange = (vMax - vMin) || 1;

  return (
    <View style={styles.block}>
      <Text style={styles.title}>Tendenza — temperatura media annua</Text>

      {/* Selettore intervallo */}
      <View style={styles.rangeRow}>
        {RANGES.map(r => (
          <TouchableOpacity
            key={r.key}
            style={[styles.rangeChip, rangeKey === r.key && styles.rangeChipActive]}
            onPress={() => setRangeKey(r.key)}
            accessibilityRole="button"
            accessibilityLabel={`Intervallo ${r.label}`}
          >
            <Text style={[styles.rangeChipText, rangeKey === r.key && styles.rangeChipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={c.accent} />
          <Text style={styles.loadingText}>Caricamento tendenza…</Text>
        </View>
      ) : errored ? (
        <Text style={styles.errorText}>Tendenza non disponibile al momento.</Text>
      ) : !values.length ? (
        <Text style={styles.errorText}>Nessun dato per questo intervallo in questa località.</Text>
      ) : (
        <View style={styles.chartRow}>
          {yearlyAvgs.map((d, i) => {
            const isFirst = i === 0;
            const isLast = i === yearlyAvgs.length - 1;
            const sel = d.year === selectedYear;
            const h = d.avgTemp != null ? 4 + ((d.avgTemp - vMin) / vRange) * 46 : 2;
            const above = d.avgTemp != null && baseline != null && d.avgTemp > baseline;
            const barColor = d.avgTemp == null ? c.border : (above ? '#f87171' : '#38bdf8');
            return (
              <TouchableOpacity
                key={d.year}
                style={styles.barCol}
                onPress={() => onSelectYear?.(d.year)}
                accessibilityRole="button"
                accessibilityLabel={`Anno ${d.year}${d.avgTemp != null ? `, media ${d.avgTemp}°C` : ', dato non disponibile'}`}
              >
                <View style={styles.barTrack}>
                  <View style={[
                    styles.barFill,
                    { height: h, backgroundColor: barColor },
                    sel && { borderWidth: 1.5, borderColor: c.text },
                  ]} />
                </View>
                {(isFirst || isLast) && (
                  <Text style={[styles.barYearLabel, sel && { color: c.accent, fontWeight: '700' }]}>
                    {d.year}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function makeStyles(c) {
  return StyleSheet.create({
    block: { marginBottom: 16 },
    title: { color: c.textSub, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    rangeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
    rangeChip: { flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: c.bgCard, alignItems: 'center', borderWidth: 1, borderColor: c.border },
    rangeChipActive: { backgroundColor: c.accent + '22', borderColor: c.accent },
    rangeChipText: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
    rangeChipTextActive: { color: c.accent },
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 18, justifyContent: 'center' },
    loadingText: { color: c.textMuted, fontSize: 12 },
    errorText: { color: c.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 18 },
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 64, gap: 1 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
    barTrack: { flex: 1, justifyContent: 'flex-end', width: '100%', alignItems: 'center' },
    barFill: { width: '70%', maxWidth: 10, borderRadius: 2, minHeight: 2 },
    barYearLabel: { color: c.textMuted, fontSize: 9, marginTop: 2 },
  });
}
