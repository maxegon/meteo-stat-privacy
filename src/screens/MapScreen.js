import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import RadarMap from '../components/RadarMap';
import { useWeather } from '../context/WeatherContext';
import AnimatedGradientBg from '../components/AnimatedGradientBg';
import { useTheme } from '../context/ThemeContext';

export default function MapScreen() {
  const { selectedCity } = useWeather();
  const { colors: c, dark } = useTheme();
  const styles = useMemo(() => makeStyles(c, dark), [c, dark]);
  const mapRef = useRef(null);
  const [locating, setLocating] = useState(false);

  const goToMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.flyTo(loc.coords.latitude, loc.coords.longitude);
    } catch (_) {}
    finally { setLocating(false); }
  };

  return (
    <AnimatedGradientBg>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="radar" size={20} color={c.accent} />
              <Text style={styles.title} numberOfLines={1}>Radar Precipitazioni</Text>
            </View>
            <TouchableOpacity onPress={goToMyLocation} style={styles.gpsBtn} accessibilityLabel="Vai alla mia posizione">
              <MaterialCommunityIcons name={locating ? 'loading' : 'crosshairs-gps'} size={20} color={c.accent} />
            </TouchableOpacity>
          </View>
          {selectedCity ? (
            <Text style={styles.cityName} numberOfLines={1}>📍 {selectedCity.name}</Text>
          ) : (
            <Text style={styles.noCityHint} numberOfLines={1}>Cerca una città nella tab Home</Text>
          )}
        </View>

        <View style={styles.mapWrapper}>
          <View style={styles.mapContainer} collapsable={false}>
            <RadarMap
              ref={mapRef}
              latitude={selectedCity?.lat}
              longitude={selectedCity?.lon}
            />
          </View>
        </View>
      </SafeAreaView>
    </AnimatedGradientBg>
  );
}

function makeStyles(c, dark) {
  return StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  title: {
    color: c.text,
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  cityName: {
    color: c.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  noCityHint: {
    color: c.textMuted,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  gpsBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: c.accent + '26',
  },

  // Wrapper con bordo visibile che isola la mappa
  mapWrapper: {
    flex: 1,
    margin: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    // Ombre per dare profondità
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: dark ? 0.3 : 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  mapContainer: {
    flex: 1,
  },
  });
}
