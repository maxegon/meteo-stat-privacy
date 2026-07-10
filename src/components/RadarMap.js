import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';

const RadarMap = forwardRef(function RadarMap({ latitude, longitude }, ref) {
  const webViewRef = useRef(null);
  const lat = latitude || 41.9;
  const lon = longitude || 12.5;

  useImperativeHandle(ref, () => ({
    flyTo(newLat, newLon) {
      webViewRef.current?.injectJavaScript(
        `map.flyTo([${newLat}, ${newLon}], 7, { animate: true }); true;`
      );
    },
  }));

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #0f172a; }
    .info-box {
      position: absolute;
      bottom: 36px;
      left: 8px;
      z-index: 1000;
      background: rgba(30,41,59,0.9);
      color: #e2e8f0;
      font-family: -apple-system, sans-serif;
      font-size: 12px;
      padding: 6px 10px;
      border-radius: 8px;
    }
    .legend {
      position: absolute;
      bottom: 8px;
      left: 8px;
      z-index: 1000;
      background: rgba(30,41,59,0.85);
      border-radius: 8px;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-family: -apple-system, sans-serif;
      font-size: 10px;
      color: #94a3b8;
    }
    .bar {
      width: 80px;
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(to right, #a0d0ff, #2090ff, #00cc00, #ffcc00, #ff4400, #cc0000);
    }
    .controls {
      position: absolute;
      bottom: 36px;
      right: 8px;
      z-index: 1000;
      display: flex;
      gap: 6px;
    }
    button {
      background: rgba(30,41,59,0.9);
      border: none;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 6px 12px;
      font-size: 14px;
      cursor: pointer;
    }
    button.active { background: #38bdf8; color: #0f172a; }
  </style>
</head>
<body>
  <div id="map"></div>
  <div class="info-box" id="timeBox">⏳ Caricamento radar…</div>
  <div class="legend">
    <div class="bar"></div>
    <span>debole → forte</span>
  </div>
  <div class="controls">
    <button id="prevBtn">⏮</button>
    <button id="playBtn" class="active">⏸</button>
    <button id="nextBtn">⏭</button>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: true, attributionControl: false, maxZoom: 19 })
      .setView([${lat}, ${lon}], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    let frames = [];
    let currentIndex = 0;
    let radarLayer = null;
    let playing = true;
    let timer = null;

    function showFrame(index) {
      if (frames.length === 0) return;
      if (radarLayer) map.removeLayer(radarLayer);
      const frame = frames[index];
      const tileUrl = 'https://tilecache.rainviewer.com' + frame.path + '/512/{z}/{x}/{y}/4/1_1.png';
      // maxNativeZoom: 7 — limite reale del tile server RainViewer (doc ufficiale:
      // "Maximum zoom level is 7"). Oltre lo zoom 7 Leaflet riusa e ingrandisce
      // (upscaling) l'ultimo tile scaricato invece di richiedere tile z>7
      // inesistenti (che darebbero 404/riquadri vuoti). La mappa base OSM invece
      // resta nitida fino a zoom 19.
      radarLayer = L.tileLayer(tileUrl, { opacity: 0.7, zIndex: 10, maxNativeZoom: 7, maxZoom: 19 }).addTo(map);
      const d = new Date(frame.time * 1000);
      const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      const isPast = index < frames.length - 2;
      document.getElementById('timeBox').textContent =
        (isPast ? '📡 ' : '🔮 ') + timeStr + ' ' + (isPast ? '(passato)' : '(previsione)');
    }

    function startAnimation() {
      clearInterval(timer);
      timer = setInterval(() => {
        currentIndex = (currentIndex + 1) % frames.length;
        showFrame(currentIndex);
      }, 600);
    }

    // RainViewer pubblica un nuovo mosaico radar ogni ~10 min. Questa schermata
    // resta montata quando si cambia tab (React Navigation non la smonta), quindi
    // senza un refetch periodico i frame restano quelli del primo caricamento
    // finché non si riavvia l'app. REFETCH_MS sotto i 10 min per non perdere un
    // frame nuovo appena pubblicato.
    const REFETCH_MS = 5 * 60 * 1000;

    function loadFrames(isRefresh) {
      fetch('https://api.rainviewer.com/public/weather-maps.json')
        .then(r => r.json())
        .then(data => {
          const past = (data.radar.past || []).slice(-10);
          const nowcast = (data.radar.nowcast || []).slice(0, 2);
          frames = [...past, ...nowcast];
          currentIndex = past.length - 1;
          showFrame(currentIndex);
          if (!isRefresh && playing) startAnimation();
          document.getElementById('timeBox').textContent = '📡 Radar attivo';
        })
        .catch(() => {
          if (!isRefresh) document.getElementById('timeBox').textContent = '⚠️ Radar non disponibile';
        });
    }

    loadFrames(false);
    setInterval(() => loadFrames(true), REFETCH_MS);

    document.getElementById('playBtn').onclick = function() {
      playing = !playing;
      if (playing) {
        this.textContent = '⏸';
        this.classList.add('active');
        startAnimation();
      } else {
        this.textContent = '▶️';
        this.classList.remove('active');
        clearInterval(timer);
      }
    };
    document.getElementById('prevBtn').onclick = function() {
      clearInterval(timer);
      playing = false;
      document.getElementById('playBtn').textContent = '▶️';
      document.getElementById('playBtn').classList.remove('active');
      currentIndex = (currentIndex - 1 + frames.length) % frames.length;
      showFrame(currentIndex);
    };
    document.getElementById('nextBtn').onclick = function() {
      clearInterval(timer);
      playing = false;
      document.getElementById('playBtn').textContent = '▶️';
      document.getElementById('playBtn').classList.remove('active');
      currentIndex = (currentIndex + 1) % frames.length;
      showFrame(currentIndex);
    };
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html }}
        style={styles.webview}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText}>Caricamento mappa…</Text>
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mixedContentMode="always"
      />
    </View>
  );
});

export default RadarMap;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  webview: { flex: 1, backgroundColor: '#0f172a' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14 },
});
