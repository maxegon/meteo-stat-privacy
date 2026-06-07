import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

// Gradiente cielo: [top-chiaro, centro, bottom-scuro]
function getSkyColors(dark) {
  const h = new Date().getHours();
  if (dark) {
    if (h >= 0  && h < 5)  return ['#091430', '#04091c', '#01060f'];   // notte
    if (h >= 5  && h < 7)  return ['#3a68a8', '#122e62', '#050b20'];   // alba
    if (h >= 7  && h < 10) return ['#4e9cca', '#1c60a0', '#082c5c'];   // mattina
    if (h >= 10 && h < 14) return ['#4594c4', '#145ca8', '#062870'];   // mezzogiorno
    if (h >= 14 && h < 17) return ['#4c90c0', '#1050a0', '#052258'];   // pomeriggio
    if (h >= 17 && h < 20) return ['#2a5e8a', '#0a2448', '#03091c'];   // sera
    if (h >= 20 && h < 22) return ['#121e44', '#060b1e', '#01030a'];   // imbrunire
    return ['#091430', '#04091c', '#01060f'];
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

  const fallback = dark ? '#080e1e' : '#b8d8f0';

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
