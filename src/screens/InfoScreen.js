import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PROVIDERS } from '../services/providers';
import { EXTERNAL_APPS } from '../services/externalApps';
import AnimatedGradientBg from '../components/AnimatedGradientBg';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import AffidabilitaScreen from './AffidabilitaScreen';
import { useTheme } from '../context/ThemeContext';
import { readErrorLogs, clearErrorLogs } from '../utils/errorLogger';

const APP_VERSION = '1.0.0';
const DEV_TAPS_REQUIRED = 5;

export default function InfoScreen() {
  const [showPolicy, setShowPolicy]     = useState(false);
  const [showAffid, setShowAffid]       = useState(false);
  const [showDiag, setShowDiag]         = useState(false);
  const [logs, setLogs]                 = useState([]);
  const [tapCount, setTapCount]         = useState(0);
  const tapTimer                        = useRef(null);
  const { colors: c } = useTheme();
  const styles = useMemo(() => makeStyles(c), [c]);

  // Carica i log quando la sezione diagnostica viene aperta
  useEffect(() => {
    if (showDiag) {
      readErrorLogs().then(setLogs);
    }
  }, [showDiag]);

  // 5 tap rapidi sulla versione → rivela la sezione diagnostica
  const handleVersionTap = useCallback(() => {
    clearTimeout(tapTimer.current);
    setTapCount(prev => {
      const next = prev + 1;
      if (next >= DEV_TAPS_REQUIRED) {
        setShowDiag(d => !d);
        return 0;
      }
      // Reset se non si completa entro 2s
      tapTimer.current = setTimeout(() => setTapCount(0), 2000);
      return next;
    });
  }, []);

  const handleClearLogs = useCallback(async () => {
    await clearErrorLogs();
    setLogs([]);
  }, []);

  return (
    <AnimatedGradientBg>
    <SafeAreaView style={styles.safe}>
      <Modal visible={showPolicy} animationType="slide" onRequestClose={() => setShowPolicy(false)}>
        <PrivacyPolicyScreen showAcceptButton={false} />
        <TouchableOpacity style={styles.closePolicy} onPress={() => setShowPolicy(false)}>
          <MaterialCommunityIcons name="close" size={20} color="#38bdf8" />
          <Text style={styles.closePolicyText}>Chiudi</Text>
        </TouchableOpacity>
      </Modal>
      <Modal visible={showAffid} animationType="slide" onRequestClose={() => setShowAffid(false)}>
        <AffidabilitaScreen />
        <TouchableOpacity style={styles.closePolicy} onPress={() => setShowAffid(false)}>
          <MaterialCommunityIcons name="close" size={20} color="#38bdf8" />
          <Text style={styles.closePolicyText}>Chiudi</Text>
        </TouchableOpacity>
      </Modal>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>ℹ️ Informazioni</Text>

        {/* Disclaimer non-affiliazione — primo elemento visibile, richiesto da policy Google Play */}
        <View style={styles.disclaimerBanner}>
          <MaterialCommunityIcons name="alert-outline" size={20} color="#fbbf24" style={{ marginTop: 1 }} />
          <View style={styles.disclaimerContent}>
            <Text style={styles.disclaimerTitle}>App indipendente — nessuna affiliazione ufficiale</Text>
            <Text style={styles.disclaimerBody}>
              Solo1Meteo non è affiliata, sponsorizzata né gestita da MET Norway, DWD, NOAA o altri enti meteorologici governativi. I dati sono scaricati dalle API pubbliche ufficiali di ciascun provider e mostrati così come ricevuti.
            </Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solo1Meteo</Text>
          <Text style={styles.body}>
            Solo1Meteo raccoglie le previsioni di 8 servizi meteo ufficiali, le media tra loro e ti mostra un'unica previsione più robusta. Puoi anche confrontare le singole fonti per vedere dove concordano e dove divergono.{'\n\n'}
            I dati arrivano direttamente dai server ufficiali di ogni provider, senza passare da siti intermedi.
          </Text>
        </View>

        {/* Come funzionano i dati */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Come vengono calcolate le previsioni</Text>
          {[
            { icon: 'scale-balance', color: '#38bdf8', title: 'Giorni 0–2: tutti gli 8 provider', body: 'Temperatura, icona e descrizione sono la media di tutti gli 8 provider attivi. L\'icona del giorno riflette il tempo prevalente nelle ore diurne (6–20).' },
            { icon: 'clock-outline', color: '#fbbf24', title: 'Giorni 3–9: copertura graduale', body: 'I provider si esauriscono progressivamente: WeatherAPI a 3gg, OWM e Tomorrow.io a 5gg, 7Timer a 8gg, MetNorway e Brightsky a 9–10gg. L\'app usa automaticamente tutti quelli con dati disponibili.' },
            { icon: 'calendar-range', color: '#818cf8', title: 'Giorni 10–16: 1–2 provider', body: 'Oltre i 10 giorni restano solo Open-Meteo (16gg) e Visual Crossing (15gg). Dal giorno 15 solo Open-Meteo. I dati restano affidabili ma provengono da meno fonti.' },
            { icon: 'thermometer', color: '#fb923c', title: 'Dati meteo per fonte: dati originali', body: 'In questa sezione ogni card mostra i dati originali del singolo provider, senza alcuna media. Tocca una card per vedere le previsioni complete di quella fonte.' },
          ].map((item, i) => (
            <View key={i} style={styles.methodRow}>
              <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
              <View style={styles.methodText}>
                <Text style={[styles.methodTitle, { color: item.color }]}>{item.title}</Text>
                <Text style={styles.methodBody}>{item.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Servizi integrati */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servizi integrati</Text>
          {Object.values(PROVIDERS).map(p => (
            <TouchableOpacity key={p.id} style={styles.providerCard} onPress={() => Linking.openURL(p.licenseUrl)}>
              <Text style={styles.provLogo}>{p.logo}</Text>
              <View style={styles.provInfo}>
                <Text style={[styles.provName, { color: p.color }]}>{p.name}</Text>
                <Text style={styles.provAttrib}>{p.attribution}</Text>
                <Text style={styles.provFree}>
                  {p.apiKeyRequired
                    ? (p.free ? '🔑 Registrazione gratuita richiesta' : '💳 Servizio a pagamento')
                    : '✅ Accesso libero, nessuna registrazione'}
                </Text>
              </View>
              <Text style={styles.extLink}>↗</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* App esterne */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confronta anche su</Text>
          <Text style={styles.note}>
            Tap per aprire o scaricare l'app
          </Text>
          {EXTERNAL_APPS.map(app => (
            <TouchableOpacity key={app.name} style={styles.extCard} onPress={() => Linking.openURL(app.appStore)}>
              <Text style={styles.extLogo}>{app.fallback}</Text>
              <View style={styles.extInfo}>
                <Text style={styles.extName}>{app.name}</Text>
                <Text style={styles.extNote}>{app.note}</Text>
              </View>
              <Text style={styles.extArrow}>↗</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Affidabilità */}
        <TouchableOpacity style={styles.policyBtn} onPress={() => setShowAffid(true)}>
          <MaterialCommunityIcons name="shield-check-outline" size={18} color="#38bdf8" />
          <Text style={styles.policyBtnText}>Affidabilità delle previsioni</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#38bdf8" />
        </TouchableOpacity>

        {/* Segnala Meteo */}
        <TouchableOpacity style={[styles.policyBtn, { marginTop: 6 }]} onPress={() => Linking.openURL('https://www.meteonetwork.it')}>
          <MaterialCommunityIcons name="flag-outline" size={18} color="#38bdf8" />
          <Text style={styles.policyBtnText}>Segnala Meteo (MeteoNetwork)</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#38bdf8" />
        </TouchableOpacity>

        {/* Privacy Policy */}
        <TouchableOpacity style={[styles.policyBtn, { marginTop: 6 }]} onPress={() => setShowPolicy(true)}>
          <MaterialCommunityIcons name="file-document-outline" size={18} color="#38bdf8" />
          <Text style={styles.policyBtnText}>Privacy Policy</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#38bdf8" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.policyBtn, { marginTop: 6 }]} onPress={() => Linking.openURL('https://maxegon.github.io/meteo-stat-privacy/')}>
          <MaterialCommunityIcons name="web" size={18} color="#64748b" />
          <Text style={[styles.policyBtnText, { color: '#38bdf8' }]}>Privacy Policy (web)</Text>
          <MaterialCommunityIcons name="open-in-new" size={16} color="#38bdf8" />
        </TouchableOpacity>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note legali</Text>
          <Text style={styles.body}>
            Tutti i dati meteo provengono direttamente dai servizi ufficiali dei rispettivi fornitori. L'app non copia o estrae dati da altri siti o applicazioni.{'\n\n'}
            Le previsioni meteo sono indicative. L'app non si assume responsabilità per decisioni prese sulla base delle informazioni mostrate.{'\n\n'}
            Solo1Meteo è un'app indipendente, sviluppata da un singolo sviluppatore. Non è affiliata, sponsorizzata o gestita da alcun ente governativo o servizio meteorologico nazionale (inclusi, a titolo esemplificativo, MET Norway/Yr.no, DWD o NOAA). Tutti i marchi e i dati appartengono ai rispettivi proprietari e sono utilizzati tramite le loro API/licenze pubbliche, con attribuzione visibile nell'app.
          </Text>
        </View>

        {/* Versione — 5 tap rapidi rivelano la diagnostica */}
        <TouchableOpacity onPress={handleVersionTap} activeOpacity={1} style={styles.versionRow}>
          <Text style={styles.versionText}>
            Solo1Meteo v{APP_VERSION}
            {tapCount > 0 && tapCount < DEV_TAPS_REQUIRED
              ? `  ·  ancora ${DEV_TAPS_REQUIRED - tapCount} tap`
              : ''}
          </Text>
        </TouchableOpacity>

        {/* Sezione diagnostica — visibile solo dopo 5 tap */}
        {showDiag && (
          <View style={styles.diagSection}>
            <View style={styles.diagHeader}>
              <MaterialCommunityIcons name="bug-outline" size={16} color="#f59e0b" />
              <Text style={styles.diagTitle}>
                Diagnostica  ·  {logs.length} event{logs.length === 1 ? 'o' : 'i'}
              </Text>
              {logs.length > 0 && (
                <TouchableOpacity onPress={handleClearLogs} style={styles.diagClear}>
                  <Text style={styles.diagClearText}>Svuota</Text>
                </TouchableOpacity>
              )}
            </View>

            {logs.length === 0 ? (
              <Text style={styles.diagEmpty}>✅ Nessun errore registrato</Text>
            ) : (
              logs.map((log, i) => (
                <View key={i} style={styles.diagEntry}>
                  <View style={styles.diagEntryHeader}>
                    <Text style={styles.diagContext}>{log.context}</Text>
                    <Text style={styles.diagTs}>
                      {log.ts ? new Date(log.ts).toLocaleString('it-IT', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      }) : '—'}
                    </Text>
                  </View>
                  <Text style={styles.diagMsg} numberOfLines={3}>{log.message}</Text>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
    </AnimatedGradientBg>
  );
}

function makeStyles(c) {
  return {
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, padding: 16 },
  title: { color: c.text, fontSize: 22, fontWeight: '700', marginBottom: 16 },
  disclaimerBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(251,191,36,0.10)',
    borderWidth: 1, borderColor: '#fbbf24',
    borderRadius: 12, padding: 14, marginBottom: 20,
  },
  disclaimerContent: { flex: 1 },
  disclaimerTitle: { color: '#fbbf24', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  disclaimerBody: { color: c.textSub, fontSize: 12, lineHeight: 18 },
  section: { marginBottom: 24 },
  sectionTitle: { color: c.textSub, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  body: { color: c.textSub, fontSize: 14, fontWeight: '300', lineHeight: 22 },
  note: { color: c.textMuted, fontSize: 12, fontWeight: '300', lineHeight: 18, marginBottom: 10 },
  providerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.bgCard, borderRadius: 12, borderWidth: 1, borderColor: c.border,
    padding: 14, marginBottom: 8,
  },
  provLogo: { fontSize: 22 },
  provInfo: { flex: 1 },
  provName: { fontSize: 15, fontWeight: '700' },
  provAttrib: { color: c.textMuted, fontSize: 11, marginTop: 2 },
  provFree: { color: c.textMuted, fontSize: 11, fontWeight: '300', marginTop: 2 },
  extLink: { color: c.accent, fontSize: 16 },
  methodRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  methodText: { flex: 1 },
  methodTitle: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  methodBody: { color: c.textMuted, fontSize: 12, lineHeight: 18 },
  extCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: c.bgCard, borderRadius: 10, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: c.border,
  },
  extLogo: { fontSize: 20 },
  extInfo: { flex: 1 },
  extName: { color: c.text, fontSize: 14, fontWeight: '600' },
  extNote: { color: c.textMuted, fontSize: 12, fontWeight: '300', marginTop: 2 },
  extArrow: { color: c.accent, fontSize: 14 },
  policyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: c.bgCard, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: c.border, marginBottom: 20,
  },
  policyBtnText: { flex: 1, color: c.accent, fontSize: 14, fontWeight: '500' },
  closePolicy: {
    position: 'absolute', top: 52, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: c.bgCard, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: c.border,
  },
  closePolicyText: { color: c.textMuted, fontSize: 13 },
  // ── Versione & diagnostica ──────────────────────────────────────────────
  versionRow: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
  versionText: { color: c.textMuted, fontSize: 11, opacity: 0.6 },
  diagSection: {
    backgroundColor: c.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: '#f59e0b44',
    padding: 14, marginBottom: 12,
  },
  diagHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  diagTitle: { flex: 1, color: '#f59e0b', fontSize: 13, fontWeight: '700' },
  diagClear: {
    backgroundColor: '#f59e0b22', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  diagClearText: { color: '#f59e0b', fontSize: 12, fontWeight: '600' },
  diagEmpty: { color: '#4ade80', fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  diagEntry: {
    borderTopWidth: 1, borderTopColor: c.border,
    paddingTop: 10, marginTop: 6,
  },
  diagEntryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  diagContext: { color: '#f59e0b', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  diagTs: { color: c.textMuted, fontSize: 10 },
  diagMsg: { color: c.textSub, fontSize: 11, lineHeight: 16, fontFamily: 'monospace' },
  };
}
