# Graph Report - MeteoAggregator  (2026-08-19)

## Corpus Check
- 54 files · ~45,562 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 350 nodes · 659 edges · 35 communities (13 shown, 22 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8d13e8c1`
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
- Package Scripts Config
- Core RN Dependencies
- Native Modules Install
- Climate Normals Data
- expo-linear-gradient
- expo-location
- expo-status-bar
- expo-updates
- @expo/vector-icons
- react
- @react-native-async-storage/async-storage
- react-native-gesture-handler
- react-native-maps
- react-native-pager-view
- react-native-reanimated
- react-native-screens
- react-native-svg
- react-native-webview
- react-native-worklets
- @react-navigation/bottom-tabs
- @react-navigation/material-top-tabs
- @react-navigation/native
- @react-navigation/stack
- @sentry/react-native

## God Nodes (most connected - your core abstractions)
1. `HomeScreen()` - 34 edges
2. `useTheme()` - 27 edges
3. `ForecastModal()` - 17 edges
4. `expo` - 16 edges
5. `buildAggregateDays()` - 11 edges
6. `AlertSettingsModal()` - 10 edges
7. `AnimatedGradientBg()` - 10 edges
8. `TrendChart()` - 10 edges
9. `buildAggregateHourly()` - 10 edges
10. `StatsScreen()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `logError()`  [EXTRACTED]
  App.js → src/utils/errorLogger.js
- `AppNavigator()` --calls--> `useTheme()`  [EXTRACTED]
  App.js → src/context/ThemeContext.js
- `UpdateBanner()` --references--> `updates`  [EXTRACTED]
  src/components/UpdateBanner.js → app.json
- `AlertSettingsModal()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/AlertSettingsModal.js → src/context/ThemeContext.js
- `ForecastModal()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/ForecastModal.js → src/context/ThemeContext.js

## Import Cycles
- None detected.

## Communities (35 total, 22 thin omitted)

### Community 0 - "Home Screen Widgets"
Cohesion: 0.10
Nodes (39): AlertsButton(), styles, ProviderStatusBanner(), styles, WeatherContext, WeatherProvider(), DAYS_IT, formatDate() (+31 more)

### Community 2 - "Theming & Alerts UI"
Cohesion: 0.06
Nodes (46): App(), AppNavigator(), Tab, TAB_ICONS, exclude, react-native-maps, react-native-pager-view, react-native-webview (+38 more)

### Community 3 - "Expo App Config"
Cohesion: 0.05
Nodes (39): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, package, projectId, expo, android (+31 more)

### Community 4 - "Forecast Modal Details"
Cohesion: 0.08
Nodes (34): beaufortLabel(), DAYS_IT, fascia(), FASCIA_COLOR_DARK, FASCIA_COLOR_LIGHT, FASCIA_ICON, FASCIA_ORDER, ForecastModal() (+26 more)

### Community 5 - "Alert Thresholds Settings"
Cohesion: 0.16
Nodes (18): AlertSettingsModal(), makeStyles(), STEPPER_CONFIG, ALERT_TYPES, ANOMALY_DELTA, ANOMALY_TYPES, DEFAULT_OFFICIAL_SEVERITY, DEFAULT_THRESHOLDS (+10 more)

### Community 6 - "Weather Provider Services"
Cohesion: 0.10
Nodes (20): ErrorBoundary, styles, fetchAll(), fetchAllDirect(), fetchForecast(), symbolToDescription(), symbolToIcon(), fetchForecast() (+12 more)

### Community 7 - "Stats Trend Charts"
Cohesion: 0.21
Nodes (17): cacheKeyFor(), makeStyles(), RANGES, readCache(), startYearFor(), TrendChart(), writeCache(), ALL_YEARS (+9 more)

### Community 8 - "Package Scripts Config"
Cohesion: 0.13
Nodes (14): babel-preset-expo, devDependencies, babel-preset-expo, expo, install, main, name, private (+6 more)

### Community 9 - "Core RN Dependencies"
Cohesion: 0.29
Nodes (7): axios, expo, dependencies, axios, expo, react-native-safe-area-context, react-native-safe-area-context

### Community 11 - "Climate Normals Data"
Cohesion: 0.46
Nodes (7): avg(), cacheKey(), dayOfYear(), fetchRange(), fetchRangeWithRetry(), getClimateNormals(), staleKey()

## Knowledge Gaps
- **110 isolated node(s):** `Tab`, `TAB_ICONS`, `name`, `slug`, `version` (+105 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **22 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `exclude` connect `Theming & Alerts UI` to `Package Scripts Config`?**
  _High betweenness centrality (0.314) - this node is a cross-community bridge._
- **Why does `install` connect `Package Scripts Config` to `Theming & Alerts UI`?**
  _High betweenness centrality (0.301) - this node is a cross-community bridge._
- **What connects `Tab`, `TAB_ICONS`, `name` to the rest of the system?**
  _110 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Home Screen Widgets` be split into smaller, more focused modules?**
  _Cohesion score 0.09551020408163265 - nodes in this community are weakly interconnected._
- **Should `Theming & Alerts UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05764145954521417 - nodes in this community are weakly interconnected._
- **Should `Expo App Config` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `Forecast Modal Details` be split into smaller, more focused modules?**
  _Cohesion score 0.07862679955703211 - nodes in this community are weakly interconnected._