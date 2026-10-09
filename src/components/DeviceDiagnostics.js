import React from 'react';
import { View, Text, StyleSheet, Platform, Dimensions, PixelRatio, StatusBar } from 'react-native';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Updates from 'expo-updates';

// Pannello diagnostico dispositivo (Info → 5 tap sulla versione). Serve a
// capire da screenshot se gira un OTA e quali inset/font scale vede Android
// (caso Galaxy A55: tab bar coperta dai 3 tasti, vedi HANDOFF 2026-10-09).
const fmt = (n) => (typeof n === 'number' ? (Math.round(n * 100) / 100).toString() : '—');

export default function DeviceDiagnostics() {
  const insets = useSafeAreaInsets();
  let tabH = null;
  try { tabH = useBottomTabBarHeight(); } catch (_) {}
  const win = Dimensions.get('window');
  const scr = Dimensions.get('screen');
  const init = initialWindowMetrics?.insets;
  const rows = [
    ['— Aggiornamenti —', null],
    ['OTA attivo (isEnabled)', String(Updates.isEnabled)],
    ['Bundle', Updates.isEmbeddedLaunch ? 'EMBEDDED (binario, nessun OTA)' : 'OTA scaricato'],
    ['updateId', Updates.updateId ?? '—'],
    ['createdAt', Updates.createdAt ? new Date(Updates.createdAt).toISOString() : '—'],
    ['channel', Updates.channel ?? '—'],
    ['runtimeVersion', Updates.runtimeVersion ?? '—'],
    ['— Inset / layout —', null],
    ['Piattaforma', `${Platform.OS} ${Platform.Version}`],
    ['insets hook (T/B/L/R)', `${fmt(insets.top)}/${fmt(insets.bottom)}/${fmt(insets.left)}/${fmt(insets.right)}`],
    ['insets iniziali (T/B/L/R)', init ? `${fmt(init.top)}/${fmt(init.bottom)}/${fmt(init.left)}/${fmt(init.right)}` : 'null'],
    ['bottom applicato (formula)', Platform.OS === 'android' ? fmt(Math.max(insets.bottom, init?.bottom ?? 0, 48)) : fmt(insets.bottom)],
    ['altezza tab bar reale', fmt(tabH)],
    ['StatusBar.currentHeight', fmt(StatusBar.currentHeight)],
    ['window (w×h)', `${fmt(win.width)}×${fmt(win.height)}`],
    ['screen (w×h)', `${fmt(scr.width)}×${fmt(scr.height)}`],
    ['— Scala —', null],
    ['fontScale', fmt(PixelRatio.getFontScale())],
    ['pixelRatio (densità)', fmt(PixelRatio.get())],
    ['window.fontScale / scale', `${fmt(win.fontScale)} / ${fmt(win.scale)}`],
  ];
  return (
    <View style={s.box}>
      <Text style={s.title}>Dispositivo</Text>
      {rows.map(([k, v], i) => v === null
        ? <Text key={i} style={s.sec}>{k}</Text>
        : <View key={i} style={s.row}><Text style={s.k}>{k}</Text><Text style={s.v} selectable>{v}</Text></View>)}
    </View>
  );
}

const s = StyleSheet.create({
  box: { marginBottom: 14, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(245,158,11,0.3)' },
  title: { color: '#f59e0b', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  sec: { color: '#f59e0b', fontSize: 10, fontWeight: '700', marginTop: 6, marginBottom: 2, opacity: 0.8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 1 },
  k: { color: '#94a3b8', fontSize: 11, flexShrink: 1 },
  v: { color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', flexShrink: 1, textAlign: 'right' },
});
