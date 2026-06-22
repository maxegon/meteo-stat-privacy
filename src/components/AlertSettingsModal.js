import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AnimatedGradientBg from './AnimatedGradientBg';
import {
  ALERT_TYPES,
  loadThresholds,
  saveThresholds,
  loadAlertsEnabled,
  saveAlertsEnabled,
  getDefaultThresholds,
} from '../services/weatherAlerts';

// Range e step per ogni soglia
const STEPPER_CONFIG = {
  heatMax: { min: 25, max: 50, step: 1, format: v => `${v}°C` },
  coldMin: { min: -20, max: 10, step: 1, format: v => `${v}°C` },
  rainMmH: { min: 5,  max: 50, step: 1, format: v => `${v} mm` },
  windKmh: { min: 30, max: 120, step: 5, format: v => `${v} km/h` },
  uvMax:   { min: 3,  max: 11, step: 1, format: v => `UV ${v}` },
};

// ── Stepper compatto (no dipendenze esterne) ──────────────────────────────────
function ValueStepper({ value, min, max, step, format, color, disabled }) {
  // Gestito dal parent via onValueChange
  return null; // renderizzato inline sotto
}

export default function AlertSettingsModal({ visible, onClose, onSave }) {
  const { colors: c, dark } = useTheme();
  const styles = useMemo(() => makeStyles(c, dark), [c, dark]);
  const [thresholds, setThresholds] = useState(getDefaultThresholds());
  const [enabled, setEnabled]       = useState(true);
  const [loaded, setLoaded]         = useState(false);

  useEffect(() => {
    if (visible) {
      Promise.all([loadThresholds(), loadAlertsEnabled()]).then(([t, e]) => {
        setThresholds(t);
        setEnabled(e);
        setLoaded(true);
      });
    }
  }, [visible]);

  const handleSave = useCallback(async () => {
    await saveThresholds(thresholds);
    await saveAlertsEnabled(enabled);
    onSave?.(thresholds, enabled);
    onClose();
  }, [thresholds, enabled, onSave, onClose]);

  const handleReset = useCallback(() => {
    setThresholds(getDefaultThresholds());
  }, []);

  const increment = useCallback((key) => {
    const cfg = STEPPER_CONFIG[key];
    setThresholds(prev => ({
      ...prev,
      [key]: Math.min(prev[key] + cfg.step, cfg.max),
    }));
  }, []);

  const decrement = useCallback((key) => {
    const cfg = STEPPER_CONFIG[key];
    setThresholds(prev => ({
      ...prev,
      [key]: Math.max(prev[key] - cfg.step, cfg.min),
    }));
  }, []);

  if (!loaded && visible) return null;

  const alertEntries = Object.values(ALERT_TYPES);
  const defaults = getDefaultThresholds();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <AnimatedGradientBg>
        <SafeAreaView style={styles.safe}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Soglie alert meteo</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color={c.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Toggle globale */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleLabel}>Alert condizioni estreme</Text>
                <Text style={styles.toggleSub}>
                  Mostra un banner quando le previsioni indicano condizioni eccezionali
                </Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={v => setEnabled(v)}
                trackColor={{ false: '#334155', true: c.accent + '66' }}
                thumbColor={enabled ? c.accent : '#64748b'}
              />
            </View>

            {/* Card per ogni soglia con stepper +/- */}
            {alertEntries.map(alertType => {
              const key = alertType.thresholdKey;
              const cfg = STEPPER_CONFIG[key];
              const val = thresholds[key];
              const isDefault = val === defaults[key];
              const atMin = val <= cfg.min;
              const atMax = val >= cfg.max;

              return (
                <View key={key} style={[styles.card, !enabled && styles.cardDisabled]}>
                  <View style={styles.cardHeader}>
                    <MaterialCommunityIcons
                      name={alertType.icon} size={20}
                      color={enabled ? alertType.color : '#475569'}
                    />
                    <Text style={[styles.cardLabel, !enabled && { color: '#475569' }]}>
                      {alertType.label}
                    </Text>
                  </View>

                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={[styles.stepBtn, atMin && styles.stepBtnDisabled]}
                      onPress={() => decrement(key)}
                      disabled={!enabled || atMin}
                    >
                      <MaterialCommunityIcons name="minus" size={20} color={atMin || !enabled ? '#475569' : c.text} />
                    </TouchableOpacity>

                    <View style={styles.valueBox}>
                      <Text style={[styles.valueText, { color: enabled ? alertType.color : '#475569' }]}>
                        {key === 'coldMin' ? '≤' : '≥'} {cfg.format(val)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.stepBtn, atMax && styles.stepBtnDisabled]}
                      onPress={() => increment(key)}
                      disabled={!enabled || atMax}
                    >
                      <MaterialCommunityIcons name="plus" size={20} color={atMax || !enabled ? '#475569' : c.text} />
                    </TouchableOpacity>
                  </View>

                  {!isDefault && (
                    <Text style={[styles.defaultHint, { color: alertType.color }]}>
                      default: {cfg.format(defaults[key])}
                    </Text>
                  )}
                </View>
              );
            })}

            {/* Ripristina default */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                <MaterialCommunityIcons name="restore" size={16} color={c.textMuted} />
                <Text style={styles.resetText}>Ripristina default</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Salva */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>Salva</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </AnimatedGradientBg>
    </Modal>
  );
}

function makeStyles(c, dark) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
    },
    headerTitle: { color: c.text, fontSize: 18, fontWeight: '700' },
    closeBtn: {
      backgroundColor: c.bgCard, borderRadius: 20,
      padding: 6, borderWidth: 1, borderColor: c.border,
    },
    scroll: { flex: 1, paddingHorizontal: 16 },
    toggleRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.bgCard, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: c.border, marginBottom: 16,
    },
    toggleLabel: { color: c.text, fontSize: 15, fontWeight: '600' },
    toggleSub: { color: c.textMuted, fontSize: 12, fontWeight: '300', marginTop: 3, lineHeight: 17 },
    card: {
      backgroundColor: c.bgCard, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: c.border, marginBottom: 10,
    },
    cardDisabled: { opacity: 0.5 },
    cardHeader: {
      flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
    },
    cardLabel: { flex: 1, color: c.text, fontSize: 14, fontWeight: '600' },
    stepperRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16,
    },
    stepBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: dark ? '#1e293b' : '#f1f5f9',
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: c.border,
    },
    stepBtnDisabled: { opacity: 0.4 },
    valueBox: {
      minWidth: 100, alignItems: 'center', paddingVertical: 6,
    },
    valueText: { fontSize: 18, fontWeight: '700' },
    defaultHint: { fontSize: 11, fontWeight: '500', textAlign: 'center', marginTop: 8 },
    actionsRow: {
      flexDirection: 'row', justifyContent: 'center', marginTop: 8, marginBottom: 16,
    },
    resetBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: c.bgCard, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
      borderWidth: 1, borderColor: c.border,
    },
    resetText: { color: c.textMuted, fontSize: 13, fontWeight: '500' },
    saveBtn: {
      backgroundColor: c.accent, borderRadius: 12,
      paddingVertical: 14, marginHorizontal: 16, marginBottom: 12,
      alignItems: 'center',
    },
    saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
}
