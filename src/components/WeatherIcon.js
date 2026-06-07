/**
 * WeatherIcon — icona meteo con colori corretti.
 * Per le icone "parzialmente nuvoloso" sovrappone sole giallo e nuvola bianca.
 */
import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getIconColor } from '../utils/weatherIconColor';

export default function WeatherIcon({ name, size = 32, dark = true, style }) {
  const isPartlyCloudy = name === 'weather-partly-cloudy';
  const isNightPartly  = name === 'weather-night-partly-cloudy';

  if (isPartlyCloudy || isNightPartly) {
    const sunColor   = isNightPartly ? '#818cf8' : '#fbbf24';
    const cloudColor = dark ? '#e2e8f0' : '#94a3b8';
    const baseIcon   = isNightPartly ? 'weather-night' : 'weather-sunny';
    const cloudSize  = size * 0.72;
    const offset     = size * 0.28;

    return (
      <View style={[{ width: size, height: size }, style]}>
        {/* Sole / luna — in basso a sinistra */}
        <MaterialCommunityIcons
          name={baseIcon}
          size={size * 0.80}
          color={sunColor}
          style={{ position: 'absolute', bottom: 0, left: 0 }}
        />
        {/* Nuvola — in alto a destra, sovrapposta */}
        <MaterialCommunityIcons
          name="weather-cloudy"
          size={cloudSize}
          color={cloudColor}
          style={{ position: 'absolute', top: 0, right: 0 }}
        />
      </View>
    );
  }

  return (
    <MaterialCommunityIcons
      name={name || 'weather-partly-cloudy'}
      size={size}
      color={getIconColor(name, dark)}
      style={style}
    />
  );
}
