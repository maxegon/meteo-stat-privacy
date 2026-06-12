import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

// Gradiente cielo: [top-chiaro, centro, bottom-scuro]
//
// COMPORTAMENTO ATTESO (documentato anche nella schermata "Come funziona"):
// nel tema scuro lo sfondo cambia leggermente tonalità in base all'ora del
// giorno (notte/alba/mattina/mezzogiorno/pomeriggio/sera/imbrunire/tarda
// notte), restando sempre su una base blu navy — mai nero. Nel tema chiaro
// varia analogamente tra tonalità di celeste. Non è un bug se lo sfondo
// risulta diverso ricaricando l'app in momenti diversi della giornata.
function getSkyColors(dark) {
  const h = new Date().getHours();
  if (dark) {
    // Tema scuro: sempre tonalità BLU navy (MAI nero), con leggera
    // variazione di luminosità in base all'ora — INVARIANTE: niente nero,
    // ogni colore mantiene il canale blu dominante e ben visibile
    if (h >= 0  && h < 5)  return ['#1a3358', '#15294a', '#122242'];   // notte
    if (h >= 5  && h < 7)  return ['#22405e', '#1a3358', '#15294a'];   // alba
    if (h >= 7  && h < 10) return ['#2a4a6e', '#22405e', '#1a3358'];   // mattina
    if (h >= 10 && h < 14) return ['#2e5080', '#244878', '#1c3a64'];   // mezzogiorno (più chiaro)
    if (h >= 14 && h < 17) return ['#2a4a72', '#22406a', '#1a3358'];   // pomeriggio
    if (h >= 17 && h < 20) return ['#244468', '#1c3858', '#16294a'];   // sera
    if (h >= 20 && h < 22) return ['#1c3858', '#16294a', '#122242'];   // imbrunire
    return ['#1a3358', '#15294a', '#122242'];                          // tarda notte
  } else {
    if (h >= 0  && h < 5)  return ['#daeeff', '#88c0e8', '#2878c8'];   // notte celeste
    if (h >= 5  && h < 7)  return ['#eef8ff', '#a0d8f8', '#3898d8'];   // alba celeste
    if (h >= 7  && h < 10) return ['#f5fcff', '#b8e4fc', '#50a8e0'];   // mattina celeste pallido
    if (h >= 10 && h < 14) return ['#f8fdff', '#c0e8fc', '#4ab0e8'];   // mezzogiorno celeste luminoso
    if (h >= 14 && h < 17) return ['#f4fbff', '#b0e0fa', '#3ca0e0'];   // pomeriggio celeste
    if (h >= 17 && h < 20) return ['#d8eeff', '#78b8e0', '#1868b8'];   // tramonto celeste scuro
    return ['#daeeff', '#88c0e8', '#2878c8'];
  }
}

export default function AnimatedGradientBg({ children }) {
  const { dark } = useTheme();
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const base = getSkyColors(dark);
  // overlay leggermente spostato per creare il pulsare di luce
  const overlay = [base[2], base[1], base[0]];

  const fallback = dark ? '#122242' : '#b8d8f0';

  return (
    <View style={[styles.container, { backgroundColor: fallback }]}>
      {/* Gradiente base — sempre visibile */}
      <LinearGradient
        colors={base}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Gradiente overlay — si dissolve in loop per effetto di luce */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] }) }]}>
        <LinearGradient
          colors={overlay}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
