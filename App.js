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
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, ActivityIndicator, LogBox, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
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

const Tab = createMaterialTopTabNavigator();
const ONBOARDING_KEY = 'onboarding_accepted_v1';

const TAB_ICONS = {
  Home: 'weather-partly-cloudy',
  Statistiche: 'chart-bar',
  Radar: 'radar',
  Info: 'information-outline',
};

function AppNavigator() {
  const { colors: c, dark } = useTheme();
  // INVARIANTE UI — tab bar deve restare sempre completamente visibile sopra
  // la barra di sistema (Android: edgeToEdgeEnabled la sovrappone ai tasti di
  // navigazione se non riserviamo lo spazio; iOS: home indicator). La
  // libreria (react-native-tab-view) non gestisce da sola i safe-area inset,
  // quindi li applichiamo qui esplicitamente per un comportamento identico
  // sui due piattaforme — vedi bug report tester Android 2026-07-02.
  const insets = useSafeAreaInsets();
  const TAB_BAR_CONTENT_HEIGHT = 54;
  // Android: insets.bottom si è dimostrato inaffidabile su alcuni device
  // (etichette tagliate anche forzando un minimo di 24/48px) — valore fisso,
  // non dipendente dall'hook, per garantire lo stesso spazio libero di iOS.
  const tabBarBottomInset = Platform.OS === 'android' ? 40 : insets.bottom;
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        tabBarPosition="bottom"
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,
          swipeEnabled: true,
          tabBarStyle: {
            backgroundColor: dark ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.97)',
            borderTopColor: c.border,
            borderTopWidth: 1,
            elevation: 0,
            shadowOpacity: 0,
            height: TAB_BAR_CONTENT_HEIGHT + tabBarBottomInset,
            paddingBottom: tabBarBottomInset,
          },
          tabBarActiveTintColor: c.accent,
          tabBarInactiveTintColor: dark ? 'rgba(255,255,255,0.45)' : 'rgba(2,132,199,0.50)',
          tabBarLabelStyle: { fontSize: 10, marginTop: 2, fontWeight: '600' },
          tabBarIndicatorStyle: {
            backgroundColor: c.accent,
            top: 0,
            height: 2,
          },
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name={TAB_ICONS[route.name]}
              size={22}
              color={color}
            />
          ),
          tabBarShowIcon: true,
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
