import 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';

// ⚠️  Sostituisci SENTRY_DSN con la stringa che trovi su sentry.io → Project → Settings → DSN
const SENTRY_DSN = 'https://cdb1fb2a942313c6804638af266d7a62@o4511524236689408.ingest.de.sentry.io/4511524250976336';

Sentry.init({
  dsn: SENTRY_DSN,
  // Campiona il 20% delle sessioni normali (risparmia quota gratuita)
  // Gli errori vengono sempre inviati al 100%
  tracesSampleRate: 0.2,
  // In sviluppo mostra gli errori nella console invece di inviarli
  enabled: !__DEV__,
});
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, ActivityIndicator, LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './src/screens/HomeScreen';
import StatsScreen from './src/screens/StatsScreen';
import InfoScreen from './src/screens/InfoScreen';
import MapScreen from './src/screens/MapScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { WeatherProvider } from './src/context/WeatherContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import UpdateBanner from './src/components/UpdateBanner';
import { logError } from './src/utils/errorLogger';

// Nasconde il box giallo LogBox ("Open debugger to view warnings.") che compare
// SOLO nella build di sviluppo — non è mai presente nell'app pubblicata sugli
// store. I warning restano comunque leggibili nel terminale Metro. Toglie
// l'overlay che copriva il fondo della UI in dev.
if (__DEV__) {
  LogBox.ignoreAllLogs();
}

const Tab = createBottomTabNavigator();
const ONBOARDING_KEY = 'onboarding_accepted_v1';

const TAB_ICONS = {
  Home: 'weather-partly-cloudy',
  Statistiche: 'chart-bar',
  Radar: 'radar',
  Info: 'information-outline',
};

function AppNavigator() {
  const { colors: c, dark } = useTheme();
  const insets = useSafeAreaInsets();
  // INVARIANTE UI — tab bar deve restare sempre completamente visibile sopra
  // la barra di sistema (Android: edgeToEdgeEnabled la sovrappone ai tasti di
  // navigazione se non riserviamo lo spazio; iOS: home indicator).
  // FIX 2026-08-08 (1/2): sostituito material-top-tabs con bottom-tabs — non
  // ha risolto perché il problema reale è a monte.
  // FIX 2026-08-08 (2/2): bug noto/aperto di react-native-safe-area-context
  // su Android 15 edge-to-edge (3-tasti): useSafeAreaInsets() a volte
  // restituisce insets.bottom = 0 invece del valore reale — vedi
  // github.com/AppAndFlow/react-native-safe-area-context/issues/667 e
  // github.com/react-navigation/react-navigation/issues/12769. initialWindowMetrics
  // è catturato nativamente all'avvio, prima del bug, e in molti report
  // risulta corretto anche quando l'hook dinamico si azzera — lo usiamo
  // come fallback (max con l'hook, mai peggio del solo hook).
  const androidFallbackBottomInset = Platform.OS === 'android'
    ? (initialWindowMetrics?.insets.bottom ?? 0)
    : 0;
  // FIX 2026-08-22 — segnalato: su alcuni dispositivi Android (3 tasti,
  // edge-to-edge) sia l'hook che initialWindowMetrics possono restituire 0
  // (bug upstream ancora aperto, vedi link sopra) e la tab bar finisce
  // incollata alla barra di navigazione di sistema ("tagliata" a schermo).
  // Pavimento minimo di sicurezza solo su Android: non elimina il bug a
  // monte, ma garantisce sempre un minimo di respiro visivo anche quando
  // entrambe le fonti di inset falliscono.
  const ANDROID_MIN_BOTTOM_INSET = 16;
  const bottomInset = Platform.OS === 'android'
    ? Math.max(insets.bottom, androidFallbackBottomInset, ANDROID_MIN_BOTTOM_INSET)
    : insets.bottom;
  const TAB_BAR_CONTENT_HEIGHT = 54;
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: dark ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.97)',
            borderTopColor: c.border,
            borderTopWidth: 1,
            elevation: 0,
            shadowOpacity: 0,
            height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
            paddingBottom: bottomInset,
            paddingTop: 6,
          },
          tabBarActiveTintColor: c.accent,
          tabBarInactiveTintColor: dark ? 'rgba(255,255,255,0.45)' : 'rgba(2,132,199,0.50)',
          tabBarLabelStyle: { fontSize: 10, marginTop: 2, fontWeight: '600' },
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS[route.name]}
              size={22}
              color={color}
            />
          ),
          tabBarPressColor: c.border,
        })}
      >
        <Tab.Screen name="Home">
          {(props) => <ErrorBoundary label="Meteo"><HomeScreen {...props} /></ErrorBoundary>}
        </Tab.Screen>
        <Tab.Screen name="Statistiche">
          {(props) => <ErrorBoundary label="Statistiche"><StatsScreen {...props} /></ErrorBoundary>}
        </Tab.Screen>
        <Tab.Screen name="Radar">
          {(props) => <ErrorBoundary label="Radar"><MapScreen {...props} /></ErrorBoundary>}
        </Tab.Screen>
        <Tab.Screen name="Info">
          {(props) => <ErrorBoundary label="Info"><InfoScreen {...props} /></ErrorBoundary>}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

function App() {
  const [onboardingDone, setOnboardingDone] = useState(null);

  useEffect(() => {
    // ── Global error handler per errori JS non gestiti ──────────────────────
    const prevHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      logError(isFatal ? 'FATAL' : 'unhandled_js', error);
      prevHandler?.(error, isFatal);
    });

    // ── Lettura onboarding con recovery per AsyncStorage corrotto/bloccato ──
    const timeout = setTimeout(() => setOnboardingDone(false), 3000);
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then(val => { clearTimeout(timeout); setOnboardingDone(val === 'true'); })
      .catch(async (err) => {
        clearTimeout(timeout);
        logError('AsyncStorage:init', err);
        await AsyncStorage.clear().catch(() => {});
        setOnboardingDone(false);
      });
  }, []);

  const handleOnboardingComplete = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    setOnboardingDone(true);
  };

  // Mostra uno splash di caricamento invece di null (evita blank screen su iPad)
  if (onboardingDone === null) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0f172a' }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
            <ActivityIndicator size="large" color="#38bdf8" />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  if (!onboardingDone) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary label="App">
          <ThemeProvider>
            <WeatherProvider>
              <AppNavigator />
              <UpdateBanner />
            </WeatherProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Sentry.wrap cattura anche i crash nativi (non solo JS)
export default Sentry.wrap(App);
