import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { logError } from '../utils/errorLogger';

/**
 * Error Boundary React — cattura crash di render e mostra UI di recovery.
 *
 * Uso:
 *   <ErrorBoundary label="Meteo">
 *     <HomeScreen />
 *   </ErrorBoundary>
 *
 * Se il componente figlio crasha:
 * - Mostra schermata "Riprova" invece del freeze
 * - Logga l'errore in AsyncStorage (silente)
 * - Il tap su "Riprova" resetta il boundary e rimonta il componente
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logError(`ErrorBoundary[${this.props.label ?? 'unknown'}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <MaterialCommunityIcons name="weather-lightning" size={60} color="#f59e0b" />
        <Text style={styles.title}>Qualcosa è andato storto</Text>
        <Text style={styles.sub}>
          {this.props.label
            ? `La sezione "${this.props.label}" ha incontrato un errore imprevisto.`
            : 'Questa sezione ha incontrato un errore imprevisto.'}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={this.handleReset} activeOpacity={0.8}>
          <Text style={styles.btnText}>↻  Riprova</Text>
        </TouchableOpacity>
        {/* Mostra messaggio tecnico solo in sviluppo */}
        {__DEV__ && this.state.error?.message ? (
          <Text style={styles.dev}>{this.state.error.message}</Text>
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  title: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 18,
    textAlign: 'center',
  },
  sub: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: 26,
    backgroundColor: '#38bdf8',
    paddingHorizontal: 32,
    paddingVertical: 13,
    borderRadius: 12,
  },
  btnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
  dev: {
    color: '#f87171',
    fontSize: 11,
    marginTop: 18,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});
