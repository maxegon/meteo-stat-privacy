import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import RadarMap from '../components/RadarMap';
import { useWeather } from '../context/WeatherContext';
import AnimatedGradientBg from '../components/AnimatedGradientBg';

export default function MapScreen() {
  const { selectedCity } = useWeather();
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
              <MaterialCommunityIcons name="radar" size={20} color="#7ed4f5" />
              <Text style={styles.title} numberOfLines={1}>Radar Precipitazioni</Text>
            </View>
            <TouchableOpacity onPress={goToMyLocation} style={styles.gpsBtn} accessibilityLabel="Vai alla mia posizione">
              <MaterialCommunityIcons name={locating ? 'loading' : 'crosshairs-gps'} size={20} color="#38bdf8" />
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  cityName: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 4,
  },
  noCityHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  gpsBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(56,189,248,0.15)',
  },

  // Wrapper con bordo visibile che isola la mappa
  mapWrapper: {
    flex: 1,
    margin: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    // Ombre per dare profondità
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mapContainer: {
    flex: 1,
  },
});
