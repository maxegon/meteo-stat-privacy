import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, BackHandler, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import OfficialAlertBanner from './OfficialAlertBanner';
import WeatherAlertBanner from './WeatherAlertBanner';

/**
 * FIX 2026-07-02 — pannello a comparsa con tutti gli alert (ufficiali +
 * calcolati), aperto dal bottone lampeggiante AlertsButton. Vedi
 * MEMORIA_METEO_PROGETTO.md per il contesto.
 *
 * Deliberatamente un overlay animato in-tree (View assoluta), NON una
 * <Modal> di React Native: OfficialAlertBanner apre già una propria <Modal>
 * per il dettaglio di una singola allerta. Impilare due <Modal> native
 * (una dentro l'altra) è una fonte nota di glitch soprattutto su Android.
 * Con un overlay in-tree, l'unica vera Modal nativa a runtime resta quella
 * di dettaglio — nessun annidamento.
 */
export default function AlertsSheet({ visible, onClose, officialAlerts = [], weatherAlerts = [], onOpenSettings }) {
  const { colors: c } = useTheme();
  const screenHeight = Dimensions.get('window').height;
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  // Il pannello resta montato durante l'animazione di chiusura, altrimenti
  // sparirebbe di scatto invece di scendere verso il basso.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: screenHeight, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setMounted(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Android: il tasto indietro chiude il pannello invece di uscire dalla schermata.
  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  if (!mounted) return null;

  const totalCount = officialAlerts.length + weatherAlerts.length;

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Chiudi pannello alert"
          accessibilityRole="button"
        />
      </Animated.View>
      <Animated.View style={[styles.sheet, { backgroundColor: c.bgSecond, transform: [{ translateY }] }]}>
        <SafeAreaView edges={['bottom']}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.text }]}>
              {totalCount} {totalCount === 1 ? 'alert attivo' : 'alert attivi'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={22} color={c.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <OfficialAlertBanner alerts={officialAlerts} />
            <WeatherAlertBanner alerts={weatherAlerts} onOpenSettings={onOpenSettings} />
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: { fontSize: 16, fontWeight: '700' },
  scroll: { flexGrow: 0 },
  content: { paddingHorizontal: 12, paddingBottom: 16 },
});
