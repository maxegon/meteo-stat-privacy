import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const LAST_UPDATE = '2 giugno 2026';
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
        <Text style={styles.subtitle}>OnlyOneMeteo</Text>
        <Text style={styles.updated}>Ultimo aggiornamento: {LAST_UPDATE}</Text>

        <Section title="1. Titolare del trattamento">
          {`Il titolare del trattamento dei dati è:\n\n${TITOLARE}\n\nPer qualsiasi domanda relativa alla privacy puoi scrivere all'indirizzo email sopra indicato.`}
        </Section>

        <Section title="2. Quali dati raccogliamo">
          {`L'app raccoglie esclusivamente i seguenti dati:\n\n• Posizione geografica (latitudine e longitudine): solo se l'utente concede esplicitamente il permesso. Non viene memorizzata sul dispositivo né su server propri. Viene trasmessa ai servizi meteo terzi descritti al punto 4 esclusivamente per ottenere le previsioni meteo.\n\n• Città cercate manualmente: vengono salvate localmente sul dispositivo (tramite AsyncStorage) per mostrare le ricerche recenti. Non vengono mai trasmesse a terzi né a server propri.\n\nL'app NON raccoglie: nome, email, numeri di telefono, dati di navigazione, identificatori pubblicitari, dati biometrici, dati di pagamento.`}
        </Section>

        <Section title="3. Finalità del trattamento">
          {`I dati di posizione vengono trattati esclusivamente per:\n\n• Mostrare le previsioni meteo per la posizione attuale dell'utente\n• Identificare la città corrispondente alle coordinate GPS (geocoding inverso)\n\nNon vengono utilizzati per profilazione, pubblicità, analisi comportamentale o qualsiasi altra finalità.`}
        </Section>

        <Section title="4. Trasmissione a terze parti">
          {`Le coordinate GPS vengono trasmesse ai seguenti servizi terzi, esclusivamente al momento della richiesta delle previsioni:\n\n• Open-Meteo (open-meteo.com)\n  Server: Unione Europea\n  Privacy: https://open-meteo.com/en/terms\n  Dati trasmessi: latitudine, longitudine\n\n• OpenWeatherMap (openweathermap.org)\n  Server: Stati Uniti d'America\n  Privacy: https://openweather.co.uk/privacy-policy\n  Dati trasmessi: latitudine, longitudine\n  Nota: trasferimento di dati extra-UE ai sensi dell'art. 44 GDPR, coperto dalle Standard Contractual Clauses di OpenWeather Ltd.\n\n• WeatherAPI (weatherapi.com)\n  Server: Stati Uniti d'America\n  Privacy: https://www.weatherapi.com/privacy.aspx\n  Dati trasmessi: latitudine, longitudine\n  Nota: trasferimento di dati extra-UE ai sensi dell'art. 44 GDPR.\n\nNessun altro soggetto terzo riceve i tuoi dati. L'app non utilizza SDK pubblicitari, analytics o tracciamento.`}
        </Section>

        <Section title="5. Base giuridica">
          {`Il trattamento dei dati di posizione si basa sul consenso esplicito dell'utente (art. 6, par. 1, lett. a) del GDPR), espresso al momento della concessione del permesso di geolocalizzazione tramite il sistema operativo iOS/Android.\n\nIl consenso può essere revocato in qualsiasi momento dalle Impostazioni del dispositivo → Privacy → Posizione → OnlyOneMeteo.`}
        </Section>

        <Section title="6. Conservazione dei dati">
          {`L'app non memorizza i dati di posizione. Le coordinate GPS vengono utilizzate in tempo reale per la richiesta meteo e non vengono salvate né sul dispositivo né su alcun server.\n\nLe città cercate manualmente vengono salvate localmente sul dispositivo e possono essere cancellate in qualsiasi momento disinstallando l'app o cancellando i dati dell'app dalle impostazioni del dispositivo.`}
        </Section>

        <Section title="7. I tuoi diritti (GDPR)">
          {`Ai sensi degli artt. 15-22 del GDPR hai il diritto di:\n\n• Accesso: sapere quali dati trattiamo (art. 15)\n• Rettifica: correggere dati inesatti (art. 16)\n• Cancellazione ("diritto all'oblio"): richiedere la cancellazione (art. 17)\n• Limitazione: limitare il trattamento (art. 18)\n• Portabilità: ricevere i tuoi dati in formato leggibile (art. 20)\n• Opposizione: opporti al trattamento (art. 21)\n• Revoca del consenso: in qualsiasi momento, senza pregiudizio per la liceità del trattamento precedente (art. 7)\n\nPoiché l'app non conserva dati su server propri, la revoca del consenso GPS dalle impostazioni del dispositivo è sufficiente a interrompere qualsiasi trattamento.\n\nPer esercitare i tuoi diritti: ${TITOLARE}`}
        </Section>

        <Section title="8. Disclaimer previsioni meteo">
          {`Le previsioni meteo mostrate nell'app sono fornite da servizi terzi (Open-Meteo, OpenWeatherMap, WeatherAPI) e sono da considerarsi indicative. OnlyOneMeteo non garantisce l'accuratezza, la completezza o l'aggiornamento delle previsioni.\n\nL'app non si assume alcuna responsabilità per decisioni prese dall'utente sulla base delle informazioni mostrate, incluse ma non limitate a: attività all'aperto, navigazione, eventi, spostamenti.\n\nIn caso di condizioni meteorologiche potenzialmente pericolose, fare sempre riferimento al Servizio Meteo dell'Aeronautica Militare (meteoam.it) o al servizio meteo ufficiale della propria regione.`}
        </Section>

        <Section title="9. Sicurezza">
          {`L'app non trasmette dati su connessioni non cifrate. Tutte le chiamate ai servizi meteo avvengono tramite HTTPS. L'app non dispone di un proprio backend, server o database, eliminando qualsiasi rischio di violazione dei dati lato server.`}
        </Section>

        <Section title="10. Minori">
          {`L'app non è destinata a minori di 16 anni e non raccoglie consapevolmente dati di minori. Se sei un genitore e ritieni che tuo figlio abbia utilizzato l'app fornendo dati personali, contattaci all'indirizzo sopra indicato.`}
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
