import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * FIX 2026-07-02 — sostituisce i banner alert sempre visibili in cima alla
 * pagina (vedi MEMORIA_METEO_PROGETTO.md, segnalato: "gli alert riempiono
 * tutta la pagina a volte"). Mostra solo un bottone compatto rosso
 * lampeggiante con il conteggio; il dettaglio si apre in AlertsSheet.
 *
 * Nessuna logica di calcolo/dismiss qui — solo l'indicatore. Il dismiss
 * per-alert resta in OfficialAlertBanner/WeatherAlertBanner, renderizzati
 * dentro AlertsSheet quando il pannello è aperto.
 */
export default function AlertsButton({ count, onPress }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!count) return undefined;
    let anim;
    let cancelled = false;
    // Rispetta le preferenze di accessibilità di sistema: se l'utente ha
    // disattivato le animazioni, il bottone resta comunque visibile ma fisso.
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((reduced) => {
        if (cancelled || reduced) return;
        anim = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
          ])
        );
        anim.start();
      })
      .catch(() => {}); // API non disponibile su qualche piattaforma/versione: niente animazione, nessun crash

    return () => {
      cancelled = true;
      anim?.stop();
    };
  }, [count, pulse]);

  if (!count) return null;

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${count} ${count === 1 ? 'alert attivo' : 'alert attivi'}, tocca per vedere i dettagli`}
    >
      <Animated.View style={{ opacity: pulse }}>
        <MaterialCommunityIcons name="alert" size={15} color="#fff" />
      </Animated.View>
      <Text style={styles.count}>{count} {count === 1 ? 'alert attivo' : 'alert attivi'}</Text>
      <MaterialCommunityIcons name="chevron-right" size={15} color="#ffffffcc" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  count: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
