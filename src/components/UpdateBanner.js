import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Banner "aggiornamento disponibile" — expo-updates scarica già in automatico
 * al lancio (app.json → updates, default checkAutomatically: ON_LOAD); senza
 * questo banner l'utente vede le novità solo al lancio SUCCESSIVO a quello
 * che ha scaricato l'update (due riavvii, poco intuitivo). Qui invece, appena
 * isUpdatePending diventa true, offriamo un riavvio immediato in-app.
 * Updates.isEnabled è false in Expo Go/dev client: il banner resta nascosto.
 */
export default function UpdateBanner() {
  const { isUpdatePending } = Updates.useUpdates();
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState(false);
  const [restarting, setRestarting] = useState(false);

  if (!Updates.isEnabled || !isUpdatePending || dismissed) return null;

  const handleReload = async () => {
    setRestarting(true);
    try {
      await Updates.reloadAsync();
    } catch (_) {
      setRestarting(false);
    }
  };

  return (
    <View style={[styles.banner, { top: insets.top + 8 }]}>
      <MaterialCommunityIcons name="cloud-download-outline" size={18} color="#0f172a" />
      <Text style={styles.text} numberOfLines={2}>Nuova versione disponibile</Text>
      <TouchableOpacity onPress={handleReload} style={styles.btn} disabled={restarting} accessibilityRole="button" accessibilityLabel="Aggiorna ora">
        <Text style={styles.btnText}>{restarting ? 'Aggiorno…' : 'Aggiorna ora'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDismissed(true)} accessibilityLabel="Ignora" accessibilityRole="button" style={styles.closeBtn}>
        <MaterialCommunityIcons name="close" size={16} color="#0f172a" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12, right: 12,
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    zIndex: 999, elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  text: { flex: 1, color: '#0f172a', fontWeight: '700', fontSize: 13 },
  btn: { backgroundColor: '#0f172a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  closeBtn: { padding: 4 },
});
