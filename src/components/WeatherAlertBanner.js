import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

/**
 * Lista di banner alert meteo, tutti visibili contemporaneamente.
 * Ogni banner è dismissabile singolarmente per la sessione corrente.
 * Il bottone impostazioni appare solo sul primo banner visibile.
 *
 * @param {Array}    alerts  - array di alert da detectAlerts()
 * @param {Function} onOpenSettings - callback per aprire le impostazioni soglie
 */
export default function WeatherAlertBanner({ alerts = [], onOpenSettings }) {
  const { colors: c } = useTheme();
  // Set di chiavi dismissate (tipo_giorno) per la sessione corrente.
  const [dismissedKeys, setDismissedKeys] = useState(new Set());

  // FIX 2026-07-02: prima si azzerava TUTTO il dismiss ogni volta che cambiava
  // il *numero* di alert (anche solo perché uno era scaduto o ne era comparso
  // uno nuovo) — quindi chiudere un alert non "teneva" davvero: bastava che
  // un altro alert apparisse/sparisse per farlo ricomparire. Ora si toglie dal
  // set solo la chiave di un alert che non esiste più (scaduto/non più valido),
  // lasciando intatto il dismiss di quelli ancora attivi.
  useEffect(() => {
    const currentKeys = new Set(alerts.map(a => `${a.id}_${a.day}`));
    setDismissedKeys(prev => {
      let changed = false;
      const next = new Set();
      prev.forEach(k => {
        if (currentKeys.has(k)) next.add(k);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [alerts]);

  if (!alerts.length) return null;

  const visibleAlerts = alerts.filter(a => !dismissedKeys.has(`${a.id}_${a.day}`));
  if (!visibleAlerts.length) return null;

  const dismissAll = () => {
    setDismissedKeys(new Set(alerts.map(a => `${a.id}_${a.day}`)));
  };

  const dismissOne = (alert) => {
    setDismissedKeys(prev => {
      const next = new Set(prev);
      next.add(`${alert.id}_${alert.day}`);
      return next;
    });
  };

  return (
    <View style={styles.container}>
      {/* Header con contatore + azioni globali */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color={c.textMuted} />
          <Text style={[styles.headerText, { color: c.textMuted }]}>
            {visibleAlerts.length} {visibleAlerts.length === 1 ? 'alert attivo' : 'alert attivi'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {onOpenSettings && (
            <TouchableOpacity onPress={onOpenSettings} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="tune-variant" size={18} color={c.textMuted} />
            </TouchableOpacity>
          )}
          {visibleAlerts.length > 1 && (
            <TouchableOpacity onPress={dismissAll} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close-circle-outline" size={18} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Banner individuali */}
      {visibleAlerts.map((alert, idx) => (
        <View
          key={`${alert.id}_${alert.day}_${idx}`}
          style={[styles.banner, {
            backgroundColor: alert.bgColor || (alert.color + '22'),
            borderColor: alert.borderColor || (alert.color + '55'),
          }]}
        >
          <MaterialCommunityIcons name={alert.icon} size={18} color={alert.color} />
          <View style={styles.textWrap}>
            <Text style={[styles.title, { color: alert.color }]}>{alert.label}</Text>
            <Text style={[styles.message, { color: c.textSub }]}>{alert.message}</Text>
            {/* Indicazione dedicata: distingue lo scostamento dalle medie
                stagionali dal valore "estremo" (soglia fissa). */}
            {alert.seasonal && (
              <View style={styles.seasonalTag}>
                <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={11} color={alert.color} />
                <Text style={[styles.seasonalTagText, { color: alert.color }]}>
                  Scostamento dalle medie stagionali, non un valore estremo
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.dismissBtn}
            onPress={() => dismissOne(alert)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="close" size={16} color={c.textMuted} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 11,
    marginBottom: 8,
    gap: 9,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 12, fontWeight: '700' },
  message: { fontSize: 11, fontWeight: '300', marginTop: 1 },
  seasonalTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  seasonalTagText: { fontSize: 10, fontWeight: '600', fontStyle: 'italic', flexShrink: 1 },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
