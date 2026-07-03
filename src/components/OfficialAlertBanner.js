import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const LEVEL_ICON = {
  red: 'alert-octagon',
  orange: 'alert',
  yellow: 'alert-outline',
};

function formatRange(effective, expires) {
  const fmt = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  const from = fmt(effective);
  const to = fmt(expires);
  if (from && to) return `${from} → ${to}`;
  if (from) return `dalle ${from}`;
  if (to) return `fino al ${to}`;
  return null;
}

/**
 * Allerte UFFICIALI emesse da enti terzi (oggi: WeatherAPI.com), riprodotte
 * così come ricevute — diverse dagli alert calcolati internamente su soglie/
 * anomalie (gestiti da WeatherAlertBanner). Nessuna logica di calcolo qui.
 *
 * @param {Array} alerts - array da extractOfficialAlerts()
 */
export default function OfficialAlertBanner({ alerts = [] }) {
  const { colors: c } = useTheme();
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [selected, setSelected] = useState(null);

  // FIX 2026-07-02: stesso bug di WeatherAlertBanner — si azzerava tutto il
  // dismiss ad ogni cambio di *numero* di alert, non solo quando un alert
  // dismesso spariva davvero. Ora si toglie dal set solo l'id di un'allerta
  // non più presente, lasciando intatto il dismiss delle altre.
  useEffect(() => {
    const currentIds = new Set(alerts.map(a => a.id));
    setDismissedIds(prev => {
      let changed = false;
      const next = new Set();
      prev.forEach(id => {
        if (currentIds.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [alerts]);

  if (!alerts.length) return null;

  const visible = alerts.filter(a => !dismissedIds.has(a.id));
  if (!visible.length) return null;

  const dismissOne = (id) => {
    setDismissedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const range = selected ? formatRange(selected.effective, selected.expires) : null;

  return (
    <View style={styles.container}>
      <View style={styles.badgeRow}>
        <MaterialCommunityIcons name="shield-alert-outline" size={13} color="#dc2626" />
        <Text style={styles.badgeText}>ALLERTA UFFICIALE</Text>
      </View>

      {visible.map((alert) => {
        const alertRange = formatRange(alert.effective, alert.expires);
        return (
          <TouchableOpacity
            key={alert.id}
            style={[styles.banner, { backgroundColor: alert.color + '18', borderColor: alert.color }]}
            onPress={() => setSelected(alert)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name={LEVEL_ICON[alert.severity] || 'alert'} size={20} color={alert.color} />
            <View style={styles.textWrap}>
              <Text style={[styles.headline, { color: alert.color }]} numberOfLines={2}>{alert.headline}</Text>
              <Text style={[styles.meta, { color: c.textSub }]} numberOfLines={1}>
                {alert.issuer}{alertRange ? ` · ${alertRange}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => dismissOne(alert.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons name="close" size={16} color={c.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}

      {/* Drawer di dettaglio */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={[styles.drawer, { backgroundColor: c.bgSecond }]} edges={['bottom']}>
            {selected && (
              <>
                <View style={styles.drawerHeader}>
                  <View style={[styles.severityPill, { backgroundColor: selected.color + '22', borderColor: selected.color }]}>
                    <MaterialCommunityIcons name={LEVEL_ICON[selected.severity] || 'alert'} size={14} color={selected.color} />
                    <Text style={[styles.severityPillText, { color: selected.color }]}>{selected.severityLabel}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelected(null)} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <MaterialCommunityIcons name="close" size={20} color={c.accent} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.drawerHeadline, { color: c.text }]}>{selected.headline}</Text>

                  <Text style={[styles.drawerLabel, { color: c.textMuted }]}>Ente emittente</Text>
                  <Text style={[styles.drawerValue, { color: c.textSub }]}>{selected.issuer}</Text>

                  {!!range && (
                    <>
                      <Text style={[styles.drawerLabel, { color: c.textMuted }]}>Validità</Text>
                      <Text style={[styles.drawerValue, { color: c.textSub }]}>{range}</Text>
                    </>
                  )}

                  {!!selected.areas.length && (
                    <>
                      <Text style={[styles.drawerLabel, { color: c.textMuted }]}>Aree coinvolte</Text>
                      <View style={styles.areaWrap}>
                        {selected.areas.map((area, i) => (
                          <View key={i} style={[styles.areaChip, { borderColor: c.border, backgroundColor: c.bgCard }]}>
                            <Text style={[styles.areaChipText, { color: c.textSub }]}>{area}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {!!selected.description && (
                    <>
                      <Text style={[styles.drawerLabel, { color: c.textMuted }]}>Descrizione</Text>
                      <Text style={[styles.drawerDesc, { color: c.textSub }]}>{selected.description}</Text>
                    </>
                  )}

                  {!!selected.url && (
                    <TouchableOpacity
                      style={[styles.linkBtn, { borderColor: c.accent }]}
                      onPress={() => Linking.openURL(selected.url)}
                    >
                      <MaterialCommunityIcons name="open-in-new" size={16} color={c.accent} />
                      <Text style={[styles.linkBtnText, { color: c.accent }]}>Apri fonte ufficiale</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.disclaimerBox}>
                    <MaterialCommunityIcons name="information-outline" size={15} color={c.textMuted} style={{ marginTop: 1 }} />
                    <Text style={[styles.disclaimerText, { color: c.textMuted }]}>
                      Allerta emessa da {selected.issuer}. Solo1Meteo si limita a riprodurla così come ricevuta da WeatherAPI, non la convalida né la modifica.
                    </Text>
                  </View>

                  <View style={{ height: 24 }} />
                </ScrollView>
              </>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 0 },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 6, paddingHorizontal: 2,
  },
  badgeText: { color: '#dc2626', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  banner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 1.5,
    paddingVertical: 10, paddingHorizontal: 11,
    marginBottom: 8, gap: 9,
  },
  textWrap: { flex: 1, minWidth: 0 },
  headline: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 11, fontWeight: '400', marginTop: 2 },
  dismissBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  drawer: { maxHeight: '85%', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 4 },
  drawerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  severityPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 14, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5,
  },
  severityPillText: { fontSize: 12, fontWeight: '700' },
  closeBtn: { padding: 4 },
  drawerScroll: { paddingHorizontal: 16 },
  drawerHeadline: { fontSize: 17, fontWeight: '700', marginBottom: 14, lineHeight: 23 },
  drawerLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 4 },
  drawerValue: { fontSize: 14, fontWeight: '500' },
  drawerDesc: { fontSize: 13, fontWeight: '400', lineHeight: 19 },
  areaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  areaChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  areaChipText: { fontSize: 12, fontWeight: '500' },
  linkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: 10, paddingVertical: 10, marginTop: 16,
  },
  linkBtnText: { fontSize: 13, fontWeight: '600' },
  disclaimerBox: {
    flexDirection: 'row', gap: 8, marginTop: 20, padding: 10,
    backgroundColor: 'rgba(148,163,184,0.12)', borderRadius: 10,
  },
  disclaimerText: { flex: 1, fontSize: 11, fontWeight: '400', lineHeight: 16, fontStyle: 'italic' },
});
