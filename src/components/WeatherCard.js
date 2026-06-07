import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProviderBadge from './ProviderBadge';
import { useTheme } from '../context/ThemeContext';
import WeatherIcon from './WeatherIcon';
import { translateDescription } from '../utils/weatherDescriptions';

export default function WeatherCard({ data, onPress, style }) {
  if (!data) return null;
  const { provider, current } = data;
  const { colors: c, dark } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.card, {
        backgroundColor: c.bgCard,
        borderColor: c.border,
      }, style]}
    >
      <View style={styles.mainRow}>
        <WeatherIcon name={current.icon || 'weather-partly-cloudy'} size={32} dark={dark} />
        <Text style={[styles.temp, { color: provider.color }]}>
          {current.temperature != null ? `${Math.round(current.temperature)}°` : '—'}
        </Text>
        <View style={styles.infoBlock}>
          <ProviderBadge provider={provider} size="sm" />
          <Text style={[styles.desc, { color: c.textSub }]} numberOfLines={1}>{translateDescription(current.description) || '—'}</Text>
        </View>
        <View style={styles.metaRight}>
          <Text style={[styles.metaSmall, { color: c.textMuted }]}>💧{current.humidity != null ? `${Math.round(current.humidity)}%` : '—'}</Text>
          <Text style={[styles.metaSmall, { color: c.textMuted }]}>💨{current.windspeed != null ? `${Math.round(current.windspeed)}` : '—'}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={16} color={c.border} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  temp: {
    fontSize: 28,
    fontWeight: '700',
    minWidth: 52,
  },
  infoBlock: {
    flex: 1,
    gap: 3,
  },
  desc: {
    fontSize: 11,
    textTransform: 'capitalize',
  },
  metaRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  metaSmall: {
    fontSize: 11,
  },
});
