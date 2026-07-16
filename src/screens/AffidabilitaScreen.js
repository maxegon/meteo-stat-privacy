import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedGradientBg from '../components/AnimatedGradientBg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const ENTI = [
  {
    nome: 'WMO — Organizzazione Meteorologica Mondiale',
    logo: '🌐',
    desc: 'Agenzia ONU che coordina gli standard internazionali dei servizi meteorologici. Pubblica linee guida e statistiche di accuratezza dei modelli globali.',
    url: 'https://www.wmo.int',
    affidabilita: 'Riferimento istituzionale mondiale',
    colore: '#38bdf8',
  },
  {
    nome: 'ECMWF — Centro Europeo per le Previsioni Meteo',
    logo: '🇪🇺',
    desc: 'Considerato il modello previsionale più accurato al mondo per il medio termine (3-10 giorni). Pubblica ogni anno verifiche tecniche indipendenti dei propri modelli.',
    url: 'https://www.ecmwf.int/en/forecasts/charts/monitoring',
    affidabilita: 'Il modello più preciso al mondo (medio termine)',
    colore: '#818cf8',
  },
  {
    nome: 'Aeronautica Militare — Servizio Meteo Italia',
    logo: '✈️',
    desc: 'Servizio meteorologico ufficiale dello Stato italiano. Responsabile delle previsioni per l\'aviazione civile e militare, con standard di accuratezza certificati ICAO.',
    url: 'https://www.meteoam.it',
    affidabilita: 'Servizio meteo ufficiale italiano',
    colore: '#4ade80',
  },
  {
    nome: 'ForecastAdvisor',
    logo: '📊',
    desc: 'Sito indipendente che confronta l\'accuratezza storica di decine di app meteo città per città, basandosi sui dati reali osservati.',
    url: 'https://www.forecastadvisor.com',
    affidabilita: 'Confronto indipendente tra app',
    colore: '#fb923c',
  },
];

const PROVIDER_RATING = [
  {
    nome: 'Open-Meteo',
    colore: '#38bdf8',
    logo: '🌐',
    modello: 'ECMWF + DWD + NOAA',
    giorni: '16 giorni orari',
    attivo: true,
    punti: [
      'Usa i modelli numerici migliori al mondo',
      'Aggiornato ogni ora',
      'Nessuna interpolazione commerciale sui dati',
      'Open source e verificabile',
    ],
    limiti: ['Nessun team di meteorologi che corregge manualmente'],
    voto: 5,
  },
  {
    nome: 'MET Norway (Yr.no)',
    colore: '#f59e0b',
    logo: '🇳🇴',
    // Fonte ufficiale ente governativo — richiesta policy Google Play "Misleading Claims"
    fonteUfficiale: { label: 'Sito ufficiale MET Norway — www.met.no', url: 'https://www.met.no' },
    modello: 'MEPS + ECMWF (MetCoOp)',
    giorni: '9-10 giorni orari',
    attivo: true,
    punti: [
      'Modello numerico nordico di altissima qualità (MEPS)',
      'Collaborazione tra servizi meteo di 4 Paesi',
      'Open data NLOD + CC BY 4.0 — nessuna API key',
      'Molto accurato per Europa alpina e montuosa',
    ],
    limiti: [
      'Ottimizzato per le aree nordiche (Norvegia, Svezia, Finlandia)',
      'Meno testato per il Mediterraneo meridionale',
    ],
    voto: 4,
  },
  {
    nome: 'OpenWeatherMap',
    colore: '#fb923c',
    logo: '🟠',
    modello: 'Modelli propri + stazioni locali',
    giorni: '5 giorni ogni 3 ore',
    attivo: true,
    punti: [
      'Integra dati da 40.000+ stazioni meteo',
      'Buona accuratezza nei primi 1-3 giorni',
      'Aggiornamenti frequenti',
    ],
    limiti: ['Qualità variabile dopo il 3° giorno', 'Architettura non open source, documentazione tecnica interna'],
    voto: 3,
  },
  {
    nome: 'WeatherAPI',
    colore: '#a78bfa',
    logo: '🟣',
    modello: 'Aggregatore di più modelli',
    giorni: '3 giorni orari',
    attivo: true,
    punti: [
      'Aggrega più fonti per ridurre l\'errore',
      'Include qualità dell\'aria e indice UV',
      'Allerte meteo integrate',
    ],
    limiti: ['Solo 3 giorni nel piano gratuito', 'Composizione del modello aggregato non documentata pubblicamente'],
    voto: 3,
  },
  {
    nome: 'Brightsky / DWD',
    colore: '#34d399',
    logo: '🇩🇪',
    fonteUfficiale: { label: 'Sito ufficiale DWD — www.dwd.de', url: 'https://www.dwd.de' },
    modello: 'ICON (Deutscher Wetterdienst)',
    giorni: '10 giorni orari',
    attivo: false,
    punti: [
      'ICON è uno dei 3 migliori modelli globali insieme a ECMWF e GFS',
      'Alta risoluzione sull\'Europa Centrale (~6 km)',
      'Open data CC BY 4.0 — nessuna API key',
      'Aggiornato ogni 3 ore',
    ],
    limiti: [
      'Ottimizzato per Germania e Europa Centrale',
      'Meno preciso per zone costiere mediterranee',
    ],
    voto: 4,
  },
  {
    nome: 'Visual Crossing',
    colore: '#f472b6',
    logo: '📊',
    modello: 'Aggregatore + machine learning',
    giorni: '15 giorni',
    attivo: false,
    punti: [
      'Aggrega dati da più modelli globali',
      'Include dati storici climatici (dal 1979)',
      'API ben documentata con output flessibile',
    ],
    limiti: [
      'Piano gratuito limitato (1.000 record/giorno)',
      'Trasparenza modelli ridotta',
      'API key richiesta — trasferimento extra-UE',
    ],
    voto: 3,
  },
  {
    nome: '7Timer!',
    colore: '#60a5fa',
    logo: '7️⃣',
    fonteUfficiale: { label: 'Sito ufficiale NOAA — www.noaa.gov', url: 'https://www.noaa.gov' },
    modello: 'GFS (NOAA)',
    giorni: '8 giorni (192 ore)',
    attivo: false,
    punti: [
      'Completamente gratuito, nessuna API key',
      'Dati GFS/NOAA diretti senza intermediari',
      'Copertura globale senza restrizioni',
    ],
    limiti: [
      'Modello GFS generalmente meno preciso di ECMWF sull\'Europa secondo letteratura di settore',
      'Aggiornamento ogni 6-12 ore (più lento)',
      'Interfaccia dati rudimentale, meno parametri',
    ],
    voto: 2,
  },
  {
    nome: 'Tomorrow.io',
    colore: '#e879f9',
    logo: '🔮',
    modello: 'Proprietario + satellite + IoT',
    giorni: '6 giorni orari (piano free)',
    attivo: false,
    punti: [
      'Dati iperlocali da sensori IoT e satelliti',
      'Allerte meteo avanzate e personalizzabili',
      'Include qualità dell\'aria, UV e rischio incendi',
    ],
    limiti: [
      'Piano gratuito molto limitato (25 chiamate/ora)',
      'Architettura proprietaria, documentazione tecnica non pubblica',
      'API key richiesta — trasferimento extra-UE',
    ],
    voto: 3,
  },
];

const ACCURATEZZA_GIORNI = [
  { giorno: '1 giorno',  pct: 95, colore: '#22c55e', nota: 'Altissima affidabilità' },
  { giorno: '2 giorni',  pct: 90, colore: '#4ade80', nota: 'Ottima' },
  { giorno: '3 giorni',  pct: 82, colore: '#86efac', nota: 'Buona' },
  { giorno: '5 giorni',  pct: 68, colore: '#fbbf24', nota: 'Accettabile' },
  { giorno: '7 giorni',  pct: 53, colore: '#fb923c', nota: 'Incerta' },
  { giorno: '10 giorni', pct: 38, colore: '#f87171', nota: 'Indicativa' },
  { giorno: '14+ giorni',pct: 22, colore: '#ef4444', nota: 'Solo tendenze' },
];

const ACCURATEZZA_PARAMETRI = [
  { param: 'Temperatura',      pct1g: 97, pct3g: 88, pct7g: 60, icon: '🌡️' },
  { param: 'Precipitazioni',   pct1g: 85, pct3g: 70, pct7g: 45, icon: '🌧️' },
  { param: 'Vento (velocità)', pct1g: 88, pct3g: 72, pct7g: 48, icon: '💨' },
  { param: 'Copertura nuv.',   pct1g: 80, pct3g: 65, pct7g: 40, icon: '☁️' },
  { param: 'Temporali',        pct1g: 75, pct3g: 55, pct7g: 30, icon: '⛈️' },
];

const APPROFONDIMENTI = [
  { nome: 'Verifiche tecniche ECMWF', url: 'https://www.ecmwf.int/en/forecasts/charts/monitoring', logo: '📈' },
  { nome: 'WMO — Standard di verifica', url: 'https://www.wmo.int/pages/prog/www/DPFS/DeprecatedPages/Verification/index_en.html', logo: '📋' },
  { nome: 'ForecastAdvisor — Classifica app', url: 'https://www.forecastadvisor.com', logo: '🏆' },
  { nome: 'ECMWF vs altri modelli (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Weather_forecasting#Ensembles', logo: '📖' },
];

function Stelle({ n }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <MaterialCommunityIcons
          key={i}
          name={i <= n ? 'star' : 'star-outline'}
          size={14}
          color={i <= n ? '#fbbf24' : '#38bdf8'}
        />
      ))}
    </View>
  );
}

export default function AffidabilitaScreen() {
  const { colors: c, dark } = useTheme();
  const styles = useMemo(() => makeStyles(c, dark), [c, dark]);
  return (
    <AnimatedGradientBg>
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Affidabilità delle previsioni Meteo</Text>

        {/* Intro */}
        <View style={styles.introCard}>
          <Text style={styles.introText}>
            Non esiste un ente unico che "certifica" le app meteo, ma esistono organismi internazionali e strumenti indipendenti che valutano l'accuratezza dei modelli previsionali su cui si basano.
          </Text>
        </View>

        {/* Enti di riferimento */}
        <Text style={styles.sectionTitle}>Enti di riferimento</Text>
        {ENTI.map(e => (
          <TouchableOpacity key={e.nome} style={[styles.enteCard, { borderColor: e.colore + '40' }]} onPress={() => Linking.openURL(e.url)}>
            <View style={styles.enteHeader}>
              <Text style={styles.enteLogo}>{e.logo}</Text>
              <View style={styles.enteInfo}>
                <Text style={[styles.enteNome, { color: e.colore }]}>{e.nome}</Text>
                <Text style={styles.enteAffid}>{e.affidabilita}</Text>
              </View>
              <MaterialCommunityIcons name="open-in-new" size={16} color="#38bdf8" />
            </View>
            <Text style={styles.enteDesc}>{e.desc}</Text>
            {/* URL visibile in chiaro — richiesta policy Google Play "Missing Source Link for Government Information" */}
            <Text style={styles.enteUrl}>🔗 {e.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.enteDisclaimer}>
          <Text style={styles.enteDisclaimerText}>
            ⚠️ Gli enti elencati non hanno certificato né endorsato questa applicazione. Sono riportati come riferimenti scientifici internazionali per la valutazione dei modelli previsionali.
          </Text>
        </View>

        {/* ACCURATEZZA PREVISIONI */}
        <Text style={styles.sectionTitle}>Accuratezza delle previsioni</Text>
        <View style={styles.accCard}>
          <Text style={styles.accSubtitle}>Per orizzonte temporale</Text>
          <Text style={styles.accNote}>Fonte: letteratura meteorologica internazionale (ECMWF, WMO) — valori approssimativi, media europea, temperatura a 2m</Text>
          {ACCURATEZZA_GIORNI.map(r => (
            <View key={r.giorno} style={styles.accRow}>
              <Text style={styles.accLabel}>{r.giorno}</Text>
              <View style={styles.accBarBg}>
                <View style={[styles.accBarFill, { width: `${r.pct}%`, backgroundColor: r.colore }]} />
              </View>
              <Text style={[styles.accPct, { color: r.colore }]}>{r.pct}%</Text>
              <Text style={styles.accNota}>{r.nota}</Text>
            </View>
          ))}
        </View>

        <View style={styles.accCard}>
          <Text style={styles.accSubtitle}>Per parametro meteo</Text>
          <Text style={styles.accNote}>Medie di settore a scopo illustrativo — non costituiscono garanzia sull'accuratezza delle previsioni di questa app</Text>
          <View style={styles.paramHeader}>
            <Text style={[styles.paramCol, { flex: 2 }]}>Parametro</Text>
            <Text style={styles.paramCol}>1 giorno</Text>
            <Text style={styles.paramCol}>3 giorni</Text>
            <Text style={styles.paramCol}>7 giorni</Text>
          </View>
          {ACCURATEZZA_PARAMETRI.map(r => (
            <View key={r.param} style={styles.paramRow}>
              <Text style={[styles.paramColText, { flex: 2 }]}>{r.icon} {r.param}</Text>
              <Text style={[styles.paramPct, { color: '#22c55e' }]}>{r.pct1g}%</Text>
              <Text style={[styles.paramPct, { color: '#fbbf24' }]}>{r.pct3g}%</Text>
              <Text style={[styles.paramPct, { color: '#f87171' }]}>{r.pct7g}%</Text>
            </View>
          ))}
        </View>

        {/* Valutazione provider integrati */}
        <Text style={styles.sectionTitle}>I provider di questa app</Text>
        <View style={styles.provDisclaimer}>
          <Text style={styles.provDisclaimerText}>
            Le valutazioni riflettono le caratteristiche tecniche documentate pubblicamente e non costituiscono un confronto scientifico certificato. Le stelle sono indicatori orientativi basati sulla documentazione ufficiale di ciascun provider.
          </Text>
        </View>
        {PROVIDER_RATING.map(p => (
          <View key={p.nome} style={[styles.provCard, { borderColor: p.colore + '40' }]}>
            <View style={styles.provHeader}>
              <Text style={styles.provLogo}>{p.logo}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={[styles.provNome, { color: p.colore }]}>{p.nome}</Text>
                  <View style={[styles.provBadge, { backgroundColor: p.attivo ? '#22c55e20' : '#94a3b820', borderColor: p.attivo ? '#22c55e60' : '#94a3b860' }]}>
                    <Text style={[styles.provBadgeText, { color: p.attivo ? '#22c55e' : '#94a3b8' }]}>
                      {p.attivo ? '● Attivo' : '○ In valutazione'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.provModello}>{p.modello}</Text>
                <Text style={styles.provGiorni}>📅 {p.giorni}</Text>
              </View>
              <Stelle n={p.voto} />
            </View>
            <View style={styles.provPunti}>
              {p.punti.map((punto, i) => (
                <Text key={i} style={styles.provPunto}>✅ {punto}</Text>
              ))}
              {p.limiti.map((limite, i) => (
                <Text key={i} style={styles.provLimite}>⚠️ {limite}</Text>
              ))}
              {p.fonteUfficiale && (
                <Text style={styles.provFonte} onPress={() => Linking.openURL(p.fonteUfficiale.url)}>
                  🏛️ {p.fonteUfficiale.label} ↗
                </Text>
              )}
            </View>
          </View>
        ))}

        {/* Come l'app calcola le previsioni */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>🔢 Come l'app calcola le previsioni mostrate</Text>
          <Text style={styles.tipText}>
            L'app non mostra le previsioni di un singolo provider, ma le media tra tutte le fonti disponibili:{'\n\n'}
            <Text style={{ fontWeight: '700' }}>• Tempo attuale e giorni 1–7:</Text> temperatura, icona e condizioni sono la media (o la condizione prevalente) tra tutti gli 8 provider attivi. Se 6 fonti su 8 dicono "sole", l'app mostra il sole.{'\n\n'}
            <Text style={{ fontWeight: '700' }}>• Previsioni ora per ora:</Text> ogni slot orario mostra la media dei provider che hanno dati per quell'ora. Per le prime 48h ci sono fino a 8 fonti; per il giorno 3 ne restano 2-3; dall'ottavo giorno in poi solo Open-Meteo.{'\n\n'}
            <Text style={{ fontWeight: '700' }}>• Giorni 8–16:</Text> solo Open-Meteo, l'unico provider gratuito che copre 16 giorni. Questi giorni sono contrassegnati con il badge "OM".{'\n\n'}
            <Text style={{ fontWeight: '700' }}>• Dati meteo per fonte:</Text> in questa sezione puoi vedere i dati originali di ogni singolo provider, senza alcuna elaborazione.
          </Text>
        </View>

        {/* Consiglio pratico */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Come interpretare il confronto</Text>
          <Text style={styles.tipText}>
            Quando i provider attivi sono d'accordo (scostamento basso nel tab Confronto), l'incertezza è minore. Quando divergono molto, c'è incertezza reale — nessun modello è "giusto" in anticipo.{'\n\n'}
            Per l'Italia, il modello ECMWF, su cui si basa Open-Meteo, è considerato dalla comunità meteorologica internazionale tra i più accurati per il medio termine (fonte: ECMWF Forecast Verification). MET Norway, grazie all'alta risoluzione del modello MEPS sulle aree montuose, tende a offrire risultati più dettagliati per le zone alpine. Per i primi 1-2 giorni, i servizi con team di meteorologi locali — come il Servizio Meteo dell'Aeronautica Militare — tendono ad essere più precisi nelle previsioni locali.
          </Text>
        </View>

        {/* Link approfondimenti */}
        <Text style={styles.sectionTitle}>Approfondimenti</Text>
        {APPROFONDIMENTI.map(a => (
          <TouchableOpacity key={a.nome} style={styles.linkRow} onPress={() => Linking.openURL(a.url)}>
            <Text style={styles.linkLogo}>{a.logo}</Text>
            <Text style={styles.linkNome}>{a.nome}</Text>
            <MaterialCommunityIcons name="open-in-new" size={14} color="#38bdf8" />
          </TouchableOpacity>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
    </AnimatedGradientBg>
  );
}

function makeStyles(c, dark) {
  return {
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1, padding: 16 },
  title: { color: dark ? c.text : c.accent, fontSize: 28, fontWeight: '700', marginBottom: 12, textAlign: 'center', lineHeight: 36 },
  introCard: { backgroundColor: c.bgCard, borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: c.border },
  introText: { color: c.textSub, fontSize: 13, fontWeight: '300', lineHeight: 20 },
  sectionTitle: { color: c.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
  enteCard: { backgroundColor: c.bgCard, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 10 },
  enteHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  enteLogo: { fontSize: 24 },
  enteInfo: { flex: 1 },
  enteNome: { color: c.text, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  enteAffid: { color: c.textMuted, fontSize: 11, fontWeight: '300', marginTop: 2 },
  enteDesc: { color: c.textMuted, fontSize: 12, fontWeight: '300', lineHeight: 18 },
  enteUrl: { color: c.accent, fontSize: 12, marginTop: 6, textDecorationLine: 'underline' },
  enteDisclaimer: { backgroundColor: '#f59e0b10', borderRadius: 10, borderWidth: 1, borderColor: '#f59e0b30', padding: 10, marginBottom: 20, marginTop: 2 },
  enteDisclaimerText: { color: c.textMuted, fontSize: 11, fontWeight: '300', lineHeight: 17 },
  provDisclaimer: { backgroundColor: c.bgCard, borderRadius: 10, borderWidth: 1, borderColor: c.border, padding: 10, marginBottom: 10 },
  provDisclaimerText: { color: c.textMuted, fontSize: 11, fontWeight: '300', lineHeight: 17, fontStyle: 'italic' },
  provCard: { backgroundColor: c.bgCard, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 10 },
  provHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  provLogo: { fontSize: 20 },
  provNome: { color: c.text, fontSize: 14, fontWeight: '700' },
  provBadge: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1 },
  provBadgeText: { fontSize: 9, fontWeight: '600' },
  provModello: { color: c.textMuted, fontSize: 11, fontWeight: '300', marginTop: 2 },
  provGiorni: { color: c.textMuted, fontSize: 11, fontWeight: '300', marginTop: 1 },
  provPunti: { gap: 4 },
  provPunto: { color: c.textMuted, fontSize: 12, fontWeight: '300' },
  provLimite: { color: '#b45309', fontSize: 12, fontWeight: '300' },
  provFonte: { color: c.accent, fontSize: 12, marginTop: 4, textDecorationLine: 'underline' },
  tipCard: { backgroundColor: c.accent + '15', borderRadius: 12, borderWidth: 1, borderColor: c.accent + '30', padding: 14, marginBottom: 20, marginTop: 8 },
  tipTitle: { color: c.accent, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  tipText: { color: c.textSub, fontSize: 12, fontWeight: '300', lineHeight: 19 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  linkLogo: { fontSize: 18 },
  linkNome: { flex: 1, color: c.textSub, fontSize: 13, fontWeight: '300' },
  accCard: { backgroundColor: c.bgCard, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 14, marginBottom: 12 },
  accSubtitle: { color: c.text, fontSize: 13, fontWeight: '700', marginBottom: 4 },
  accNote: { color: c.textMuted, fontSize: 10, fontWeight: '300', marginBottom: 12 },
  accRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  accLabel: { color: c.textSub, fontSize: 11, width: 72 },
  accBarBg: { flex: 1, height: 8, backgroundColor: c.border, borderRadius: 4, overflow: 'hidden' },
  accBarFill: { height: '100%', borderRadius: 4 },
  accPct: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
  accNota: { color: c.textMuted, fontSize: 10, width: 72 },
  paramHeader: { flexDirection: 'row', marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: c.border },
  paramCol: { flex: 1, color: c.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', textAlign: 'center' },
  paramRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border },
  paramColText: { color: c.textSub, fontSize: 12 },
  paramPct: { flex: 1, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  };
}
