/**
 * ProviderBadge — mostra il badge di attribuzione del provider
 * Obbligatorio per rispettare i ToS di OWM e WeatherAPI.
 * Di default non è cliccabile (clickable=false) per evitare
 * conflitti quando è dentro altri TouchableOpacity.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';

export default function ProviderBadge({ provider, size = 'sm', clickable = false }) {
  if (!provider) return null;
  const small = size === 'sm';

  const content = (
    <>
      <Text style={[styles.logo, small && styles.logoSm]}>{provider.logo}</Text>
      <Text style={[styles.name, { color: provider.color }, small && styles.nameSm]}>
        {small ? provider.shortName : provider.name}
      </Text>
    </>
  );

  if (clickable) {
    return (
      <TouchableOpacity
        style={[styles.badge, { borderColor: provider.color }]}
        onPress={() => Linking.openURL(provider.licenseUrl)}
        activeOpacity={0.7}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.badge, { borderColor: provider.color }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  logo: { fontSize: 14 },
  logoSm: { fontSize: 11 },
  name: { fontSize: 12, fontWeight: '600' },
  nameSm: { fontSize: 10 },
});
