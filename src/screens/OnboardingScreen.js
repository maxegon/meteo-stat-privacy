import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';

export default function OnboardingScreen({ onComplete }) {
  const [showPolicy, setShowPolicy] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (isBottom) setHasScrolled(true);
  };

  if (showPolicy) {
    return (
      <PrivacyPolicyScreen
        showAcceptButton={true}
        onAccept={onComplete}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >

        {/* Logo / titolo */}
        <MaterialCommunityIcons name="weather-partly-cloudy" size={72} color="#38bdf8" style={styles.icon} />
        <Text style={styles.title}>Solo1Meteo</Text>
        <Text style={styles.tagline}>Una previsione, tante fonti</Text>

        {/* Cosa fa l'app */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Come funziona</Text>
          {[
            { icon: 'weather-partly-cloudy', text: 'Raccoglie previsioni da più fonti meteo (tra cui Open-Meteo, OpenWeatherMap, WeatherAPI, MET Norway) tramite un backend tecnico dell’app' },
            { icon: 'compare', text: 'Confronta i dati affiancati per mostrarti dove i modelli concordano o divergono' },
            { icon: 'chart-timeline-variant', text: 'Mostra previsioni orarie e giornaliere fino a 16 giorni' },
            { icon: 'shield-check-outline', text: 'Nessun account e nessun profilo utente: la posizione non viene associata a te né salvata in modo permanente' },
          ].map((item, i) => (
            <View key={i} style={styles.featureRow}>
              <MaterialCommunityIcons name={item.icon} size={20} color="#38bdf8" />
              <Text style={styles.featureText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Posizione GPS */}
        <View style={[styles.card, styles.cardWarning]}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#fbbf24" />
            <Text style={[styles.cardTitle, { color: '#fbbf24' }]}>Utilizzo della posizione</Text>
          </View>
          <Text style={styles.warningText}>
            L'app chiederà il permesso di accedere alla tua posizione GPS per mostrare subito le previsioni della tua zona.
          </Text>
          <Text style={styles.warningDetail}>
            Per visualizzare le previsioni è necessario attivare la posizione oppure cercare manualmente una città: senza una delle due cose la schermata principale resterà vuota.
          </Text>
          <Text style={styles.warningDetail}>
            Le coordinate (latitudine e longitudine) vengono inviate al backend tecnico dell'app (su Vercel) e ai servizi terzi elencati nella Privacy Policy (provider meteo, OpenStreetMap, RainViewer) solo per ottenere previsioni, nome della località e radar. Non vengono usate per pubblicità né per profilazione. Se hai meno di 14 anni, chiedi l'autorizzazione a un genitore prima di concedere il permesso.
          </Text>
          <Text style={styles.warningDetail}>
            Puoi revocare il permesso in qualsiasi momento da Impostazioni → Privacy → Posizione.
          </Text>
        </View>

        {/* Disclaimer previsioni */}
        <View style={[styles.card, styles.cardDisclaimer]}>
          <View style={styles.cardTitleRow}>
            <MaterialCommunityIcons name="alert-outline" size={18} color="#94a3b8" />
            <Text style={[styles.cardTitle, { color: '#94a3b8' }]}>Avviso importante</Text>
          </View>
          <Text style={styles.disclaimerText}>
            Le previsioni meteo sono indicative. Non prendere decisioni a rischio (navigazione, escursioni, eventi) basandoti esclusivamente su questa app. Solo1Meteo non sostituisce i canali ufficiali: in caso di allerte meteo fai sempre riferimento al Dipartimento della Protezione Civile, alle allerte della tua Regione e al Servizio Meteo dell'Aeronautica Militare. Le segnalazioni mostrate nell'app sono indicative e non costituiscono allerte ufficiali.
          </Text>
        </View>

        {/* Policy link */}
        <TouchableOpacity style={styles.policyLink} onPress={() => setShowPolicy(true)} accessibilityLabel="Leggi la Privacy Policy completa" accessibilityRole="button">
          <MaterialCommunityIcons name="file-document-outline" size={16} color="#38bdf8" />
          <Text style={styles.policyLinkText}>Leggi la Privacy Policy completa</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color="#38bdf8" />
        </TouchableOpacity>

        {/* Hint scroll */}
        {!hasScrolled && (
          <View style={styles.scrollHint}>
            <MaterialCommunityIcons name="chevron-double-down" size={16} color="#64748b" />
            <Text style={styles.scrollHintText}>Scorri fino in fondo per continuare</Text>
          </View>
        )}

        {/* Bottone principale */}
        <TouchableOpacity
          style={[styles.acceptBtn, !hasScrolled && styles.acceptBtnDisabled]}
          onPress={hasScrolled ? onComplete : null}
          activeOpacity={hasScrolled ? 0.8 : 1}
        >
          <Text style={[styles.acceptText, !hasScrolled && styles.acceptTextDisabled]}>
            Accetto e continua
          </Text>
        </TouchableOpacity>

        <Text style={styles.legal}>
          Continuando accetti la{' '}
          <Text style={styles.legalLink} onPress={() => setShowPolicy(true)}>
            Privacy Policy
          </Text>
          {' '}e il trattamento della posizione GPS come descritto sopra.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24, alignItems: 'center' },
  icon: { marginTop: 16, marginBottom: 12 },
  title: { color: '#f1f5f9', fontSize: 26, fontWeight: '700', letterSpacing: 1, textAlign: 'center' },
  tagline: { color: '#94a3b8', fontSize: 12, fontWeight: '300', textAlign: 'center', marginTop: 6, marginBottom: 28, letterSpacing: 0.3 },
  card: {
    width: '100%', backgroundColor: '#1e293b',
    borderRadius: 14, borderWidth: 1, borderColor: '#334155',
    padding: 16, marginBottom: 14,
  },
  cardWarning: { borderColor: '#fbbf2440', backgroundColor: '#1a1600' },
  cardDisclaimer: { borderColor: '#33415580', backgroundColor: '#111827' },
  cardTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  featureText: { flex: 1, color: '#94a3b8', fontSize: 13, fontWeight: '300', lineHeight: 19 },
  warningText: { color: '#94a3b8', fontSize: 13, fontWeight: '400', lineHeight: 19, marginBottom: 8 },
  warningDetail: { color: '#94a3b8', fontSize: 12, fontWeight: '300', lineHeight: 18, marginBottom: 6 },
  disclaimerText: { color: '#94a3b8', fontSize: 12, fontWeight: '300', lineHeight: 19 },
  policyLink: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    gap: 8, paddingVertical: 14, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#1e293b', marginBottom: 24,
  },
  policyLinkText: { flex: 1, color: '#38bdf8', fontSize: 14, fontWeight: '400' },
  scrollHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 12,
  },
  scrollHintText: { color: '#94a3b8', fontSize: 12, fontWeight: '300' },
  acceptBtn: {
    width: '100%', backgroundColor: '#38bdf8',
    borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 14,
  },
  acceptBtnDisabled: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  acceptText: { color: '#0f172a', fontSize: 16, fontWeight: '700' },
  acceptTextDisabled: { color: '#94a3b8' },
  legal: { color: '#94a3b8', fontSize: 11, fontWeight: '300', textAlign: 'center', lineHeight: 18 },
  legalLink: { color: '#38bdf8' },
});
