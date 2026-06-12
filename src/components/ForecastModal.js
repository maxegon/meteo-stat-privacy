import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import AnimatedGradientBg from './AnimatedGradientBg';
import { useTheme } from '../context/ThemeContext';
import { translateDescription } from '../utils/weatherDescriptions';
import WeatherIcon from './WeatherIcon';
import { windDirArrow, windDirLabel } from '../utils/windDir';

const DAYS_IT   = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MONTHS_IT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];

function formatHour(timeStr) { return timeStr.replace('T', ' ').slice(11, 16); }
function formatDayShort(dateStr, index) {
  if (index === 0) return 'Oggi';
  // NB: non usare 'Dom' per index===1 — è l'abbreviazione di Domenica e
  // creava etichette sbagliate (es. "Dom" su un giovedì). Usiamo sempre
  // il giorno della settimana reale calcolato dalla data.
  const d = new Date(dateStr);
  return DAYS_IT[d.getDay()];
}
function formatDayFull(dateStr, index) {
  if (index === 0) return 'Oggi';
  if (index === 1) return 'Domani';
  const d = new Date(dateStr);
  return `${DAYS_IT[d.getDay()]} ${d.getDate()} ${MONTHS_IT[d.getMonth()]}`;
}
function getDateStr(timeStr) { return timeStr.replace('T', ' ').slice(0, 10); }
function getHour(timeStr)    { return parseInt(timeStr.replace('T', ' ').slice(11, 13), 10); }
function fascia(hr) {
  if (hr < 6)  return 'Notte';
  if (hr < 12) return 'Mattina';
  if (hr < 18) return 'Pomeriggio';
  return 'Sera';
}

function seaStateFromWind(kmh) {
  if (kmh == null || isNaN(kmh)) return null;
  if (kmh <  2) return 'Calmo';
  if (kmh <  6) return 'Quasi calmo';
  if (kmh < 12) return 'Poco increspato';
  if (kmh < 20) return 'Leggermente mosso';
  if (kmh < 29) return 'Mosso';
  if (kmh < 39) return 'Molto mosso';
  if (kmh < 50) return 'Agitato';
  if (kmh < 62) return 'Molto agitato';
  if (kmh < 75) return 'Grosso';
  if (kmh < 89) return 'Molto grosso';
  return 'Tempestoso';
}
function beaufortLabel(kmh) {
  if (kmh < 2)   return 'Calma';
  if (kmh < 12)  return 'Brezza leggera';
  if (kmh < 20)  return 'Brezza';
  if (kmh < 29)  return 'Brezza moderata';
  if (kmh < 39)  return 'Brezza vivace';
  if (kmh < 50)  return 'Vento fresco';
  if (kmh < 62)  return 'Vento forte';
  return 'Vento molto forte';
}
function beaufortColor(kmh) {
  if (kmh < 20)  return '#22c55e';
  if (kmh < 39)  return '#fbbf24';
  if (kmh < 62)  return '#fb923c';
  return '#f87171';
}

const FASCIA_ORDER       = ['Notte', 'Mattina', 'Pomeriggio', 'Sera'];
const FASCIA_COLOR_DARK  = { Notte: '#818cf8', Mattina: '#fbbf24', Pomeriggio: '#fb923c', Sera: '#c084fc' };
const FASCIA_COLOR_LIGHT = { Notte: '#3730a3', Mattina: '#b45309', Pomeriggio: '#c2410c', Sera: '#6d28d9' };
const FASCIA_ICON        = { Notte: 'weather-night', Mattina: 'weather-sunny', Pomeriggio: 'white-balance-sunny', Sera: 'weather-night-partly-cloudy' };

/**
 * Grafico andamento temperatura prossime 24h.
 * Usa i valori orari già aggregati (media multi-provider, vedi buildAggregateHourly
 * in HomeScreen.js — CLAUDE.md "Regole intoccabili"): si rigenera automaticamente
 * ogni volta che `hourly` viene aggiornato (auto-refresh dati ogni 24h/al rientro app).
 */
function MiniTrendChart({ hourly, dark, T, width }) {
  const nowTs = Date.now();
  const points = (hourly || [])
    .filter(h => new Date(h.time).getTime() > nowTs && h.temp != null)
    .slice(0, 24);

  if (points.length < 2) return null;

  const W = width;
  const H = 100;
  const PAD_X = 18;
  const PAD_TOP = 22;
  const PAD_BOTTOM = 24;

  const temps = points.map(p => p.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const range = (max - min) || 1;
  const stepX = (W - PAD_X * 2) / (points.length - 1);
  const innerH = H - PAD_TOP - PAD_BOTTOM;

  const coords = points.map((p, i) => ({
    x: PAD_X + i * stepX,
    y: PAD_TOP + (1 - (p.temp - min) / range) * innerH,
    temp: p.temp,
    time: p.time,
  }));

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ');
  const lineColor = T.tempColor;
  const labelColor = T.muted;

  // Etichette ora: una ogni ~3 punti (circa ogni 3h) per non affollare
  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  return (
    <View style={[styles.chartCard, { backgroundColor: T.dividerCard, borderColor: T.divider }]}>
      <View style={styles.chartHeader}>
        <MaterialCommunityIcons name="chart-line" size={14} color={T.main} />
        <Text style={[styles.chartTitle, { color: T.main }]}>Andamento temperatura — prossime 24h</Text>
      </View>
      <Svg width={W} height={H}>
        {/* Linea base (asse) */}
        <Line x1={PAD_X} y1={H - PAD_BOTTOM} x2={W - PAD_X} y2={H - PAD_BOTTOM} stroke={T.divider} strokeWidth={1} />
        {/* Curva temperatura */}
        <Path d={pathD} stroke={lineColor} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c, i) => (
          <React.Fragment key={i}>
            <Circle cx={c.x} cy={c.y} r={2.5} fill={lineColor} />
            {(i % labelStep === 0 || i === coords.length - 1) && (
              <>
                <SvgText x={c.x} y={c.y - 8} fontSize="10" fontWeight="700" fill={lineColor} textAnchor="middle">
                  {Math.round(c.temp)}°
                </SvgText>
                <SvgText x={c.x} y={H - 6} fontSize="9" fill={labelColor} textAnchor="middle">
                  {formatHour(c.time)}
                </SvgText>
              </>
            )}
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

/**
 * Grafico precipitazioni prossime 24h (barre, mm orari).
 * Usa `precipMm` già aggregato/mediato multi-provider (buildAggregateHourly,
 * vedi CLAUDE.md "Regole intoccabili") — nessuna nuova logica di media.
 */
function MiniRainChart({ hourly, dark, T, width }) {
  const nowTs = Date.now();
  const points = (hourly || [])
    .filter(h => new Date(h.time).getTime() > nowTs)
    .slice(0, 24);

  if (points.length < 2) return null;

  const W = width;
  const H = 100;
  const PAD_X = 18;
  const PAD_TOP = 22;
  const PAD_BOTTOM = 24;

  const vals  = points.map(p => p.precipMm ?? 0);
  const max   = Math.max(...vals, 1); // minimo 1mm per dare scala anche se tutto a zero
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const stepX = (W - PAD_X * 2) / points.length;
  const barW  = Math.max(2, stepX * 0.5);
  const labelStep = Math.max(1, Math.ceil(points.length / 8));
  const barColor   = T.rainColor;
  const labelColor = T.muted;

  return (
    <View style={[styles.chartCard, { backgroundColor: T.dividerCard, borderColor: T.divider }]}>
      <View style={styles.chartHeader}>
        <MaterialCommunityIcons name="weather-pouring" size={14} color={T.main} />
        <Text style={[styles.chartTitle, { color: T.main }]}>Pioggia — prossime 24h</Text>
      </View>
      <Svg width={W} height={H}>
        {/* Linea base (asse) */}
        <Line x1={PAD_X} y1={H - PAD_BOTTOM} x2={W - PAD_X} y2={H - PAD_BOTTOM} stroke={T.divider} strokeWidth={1} />
        {points.map((p, i) => {
          const val  = vals[i];
          const x    = PAD_X + i * stepX + (stepX - barW) / 2;
          const barH = (val / max) * innerH;
          const y    = H - PAD_BOTTOM - barH;
          const showLabel = i % labelStep === 0 || i === points.length - 1;
          return (
            <React.Fragment key={i}>
              {val > 0 && <Rect x={x} y={y} width={barW} height={barH} rx={2} fill={barColor} />}
              {showLabel && (
                <>
                  {val > 0 && (
                    <SvgText x={x + barW / 2} y={Math.max(y - 4, PAD_TOP - 8)} fontSize="9" fontWeight="700" fill={barColor} textAnchor="middle">
                      {val.toFixed(1)}
                    </SvgText>
                  )}
                  <SvgText x={x + barW / 2} y={H - 6} fontSize="9" fill={labelColor} textAnchor="middle">
                    {formatHour(p.time)}
                  </SvgText>
                </>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

export default function ForecastModal({ visible, onClose, data, title, color, initialDay = 0, marine }) {
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const inlineScrollRef    = useRef(null);
  const inlineDayOffsetsRef = useRef([]);

  useEffect(() => {
    if (visible) {
      setSelectedDay(initialDay);
      // Scroll to the correct day after layout settles
      setTimeout(() => {
        const x = inlineDayOffsetsRef.current[initialDay];
        if (x != null) inlineScrollRef.current?.scrollTo({ x, animated: false });
      }, 150);
    }
  }, [visible, initialDay]);

  const { colors, dark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  if (!visible || !data) return null;
  const { current, hourly, daily } = data;
  const c = color || colors.accent;

  const T = {
    main:        dark ? '#ffffff'                 : '#0369a1',
    sub:         dark ? '#ffffff'                 : 'rgba(3,105,161,0.90)',
    muted:       dark ? '#e2e8f0'                 : 'rgba(3,105,161,0.75)',
    chipBg:      dark ? 'rgba(0,0,0,0.30)'        : 'rgba(3,105,161,0.08)',
    dayBg:       dark ? 'rgba(0,0,0,0.20)'        : 'rgba(3,105,161,0.07)',
    dayBorder:   dark ? 'rgba(255,255,255,0.45)'  : 'rgba(3,105,161,0.25)',
    divider:     dark ? 'rgba(255,255,255,0.30)'  : 'rgba(3,105,161,0.15)',
    rainColor:   dark ? '#bae6fd'                 : '#0369a1',
    closeBg:     dark ? 'rgba(0,0,0,0.25)'        : 'rgba(3,105,161,0.06)',
    closeBorder: dark ? 'rgba(255,255,255,0.30)'  : 'rgba(3,105,161,0.15)',
    cyan:        dark ? '#a5f3fc'                 : '#0369a1',
    wind:        dark ? '#bae6fd'                 : '#0369a1',
    tempColor:   dark ? '#ffffff'                 : '#0284c7',
    dividerCard: dark ? 'rgba(255,255,255,0.09)'  : 'rgba(3,105,161,0.10)',
    fonti:       dark ? '#4ade80'                 : '#16a34a',
  };
  const FASCIA_COLOR = dark ? FASCIA_COLOR_DARK : FASCIA_COLOR_LIGHT;

  const nowHour = new Date().getHours();
  const nowTs   = new Date();

  // Raggruppa hourly per giorno → fascia
  const hourlyByDay = {};
  (hourly || []).forEach(h => {
    const date = getDateStr(h.time);
    const hr   = getHour(h.time);
    const f    = fascia(hr);
    if (!hourlyByDay[date]) hourlyByDay[date] = { Notte: [], Mattina: [], Pomeriggio: [], Sera: [] };
    hourlyByDay[date][f].push(h);
  });

  // Gestiamo il tap su un giorno — scrolliamo nella timeline
  const handleDayPress = (i) => {
    setSelectedDay(i);
    const x = inlineDayOffsetsRef.current[i];
    if (x != null) inlineScrollRef.current?.scrollTo({ x, animated: true });
  };

  // Aggiorna selectedDay in base alla posizione di scroll
  const handleTimelineScroll = (e) => {
    const x = e.nativeEvent.contentOffset.x;
    const offsets = inlineDayOffsetsRef.current;
    let newDay = 0;
    for (let i = offsets.length - 1; i >= 0; i--) {
      if (x >= offsets[i] - 30) { newDay = i; break; }
    }
    if (newDay !== selectedDay) setSelectedDay(newDay);
  };

  return (
    <View style={styles.overlay}>
      <AnimatedGradientBg>
        <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>

          {/* ── HEADER ── */}
          <View style={[styles.topBar, { borderBottomColor: T.divider }]}>
            <Text style={[styles.providerTitle, { color: T.main }]}>{title}</Text>
          </View>

          {/* ── Condizioni attuali (compatte) ── */}
          {current && (
            <View style={styles.currentCard}>
              <View style={styles.currentLeft}>
                <WeatherIcon name={current.icon || 'weather-partly-cloudy'} size={52} dark={dark} />
                <View style={styles.currentTexts}>
                  <Text style={[styles.currentTemp, { color: T.tempColor }]}>{Math.round(current.temperature)}°C</Text>
                  <Text style={[styles.currentDesc, { color: T.sub }]}>{translateDescription(current.description)}</Text>
                </View>
              </View>
              <View style={styles.currentMeta}>
                {current.feelsLike != null && <Text style={[styles.metaChip, { color: T.sub, backgroundColor: T.chipBg }]}>🌡 {Math.round(current.feelsLike)}°</Text>}
                {current.humidity  != null && <Text style={[styles.metaChip, { color: T.sub, backgroundColor: T.chipBg }]}>💧 {Math.round(current.humidity)}%</Text>}
                {current.windspeed != null && <Text style={[styles.metaChip, { color: T.sub, backgroundColor: T.chipBg }]}>💨 {Math.round(current.windspeed)} km/h</Text>}
              </View>
            </View>
          )}

          {/* ── Strip giorni — sincronizzata con la timeline ── */}
          {daily?.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={[styles.dayStrip, { borderBottomColor: T.divider }]}
              contentContainerStyle={styles.dayStripContent}
            >
              {daily.map((day, i) => {
                const sel = selectedDay === i;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.dayChip,
                      { backgroundColor: T.dayBg, borderColor: T.dayBorder },
                      sel && { backgroundColor: dark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.12)', borderColor: c },
                    ]}
                    onPress={() => handleDayPress(i)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayChipLabel, { color: sel ? c : T.muted }]}>
                      {formatDayShort(day.date, i)}
                    </Text>
                    <WeatherIcon name={day.icon || 'weather-partly-cloudy'} size={26} dark={dark} />
                    <Text style={[styles.dayChipMax, { color: T.tempColor }]}>{Math.round(day.tempMax)}°</Text>
                    <Text style={[styles.dayChipMin, { color: T.tempColor }]}>{Math.round(day.tempMin)}°</Text>
                    {/* Riga pioggia sempre presente — stessa disposizione/altezza per tutte le card */}
                    <Text style={[styles.dayChipRain, { color: T.rainColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                      💧{day.precipProbability > 0 ? `${Math.round(day.precipProbability)}%` : '0%'}{day.precipitation > 0 ? ` · ${day.precipitation.toFixed(1)}mm` : ''}
                    </Text>
                    {/* INVARIANTE — vedi CLAUDE.md "Regole intoccabili": contatore fonti obbligatorio */}
                    {day.providerCount != null && (
                      <Text style={[styles.dayChipFonti, { color: T.fonti }]}>
                        {day.providerCount > 1 ? `${day.providerCount}f` : 'OM'}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* ── Nota fonti ── */}
          <View style={styles.attribRow}>
            <MaterialCommunityIcons name="information-outline" size={10} color={T.muted} />
            <Text style={[styles.attribText, { color: T.muted }]}>
              I provider si riducono con i giorni · oltre il giorno 10 restano solo Open-Meteo e Visual Crossing
            </Text>
          </View>

          {/* ── Timeline continua — tutti i giorni in un'unica riga orizzontale ── */}
          <ScrollView
            ref={inlineScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleTimelineScroll}
            style={styles.timeline}
            contentContainerStyle={styles.timelineContent}
          >
            {(daily || []).map((day, dayIdx) => {
              const dayDate = day.date;
              const rawSlots = hourlyByDay[dayDate] || {};

              // Per oggi filtra le ore già passate
              const daySlots = dayIdx === 0
                ? Object.fromEntries(
                    Object.entries(rawSlots).map(([f, slots]) => [
                      f, slots.filter(h => new Date(h.time) > nowTs),
                    ])
                  )
                : rawSlots;

              // Fascia di partenza per oggi
              const currentFascia   = fascia(nowHour);
              const fasciaStartIdx  = dayIdx === 0 ? FASCIA_ORDER.indexOf(currentFascia) : 0;
              const dayFasciaOrder  = dayIdx === 0 ? FASCIA_ORDER.slice(fasciaStartIdx) : FASCIA_ORDER;
              const hasData         = dayFasciaOrder.some(f => daySlots[f]?.length > 0);

              // Info mare per questo giorno
              const dayMarineHours = marine?.hourly?.filter(m => m.time?.slice(0, 10) === dayDate) || [];
              const validWaves     = dayMarineHours.filter(m => m.waveHeight != null && !isNaN(m.waveHeight));
              const waveH = dayIdx === 0 && marine?.current?.waveHeight != null
                ? marine.current.waveHeight
                : validWaves.length ? validWaves.reduce((a, b) => a + b.waveHeight, 0) / validWaves.length : null;
              const windKmh = day.windMax ?? day.windspeed;

              return (
                <React.Fragment key={dayIdx}>
                  {/* ── Separatore giorno ── */}
                  <View
                    style={[styles.dayDivider, { backgroundColor: T.dividerCard, borderColor: T.divider }]}
                    onLayout={e => { inlineDayOffsetsRef.current[dayIdx] = e.nativeEvent.layout.x; }}
                  >
                    <Text style={[styles.dayDivLabel, { color: T.main }]}>{formatDayFull(day.date, dayIdx)}</Text>
                    {/* Riga 1: icona + temp max/min affiancate */}
                    <View style={styles.dayDivTopRow}>
                      <WeatherIcon name={day.icon || 'weather-partly-cloudy'} size={26} dark={dark} />
                      <Text style={[styles.dayDivTemp, { color: T.tempColor }]}>
                        {Math.round(day.tempMax)}°<Text style={[styles.dayDivTempMin, { color: T.muted }]}>/{Math.round(day.tempMin)}°</Text>
                      </Text>
                    </View>
                    {/* Riga pioggia sempre presente — stessa disposizione/altezza per tutte le card */}
                    <Text style={[styles.dayDivMeta, { color: T.rainColor }]}>
                      💧 {day.precipProbability > 0 ? `${Math.round(day.precipProbability)}%` : '0%'}{day.precipitation > 0 ? ` · ${day.precipitation.toFixed(1)}mm` : ''}
                    </Text>
                    {/* Riga: alba/tramonto affiancati */}
                    {(day.sunrise || day.sunset) && (
                      <View style={styles.dayDivRow2col}>
                        {day.sunrise && <Text style={[styles.dayDivMetaSm, { color: T.muted }]}>🌄 {day.sunrise.slice(-5)}</Text>}
                        {day.sunset  && <Text style={[styles.dayDivMetaSm, { color: T.muted }]}>🌇 {day.sunset.slice(-5)}</Text>}
                      </View>
                    )}
                    {/* Riga: vento + scala Beaufort sulla stessa riga */}
                    {windKmh != null && (
                      <Text style={[styles.dayDivMeta, { color: T.wind }]}>
                        💨 {Math.round(windKmh)} km/h · {beaufortLabel(windKmh)}
                      </Text>
                    )}
                    {/* Riga: onde + badge fonti affiancati */}
                    {/* INVARIANTE — vedi CLAUDE.md "Regole intoccabili": contatore fonti obbligatorio */}
                    {(waveH != null || day.providerCount != null) && (
                      <View style={styles.dayDivRow2col}>
                        {waveH != null && (
                          <Text style={[styles.dayDivMetaSm, { color: T.cyan }]}>🌊 {waveH.toFixed(1)} m</Text>
                        )}
                        {day.providerCount != null && (
                          <View style={[styles.dayDivFontiBadge, { backgroundColor: dark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.10)' }]}>
                            <Text style={[styles.dayDivFontiText, { color: T.fonti }]}>
                              {day.providerCount > 1 ? `${day.providerCount} fonti` : 'Open-Meteo'}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                    {!hasData && (
                      <Text style={[styles.dayDivNoData, { color: T.muted }]}>nessun dato orario</Text>
                    )}
                  </View>

                  {/* ── Fasce orarie del giorno ── */}
                  {dayFasciaOrder.map(f => {
                    const slots = daySlots[f];
                    if (!slots?.length) return null;
                    // Filtra ogni 2 ore (ore pari, coerente con tutte le altre schermate) —
                    // SEMPRE, anche se c'è probabilità di pioggia (non aggiungere eccezioni qui,
                    // altrimenti tornano le ore dispari come già successo in passato)
                    const filtered = slots.filter(h => getHour(h.time) % 2 === 0);
                    if (!filtered.length) return null;
                    const sunInfo =
                      f === 'Mattina' && day.sunrise ? { emoji: '🌄', time: day.sunrise.slice(-5) } :
                      f === 'Sera'    && day.sunset  ? { emoji: '🌇', time: day.sunset.slice(-5) }  :
                      null;
                    return (
                      <React.Fragment key={f}>
                        {/* Etichetta fascia — stessa dimensione delle card orarie */}
                        <View style={[styles.hourCard, styles.fasciaLabelCard, { backgroundColor: T.dividerCard, borderLeftColor: FASCIA_COLOR[f], borderLeftWidth: 2 }]}>
                          <MaterialCommunityIcons name={FASCIA_ICON[f]} size={18} color={FASCIA_COLOR[f]} />
                          <Text style={[styles.fasciaName, { color: FASCIA_COLOR[f] }]} numberOfLines={2} adjustsFontSizeToFit>{f}</Text>
                          {sunInfo && <Text style={styles.fasciaSunTime}>{sunInfo.emoji} {sunInfo.time}</Text>}
                        </View>
                        {/* Card orarie */}
                        {filtered.map((h, j) => (
                          <View key={j} style={[styles.hourCard, { backgroundColor: T.dividerCard, borderWidth: 1, borderColor: T.divider }]}>
                            <Text style={[styles.hourTime, { color: T.muted }]}>{formatHour(h.time)}</Text>
                            <WeatherIcon name={h.icon || 'weather-partly-cloudy'} size={32} dark={dark} />
                            <Text style={[styles.hourTemp, { color: T.tempColor }]}>{Math.round(h.temp)}°</Text>
                            <View style={styles.hourMetaRow}>
                              {h.humidity != null && !isNaN(h.humidity) && <Text style={[styles.hourSub, { color: T.wind }]}>💧{Math.round(h.humidity)}%</Text>}
                              <Text style={[styles.hourSub, { color: T.rainColor }]}>🌧{h.precipProb != null ? Math.round(h.precipProb) : 0}%{h.precipMm > 0 ? ` · ${h.precipMm.toFixed(1)}mm` : ''}</Text>
                            </View>
                            {h.windspeed != null && (
                              <View style={styles.hourWindRow}>
                                <MaterialCommunityIcons name="weather-windy" size={10} color="#7dd3fc" />
                                <Text style={[styles.hourWindSub, { color: T.wind }]}>
                                  {Math.round(h.windspeed)}{h.winddir != null ? ` ${windDirArrow(h.winddir)}` : ''}
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
          </ScrollView>

          {/* ── Grafici andamento 24h (si rigenerano con i dati orari aggregati) ── */}
          {/* width = larghezza modale (screenWidth - 32 di marginHorizontal) - padding interno della card (8+8) */}
          <MiniRainChart  hourly={hourly} dark={dark} T={T} width={screenWidth - 48} />
          <MiniTrendChart hourly={hourly} dark={dark} T={T} width={screenWidth - 48} />

          {/* ── Tasto chiudi ── */}
          <SafeAreaView edges={['bottom']} style={[styles.bottomBar, { backgroundColor: T.closeBg, borderTopColor: T.closeBorder }]}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <MaterialCommunityIcons name="chevron-down" size={20} color={T.main} />
              <Text style={[styles.closeBtnText, { color: T.main }]}>Chiudi</Text>
            </TouchableOpacity>
          </SafeAreaView>

        </SafeAreaView>
      </AnimatedGradientBg>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  safe:    { flex: 1, backgroundColor: 'transparent' },

  // Header
  topBar: {
    alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  providerTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },

  // Condizioni attuali — compatte
  currentCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  currentLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currentTexts: { gap: 2 },
  currentTemp:  { fontSize: 36, fontWeight: '700', lineHeight: 40 },
  currentDesc:  { fontSize: 12, textTransform: 'capitalize' },
  currentMeta:  { gap: 5, alignItems: 'flex-end' },
  metaChip:     { fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  // Strip giorni
  // Altezza esplicita = dayChip.height (160) + paddingVertical del content (8+8).
  // Senza altezza fissa la ScrollView orizzontale restava ancorata alla vecchia
  // altezza (più bassa) e le card da 160px venivano tagliate in basso.
  dayStrip: { flexGrow: 0, flexShrink: 0, height: 176, borderBottomWidth: 1 },
  dayStripContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 7 },
  dayChip: {
    alignItems: 'center', justifyContent: 'space-evenly', gap: 2, paddingVertical: 7, paddingHorizontal: 6,
    borderRadius: 12, borderWidth: 1, width: 72, height: 160,
  },
  dayChipLabel: { fontSize: 10, fontWeight: '700' },
  dayChipMax:   { fontWeight: '700', fontSize: 12 },
  dayChipMin:   { fontSize: 11 },
  dayChipRain:  { fontSize: 9 },
  dayChipFonti: { fontSize: 8, fontWeight: '700' },

  // Nota fonti
  attribRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 5 },
  attribText: { fontSize: 9, fontStyle: 'italic', flex: 1 },

  // Timeline continua — altezza esplicita = dayDivider/hourCard.height (160) + marginVertical (2+2).
  // Stesso problema dello strip giorni: senza altezza fissa le card da 160px
  // venivano tagliate in basso.
  timeline: { flexGrow: 0, flexShrink: 0, height: 164 },
  timelineContent: { alignItems: 'flex-start' },

  // Separatore giorno
  dayDivider: {
    width: 172, height: 160, justifyContent: 'space-evenly',
    alignItems: 'stretch', gap: 2,
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 12, borderWidth: 1,
    marginHorizontal: 3, marginVertical: 2,
  },
  dayDivLabel:    { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  dayDivTopRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  dayDivRow2col:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', gap: 8, marginTop: 2 },
  dayDivTemp:     { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  dayDivTempMin:  { fontSize: 14, fontWeight: '400' },
  dayDivMeta:     { fontSize: 11, textAlign: 'center' },
  dayDivMetaSm:   { fontSize: 10, textAlign: 'center' },
  dayDivFontiBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  dayDivFontiText:  { fontSize: 10, fontWeight: '700' },
  dayDivNoData:     { fontSize: 9, fontStyle: 'italic', textAlign: 'center', marginTop: 4 },

  // Fascia label card — stessa dimensione delle card orarie
  fasciaLabelCard: {
    justifyContent: 'center', gap: 4,
  },
  fasciaName:    { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', textAlign: 'center', letterSpacing: 0.4 },
  fasciaSunTime: { fontSize: 10, color: 'rgba(255,255,255,0.60)', textAlign: 'center' },

  // Card oraria
  hourCard: {
    paddingVertical: 10, paddingHorizontal: 10,
    alignItems: 'center', justifyContent: 'center', gap: 3, minWidth: 72, height: 160,
    borderRadius: 12, marginHorizontal: 3, marginVertical: 2,
  },
  hourTime:    { fontSize: 11, fontWeight: '700' },
  hourTemp:    { fontSize: 20, fontWeight: '700' },
  hourMetaRow: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  hourSub:     { fontSize: 10, fontWeight: '700' },
  hourWindRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  hourWindSub: { fontSize: 10 },

  // Barra chiudi
  bottomBar: { borderTopWidth: 1 },
  closeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14,
  },
  closeBtnText: { fontSize: 16, fontWeight: '600' },

  // Grafico andamento 24h
  chartCard: {
    marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    borderRadius: 12, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 8,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, marginLeft: 4 },
  chartTitle: { fontSize: 11, fontWeight: '700' },
});
