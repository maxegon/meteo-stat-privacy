# Graph Report - MeteoAggregator  (2026-11-11)

## Corpus Check
- 59 files · ~52,382 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 3, .example 1)

## Summary
- 405 nodes · 943 edges · 35 communities (14 shown, 21 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `41891c02`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- ForecastModal.js
- App.js
- Theming & Alerts UI
- Expo App Config
- HomeScreen.js
- Alert Thresholds Settings
- Weather Provider Services
- Stats Trend Charts
- package.json
- dependencies
- expo-location
- expo-linear-gradient
- scripts
- expo
- expo-status-bar
- expo-updates
- expo-build-properties@~1.0.10
- @react-native-async-storage/async-storage
- react-native-reanimated@~4.1.1
- react-native-gesture-handler
- react-native-maps@^1.27.2
- react-native-pager-view@^8.0.2
- react-native-screens@~4.16.0
- react-native-webview
- react-native-svg
- climateNormals.js
- expo-web-browser@~15.0.11
- @react-navigation/native
- @react-navigation/bottom-tabs
- @react-navigation/material-top-tabs@^7.4.28
- @react-navigation/stack@^7.9.3
- expo-web-browser
- generate_snapshot.js

## God Nodes (most connected - your core abstractions)
1. `HomeScreen()` - 49 edges
2. `useTheme()` - 29 edges
3. `react` - 28 edges
4. `react-native` - 26 edges
5. `ForecastModal()` - 21 edges
6. `@expo/vector-icons` - 20 edges
7. `AnimatedGradientBg()` - 17 edges
8. `expo` - 16 edges
9. `react-native-safe-area-context` - 16 edges
10. `AlertSettingsModal()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `AppNavigator()` --calls--> `useTheme()`  [EXTRACTED]
  App.js → src/context/ThemeContext.js
- `AppNavigator()` --calls--> `HomeScreen()`  [EXTRACTED]
  App.js → src/screens/HomeScreen.js
- `AppNavigator()` --calls--> `InfoScreen()`  [EXTRACTED]
  App.js → src/screens/InfoScreen.js
- `AppNavigator()` --calls--> `MapScreen()`  [EXTRACTED]
  App.js → src/screens/MapScreen.js
- `AppNavigator()` --calls--> `StatsScreen()`  [EXTRACTED]
  App.js → src/screens/StatsScreen.js

## Import Cycles
- None detected.

## Communities (35 total, 21 thin omitted)

### Community 0 - "ForecastModal.js"
Cohesion: 0.11
Nodes (26): beaufortLabel(), DAYS_IT, fascia(), FASCIA_COLOR_DARK, FASCIA_COLOR_LIGHT, FASCIA_ICON, FASCIA_ORDER, ForecastModal() (+18 more)

### Community 1 - "App.js"
Cohesion: 0.21
Nodes (11): App(), AppNavigator(), beforeBreadcrumb(), beforeSend(), scrubText(), scrubUrl(), Tab, TAB_ICONS (+3 more)

### Community 2 - "Theming & Alerts UI"
Cohesion: 0.08
Nodes (48): @expo/vector-icons, react, react-native, react-native-safe-area-context, styles, AlertsSheet(), styles, AnimatedGradientBg() (+40 more)

### Community 3 - "Expo App Config"
Cohesion: 0.04
Nodes (45): backgroundColor, foregroundImage, adaptiveIcon, blockedPermissions, edgeToEdgeEnabled, package, projectId, expo (+37 more)

### Community 4 - "HomeScreen.js"
Cohesion: 0.09
Nodes (48): AlertsButton(), ProviderBadge(), styles, ProviderStatusBanner(), styles, WeatherCard(), WeatherIcon(), WeatherContext (+40 more)

### Community 5 - "Alert Thresholds Settings"
Cohesion: 0.15
Nodes (19): AlertSettingsModal(), makeStyles(), STEPPER_CONFIG, ALERT_TYPES, ANOMALY_DELTA, ANOMALY_TYPES, DEFAULT_OFFICIAL_SEVERITY, DEFAULT_THRESHOLDS (+11 more)

### Community 6 - "Weather Provider Services"
Cohesion: 0.10
Nodes (25): axios, fetchAll(), fetchAllDirect(), fetchMarine, searchCity, APP_SECRET_TOKEN, BACKEND_URL, CONTACT_EMAIL (+17 more)

### Community 7 - "Stats Trend Charts"
Cohesion: 0.19
Nodes (20): cacheKeyFor(), makeStyles(), RANGES, readCache(), startYearFor(), TrendChart(), writeCache(), ALL_YEARS (+12 more)

### Community 8 - "package.json"
Cohesion: 0.22
Nodes (9): react-native-worklets@0.5.1, devDependencies, babel-preset-expo@~54.0.10, main, name, private, version, babel-preset-expo (+1 more)

### Community 9 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, axios@^1.16.1, expo-font@~14.0.12, @expo/vector-icons@^15.0.3, react@19.1.0, react-native@0.81.5, react-native-safe-area-context@~5.6.0, @sentry/react-native@^8.13.0 (+2 more)

### Community 13 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, android, ios, ios:clean, start, start:clean, web

### Community 14 - "expo"
Cohesion: 0.67
Nodes (3): expo, install, exclude

### Community 35 - "expo-web-browser"
Cohesion: 0.46
Nodes (7): avg(), cacheKey(), dayOfYear(), fetchRange(), fetchRangeWithRetry(), getClimateNormals(), staleKey()

### Community 36 - "generate_snapshot.js"
Cohesion: 0.10
Nodes (19): expo@~54.0.34, fs, path, { withDangerousMod }, fs, path, { withInfoPlist, withDangerousMod }, expo (+11 more)

## Knowledge Gaps
- **21 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo` connect `generate_snapshot.js` to `package.json`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Should `ForecastModal.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1103448275862069 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Theming & Alerts UI` to `ForecastModal.js`, `App.js`, `HomeScreen.js`, `Alert Thresholds Settings`, `Stats Trend Charts`, `package.json`, `dependencies`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Should `Theming & Alerts UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07645687645687646 - nodes in this community are weakly interconnected._
- **Should `Expo App Config` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `HomeScreen.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08700564971751412 - nodes in this community are weakly interconnected._
- **Should `Weather Provider Services` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._