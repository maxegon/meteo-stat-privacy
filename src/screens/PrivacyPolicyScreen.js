import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LAST_UPDATE = '15 ottobre 2026';
const TITOLARE = 'Maxi Egon — maxegonit@gmail.com';

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.body}>{children}</Text>
  </View>
);

export default function PrivacyPolicyScreen({ onAccept, showAcceptButton = false }) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>Solo1Meteo</Text>
        <Text style={styles.updated}>Ultimo aggiornamento: {LAST_UPDATE}</Text>

        <Section title="1. Titolare del trattamento">
          {`Il titolare del trattamento dei dati è:\n\n${TITOLARE}\n\nPer qualsiasi domanda relativa alla privacy puoi scrivere all'indirizzo email sopra indicato.`}
        </Section>

        <Section title="2. Quali dati raccogliamo">
          {`L'app raccoglie esclusivamente i seguenti dati:\n\n• Posizione geografica (latitudine e longitudine): solo se l'utente concede esplicitamente il permesso. Non viene associata a un profilo né salvata in modo permanente. Viene trasmessa al backend tecnico dell'app e ai servizi terzi descritti al punto 4 esclusivamente per ottenere le previsioni meteo, il nome della località e la mappa radar.\n\n• Città cercate manualmente: vengono salvate localmente sul dispositivo (tramite AsyncStorage) per mostrare le ricerche recenti. Il testo cercato viene inviato al servizio di ricerca città (Open-Meteo) solo per ottenere i risultati.\n\n• Dati tecnici di errore e crash (tramite Sentry): in caso di errore o arresto anomalo vengono inviati informazioni tecniche sul dispositivo e sull'errore. L'app è configurata per non inviare intenzionalmente identificativi dell'utente né coordinate geografiche e per rimuovere le coordinate dai messaggi di errore; il servizio di ricezione può comunque vedere l'indirizzo IP della connessione, che non viene conservato secondo la configurazione del progetto.\n\nL'app NON raccoglie: nome, email, numeri di telefono, identificatori pubblicitari, dati biometrici, dati di pagamento.`}
        </Section>

        <Section title="3. Finalità del trattamento">
          {`I dati di posizione vengono trattati esclusivamente per:\n\n• Mostrare le previsioni meteo per la posizione attuale dell'utente\n• Identificare la città corrispondente alle coordinate GPS (geocoding inverso)\n\nNon vengono utilizzati per profilazione, pubblicità, analisi comportamentale o qualsiasi altra finalità.`}
        </Section>

        <Section title="4. Trasmissione a terze parti">
          {`Per fornire le previsioni, le coordinate GPS (o quelle della città scelta) transitano dal seguente sistema tecnico e dai servizi di terzi elencati.\n\nBackend tecnico dell'app (ospitato su Vercel)\nL'app non chiama direttamente la maggior parte dei provider: invia le coordinate a un backend tecnico ospitato su Vercel, che interroga i provider meteo in parallelo e calcola la media dei valori. Il backend non richiede account, non ha un database utenti e non associa le coordinate a un profilo. Può mantenere per pochi minuti una copia temporanea (cache) delle risposte per coordinate arrotondate. L'infrastruttura di hosting può registrare temporaneamente dati tecnici di connessione (ad esempio indirizzo IP e richiesta) nei propri log operativi. Il fornitore di hosting può trattare i dati anche al di fuori dell'Unione Europea.\n\nProvider meteo (interrogati dal backend con latitudine e longitudine)\n• Open-Meteo (open-meteo.com)\n• OpenWeatherMap (openweathermap.org)\n• WeatherAPI (weatherapi.com)\n• MET Norway (api.met.no)\n• Bright Sky, dati DWD (brightsky.dev)\n• Visual Crossing (visualcrossing.com)\n• 7Timer! (7timer.info)\n• Tomorrow.io (tomorrow.io)\nAlcuni di questi servizi hanno sede o server fuori dall'Unione Europea (ad esempio negli Stati Uniti): il trasferimento avviene ai sensi degli artt. 44 e seguenti del GDPR, sulla base degli strumenti adottati da ciascun fornitore. Se il backend non è raggiungibile, l'app può contattare direttamente alcuni di questi provider.\n\nGeocodifica e mappe\n• Nominatim / OpenStreetMap (nominatim.openstreetmap.org): riceve le coordinate per ricavare il nome del quartiere o della città (anche tramite il backend). Fondazione OpenStreetMap, Regno Unito.\n• Tile della mappa OpenStreetMap (tile.openstreetmap.org): la mappa radar richiede le tile della zona visualizzata; il servizio riceve l'indirizzo IP e l'area richiesta.\n• RainViewer (rainviewer.com): fornisce i dati e le tile del radar delle precipitazioni; riceve l'indirizzo IP e l'area richiesta.\n• Leaflet, libreria della mappa, caricata dalla rete di distribuzione unpkg.com (indirizzo IP del dispositivo).\n\nSegnalazione errori\n• Sentry (sentry.io), con regione dati UE: riceve dati tecnici di errore e crash come descritto al punto 2.\n\nQuesti soggetti possono trattare i dati secondo le proprie informative. L'app non utilizza SDK pubblicitari, di analisi del comportamento o di tracciamento. Data la natura tecnica del servizio, l'elenco è completo alla data di aggiornamento di questa policy.`}
        </Section>

        <Section title="5. Base giuridica">
          {`Il trattamento dei dati di posizione si basa sul consenso esplicito dell'utente (art. 6, par. 1, lett. a) del GDPR), espresso al momento della concessione del permesso di geolocalizzazione tramite il sistema operativo iOS/Android.\n\nIl consenso può essere revocato in qualsiasi momento dalle Impostazioni del dispositivo → Privacy → Posizione → Solo1Meteo.`}
        </Section>

        <Section title="6. Conservazione dei dati">
          {`L'app non memorizza le coordinate GPS sul dispositivo: vengono usate in tempo reale per la richiesta meteo. Il backend mantiene solo una cache temporanea delle risposte (pochi minuti, chiave basata su coordinate arrotondate) e non crea archivi di posizione associati agli utenti. I log tecnici dell'infrastruttura di hosting possono conservare temporaneamente dati di connessione secondo le impostazioni del fornitore.\n\nLe città cercate manualmente e quelle preferite vengono salvate localmente sul dispositivo e possono essere cancellate in qualsiasi momento disinstallando l'app o cancellando i dati dell'app dalle impostazioni del dispositivo.`}
        </Section>

        <Section title="7. I tuoi diritti (GDPR)">
          {`Ai sensi degli artt. 15-22 del GDPR hai il diritto di:\n\n• Accesso: sapere quali dati trattiamo (art. 15)\n• Rettifica: correggere dati inesatti (art. 16)\n• Cancellazione ("diritto all'oblio"): richiedere la cancellazione (art. 17)\n• Limitazione: limitare il trattamento (art. 18)\n• Portabilità: ricevere i tuoi dati in formato leggibile (art. 20)\n• Opposizione: opporti al trattamento (art. 21)\n• Revoca del consenso: in qualsiasi momento, senza pregiudizio per la liceità del trattamento precedente (art. 7)\n\nPoiché l'app non crea profili utente né archivi di posizione, la revoca del consenso GPS dalle impostazioni del dispositivo è sufficiente a interrompere l'invio delle coordinate.\n\nPer esercitare i tuoi diritti: ${TITOLARE}`}
        </Section>

        <Section title="8. Disclaimer previsioni meteo">
          {`Le previsioni meteo mostrate nell'app sono fornite da servizi terzi (elencati al punto 4) e sono da considerarsi indicative. I valori mostrati sono la media dei dati disponibili ricevuti dai provider. Solo1Meteo non garantisce l'accuratezza, la completezza o l'aggiornamento delle previsioni.\n\nSolo1Meteo non sostituisce i canali ufficiali di allerta. In caso di condizioni meteorologiche potenzialmente pericolose consulta il Dipartimento della Protezione Civile (protezionecivile.gov.it), le allerte emesse dalla tua Regione e il Servizio Meteo dell'Aeronautica Militare (meteoam.it). Le segnalazioni e gli avvisi mostrati nell'app sono indicativi, derivano dai dati dei provider o da soglie di calcolo e non costituiscono allerte ufficiali.\n\nL'app non si assume alcuna responsabilità per decisioni prese dall'utente sulla base delle informazioni mostrate, incluse ma non limitate a: attività all'aperto, navigazione, eventi, spostamenti.`}
        </Section>

        <Section title="9. Sicurezza">
          {`Le comunicazioni dell'app verso il backend, i provider e i servizi di terzi avvengono tramite HTTPS. L'app non ha un sistema di account utente e non conserva un database di dati personali degli utenti; dispone però di un backend tecnico di aggregazione meteo (punto 4) che elabora le coordinate solo per rispondere alle richieste.`}
        </Section>

        <Section title="10. Minori">
          {`L'app non richiede la creazione di un account. In Italia il minore che ha compiuto 14 anni può prestare autonomamente il consenso al trattamento dei propri dati personali in relazione ai servizi della società dell'informazione (art. 2-quinquies D.Lgs. 196/2003). Per i minori di 14 anni il consenso, ad esempio al permesso di accesso alla posizione GPS, deve essere prestato o autorizzato da chi esercita la responsabilità genitoriale. L'app non raccoglie consapevolmente dati di minori di 14 anni senza tale autorizzazione. Se sei un genitore e ritieni che tuo figlio abbia fornito dati personali senza il tuo consenso, contattaci all'indirizzo sopra indicato.`}
        </Section>

        <Section title="11. Modifiche alla policy">
          {`Eventuali modifiche a questa privacy policy saranno comunicate tramite aggiornamento della data in cima al documento. L'uso continuato dell'app dopo le modifiche costituisce accettazione della policy aggiornata.`}
        </Section>

        <Section title="12. Reclami">
          {`Hai il diritto di proporre reclamo al Garante per la protezione dei dati personali (Garante Privacy Italia):\n\nSito: www.garanteprivacy.it\nEmail: garante@gpdp.it\nTel: +39 06 69677 1`}
        </Section>

        {/* Link utili */}
        <View style={styles.linksSection}>
          <Text style={styles.linksTitle}>Link policy servizi terzi</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://open-meteo.com/en/terms')}>
            <Text style={styles.link}>• Open-Meteo Terms</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://openweather.co.uk/privacy-policy')}>
            <Text style={styles.link}>• OpenWeatherMap Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.weatherapi.com/privacy.aspx')}>
            <Text style={styles.link}>• WeatherAPI Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://www.garanteprivacy.it')}>
            <Text style={styles.link}>• Garante Privacy Italia</Text>
          </TouchableOpacity>
        </View>

        {/* Bottone accetta — visibile solo nella schermata onboarding */}
        {showAcceptButton && (
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <Text style={styles.acceptText}>Ho letto e accetto la Privacy Policy</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { flex: 1, padding: 20 },
  title: { color: '#f1f5f9', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: '#38bdf8', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  updated: { color: '#94a3b8', fontSize: 11, fontWeight: '300', marginBottom: 24 },
  section: { marginBottom: 20 },
  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  body: { color: '#94a3b8', fontSize: 13, fontWeight: '300', lineHeight: 21 },
  linksSection: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  linksTitle: { color: '#94a3b8', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  link: { color: '#38bdf8', fontSize: 13, fontWeight: '300', marginBottom: 8 },
  acceptBtn: {
    backgroundColor: '#38bdf8', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 16,
  },
  acceptText: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
});
