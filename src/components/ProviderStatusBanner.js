import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

/**
 * FIX 2026-07-03 — avviso in-app quando le fonti dati attive scendono sotto
 * soglia (vedi HANDOFF.md §5, incidente timeout provider). Stessa soglia già
 * usata da /health lato backend e dagli alert Telegram (6/8) — coerenza tra
 * ciò che l'utente vede in app e ciò che l'operatore vede negli alert.
 *
 * Testo volutamente SENZA promessa di tempistica ("a breve", "verrà
 * ripristinato entro...") — non possiamo garantire quando una fonte terza
 * (es. quota rate-limit) tornerà disponibile. Vedi CLAUDE.md §7.2 regola
 * anti-claim: accuratezza sopra rassicurazione.
 *
 * Complementare al contatore "media su N fonti" già presente su ogni singolo
 * valore (INVARIANTE, vedi CLAUDE.md) — questo banner NON lo sostituisce,
 * segnala solo lo stato complessivo del servizio.
 *
 * Quando le fonti tornano ≥ soglia dopo essere state sotto soglia, mostra un
 * messaggio di ripristino transitorio (si nasconde da solo dopo 5s) — stesso
 * pattern del recovery Telegram lato backend (notifyHealthChange).
 */
const HEALTHY_THRESHOLD = 6; // su 8 fonti totali — stessa soglia di /health
const RESTORED_MESSAGE_DURATION_MS = 5000;

export default function ProviderStatusBanner({ activeCount, totalCount = 8 }) {
  const [showRestored, setShowRestored] = useState(false);
  const wasDegradedRef = useRef(false);

  useEffect(() => {
    if (activeCount == null) return undefined;
    const isDegraded = activeCount < HEALTHY_THRESHOLD;

    if (wasDegradedRef.current && !isDegraded) {
      // Transizione degraded → sano: mostra conferma transitoria
      setShowRestored(true);
      const t = setTimeout(() => setShowRestored(false), RESTORED_MESSAGE_DURATION_MS);
      wasDegradedRef.current = isDegraded;
      return () => clearTimeout(t);
    }
    wasDegradedRef.current = isDegraded;
    return undefined;
  }, [activeCount]);

  if (activeCount == null) return null;

  const isDegraded = activeCount < HEALTHY_THRESHOLD;

  if (isDegraded) {
    return (
      <View
        style={[styles.banner, styles.bannerDegraded]}
        accessibilityRole="alert"
        accessibilityLabel={`Servizio ridotto: ${activeCount} su ${totalCount} fonti dati attive`}
      >
        <MaterialCommunityIcons name="cloud-alert" size={16} color="#fff" />
        <Text style={styles.text}>
          Alcune fonti dati non sono al momento disponibili ({activeCount}/{totalCount}). I valori mostrati si basano su un numero ridotto di fonti.
        </Text>
      </View>
    );
  }

  if (showRestored) {
    return (
      <View
        style={[styles.banner, styles.bannerRestored]}
        accessibilityRole="alert"
        accessibilityLabel="Tutte le fonti dati sono di nuovo disponibili"
      >
        <MaterialCommunityIcons name="cloud-check" size={16} color="#fff" />
        <Text style={styles.text}>Le fonti dati sono di nuovo disponibili.</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  bannerDegraded: { backgroundColor: '#d97706' },
  bannerRestored: { backgroundColor: '#16a34a' },
  text: { color: '#fff', fontSize: 12, fontWeight: '700', flex: 1, flexWrap: 'wrap' },
});
