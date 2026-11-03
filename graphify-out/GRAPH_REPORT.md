# Graph Report - MeteoAggregator  (2026-11-03)

## Corpus Check
- 58 files · ~51,415 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 3, .example 1)

## Summary
- 393 nodes · 928 edges · 31 communities (14 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0898d1a9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Home Screen Widgets
- App Navigation & Error Boundary
- Theming & Alerts UI
- Expo App Config
- Forecast Modal Details
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
- expo-web-browser@~15.0.11
- react-native-gesture-handler
- react-native-maps@^1.27.2
- react-native-pager-view@^8.0.2
- react-native-svg
- climateNormals.js
- react-native-worklets@0.5.1
- @react-navigation/bottom-tabs
- @react-navigation/material-top-tabs@^7.4.28
- @react-navigation/stack@^7.9.3
- expo-web-browser
- generate_snapshot.js
- expo-font@~14.0.12

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
- `AppNavigator()` --calls--> `ErrorBoundary`  [EXTRACTED]
  App.js → src/components/ErrorBoundary.js
- `AppNavigator()` --calls--> `HomeScreen()`  [EXTRACTED]
  App.js → src/screens/HomeScreen.js
- `AppNavigator()` --calls--> `StatsScreen()`  [EXTRACTED]
  App.js → src/screens/StatsScreen.js
- `App()` --calls--> `WeatherProvider()`  [EXTRACTED]
  App.js → src/context/WeatherContext.js
- `App()` --calls--> `OnboardingScreen()`  [EXTRACTED]
  App.js → src/screens/OnboardingScreen.js

## Import Cycles
- None detected.

## Communities (31 total, 17 thin omitted)

### Community 0 - "Home Screen Widgets"
Cohesion: 0.10
Nodes (42): AlertsButton(), styles, ProviderStatusBanner(), styles, WeatherContext, WeatherProvider(), DAYS_IT, formatDate() (+34 more)

### Community 1 - "App Navigation & Error Boundary"
Cohesion: 0.11
Nodes (23): App(), beforeBreadcrumb(), beforeSend(), scrubText(), scrubUrl(), Tab, TAB_ICONS, expo@~54.0.34 (+15 more)

### Community 2 - "Theming & Alerts UI"
Cohesion: 0.09
Nodes (45): AppNavigator(), @expo/vector-icons, react, react-native, react-native-safe-area-context, AlertsSheet(), styles, AnimatedGradientBg() (+37 more)

### Community 3 - "Expo App Config"
Cohesion: 0.05
Nodes (39): backgroundColor, foregroundImage, adaptiveIcon, blockedPermissions, edgeToEdgeEnabled, package, projectId, expo (+31 more)

### Community 4 - "Forecast Modal Details"
Cohesion: 0.08
Nodes (34): beaufortLabel(), DAYS_IT, fascia(), FASCIA_COLOR_DARK, FASCIA_COLOR_LIGHT, FASCIA_ICON, FASCIA_ORDER, ForecastModal() (+26 more)

### Community 5 - "Alert Thresholds Settings"
Cohesion: 0.15
Nodes (19): AlertSettingsModal(), makeStyles(), STEPPER_CONFIG, ALERT_TYPES, ANOMALY_DELTA, ANOMALY_TYPES, DEFAULT_OFFICIAL_SEVERITY, DEFAULT_THRESHOLDS (+11 more)

### Community 6 - "Weather Provider Services"
Cohesion: 0.12
Nodes (19): axios, APP_SECRET_TOKEN, BACKEND_URL, CONTACT_EMAIL, reverseGeocodeBackend(), fetchForecast(), symbolToDescription(), symbolToIcon() (+11 more)

### Community 7 - "Stats Trend Charts"
Cohesion: 0.18
Nodes (21): cacheKeyFor(), makeStyles(), RANGES, readCache(), startYearFor(), TrendChart(), writeCache(), useWeather() (+13 more)

### Community 8 - "package.json"
Cohesion: 0.22
Nodes (9): react-native-screens@~4.16.0, devDependencies, babel-preset-expo@~54.0.10, main, name, private, version, babel-preset-expo (+1 more)

### Community 9 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, axios@^1.16.1, @expo/vector-icons@^15.0.3, react@19.1.0, react-native@0.81.5, react-native-reanimated@~4.1.1, react-native-safe-area-context@~5.6.0, react-native-webview@^13.16.1 (+4 more)

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
Cohesion: 0.14
Nodes (14): fs, path, { withDangerousMod }, EXCLUDED_DIR_NAMES, fs, INCLUDED_EXTENSIONS, isExplicitlyExcluded(), main() (+6 more)

## Knowledge Gaps
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `expo` connect `App Navigation & Error Boundary` to `package.json`, `generate_snapshot.js`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Should `Home Screen Widgets` be split into smaller, more focused modules?**
  _Cohesion score 0.09803921568627451 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Theming & Alerts UI` to `Home Screen Widgets`, `App Navigation & Error Boundary`, `Forecast Modal Details`, `Alert Thresholds Settings`, `Stats Trend Charts`, `package.json`, `dependencies`?**
  _High betweenness centrality (0.086) - this node is a cross-community bridge._
- **Should `App Navigation & Error Boundary` be split into smaller, more focused modules?**
  _Cohesion score 0.1051693404634581 - nodes in this community are weakly interconnected._
- **Should `Theming & Alerts UI` be split into smaller, more focused modules?**
  _Cohesion score 0.08649912331969609 - nodes in this community are weakly interconnected._
- **Should `Expo App Config` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Forecast Modal Details` be split into smaller, more focused modules?**
  _Cohesion score 0.08194905869324474 - nodes in this community are weakly interconnected._