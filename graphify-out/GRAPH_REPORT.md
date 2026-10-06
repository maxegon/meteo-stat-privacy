# Graph Report - MeteoAggregator  (2026-10-06)

## Corpus Check
- 55 files · ~86,841 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 374 nodes · 707 edges · 39 communities (16 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `11ce088a`
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
- climateNormals.js
- react-native-worklets
- @react-navigation/bottom-tabs
- @react-navigation/material-top-tabs
- @react-navigation/native
- @react-navigation/stack
- @sentry/react-native
- expo-web-browser
- generate_snapshot.js
- expo
- react-native-safe-area-context

## God Nodes (most connected - your core abstractions)
1. `HomeScreen()` - 36 edges
2. `useTheme()` - 29 edges
3. `ForecastModal()` - 17 edges
4. `expo` - 16 edges
5. `buildAggregateHourly()` - 12 edges
6. `buildAggregateDays()` - 11 edges
7. `AlertSettingsModal()` - 10 edges
8. `AnimatedGradientBg()` - 10 edges
9. `TrendChart()` - 10 edges
10. `logError()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AppNavigator()` --calls--> `useTheme()`  [EXTRACTED]
  App.js → src/context/ThemeContext.js
- `App()` --calls--> `logError()`  [EXTRACTED]
  App.js → src/utils/errorLogger.js
- `UpdateBanner()` --references--> `updates`  [EXTRACTED]
  src/components/UpdateBanner.js → app.json
- `AlertSettingsModal()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/AlertSettingsModal.js → src/context/ThemeContext.js
- `ForecastModal()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/ForecastModal.js → src/context/ThemeContext.js

## Import Cycles
- None detected.

## Communities (39 total, 23 thin omitted)

### Community 0 - "Home Screen Widgets"
Cohesion: 0.10
Nodes (31): AlertsButton(), styles, ProviderBadge(), styles, ProviderStatusBanner(), styles, styles, WeatherCard() (+23 more)

### Community 1 - "App Navigation & Error Boundary"
Cohesion: 0.11
Nodes (18): App(), Tab, TAB_ICONS, @sentry/react-native, ErrorBoundary, styles, styles, UpdateBanner() (+10 more)

### Community 2 - "Theming & Alerts UI"
Cohesion: 0.09
Nodes (29): AppNavigator(), AlertsSheet(), styles, AnimatedGradientBg(), getSkyColors(), styles, formatRange(), LEVEL_ICON (+21 more)

### Community 3 - "Expo App Config"
Cohesion: 0.05
Nodes (40): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, package, projectId, expo, android (+32 more)

### Community 4 - "Forecast Modal Details"
Cohesion: 0.10
Nodes (28): beaufortLabel(), DAYS_IT, fascia(), FASCIA_COLOR_DARK, FASCIA_COLOR_LIGHT, FASCIA_ICON, FASCIA_ORDER, ForecastModal() (+20 more)

### Community 5 - "Alert Thresholds Settings"
Cohesion: 0.15
Nodes (19): AlertSettingsModal(), makeStyles(), STEPPER_CONFIG, ALERT_TYPES, ANOMALY_DELTA, ANOMALY_TYPES, DEFAULT_OFFICIAL_SEVERITY, DEFAULT_THRESHOLDS (+11 more)

### Community 6 - "Weather Provider Services"
Cohesion: 0.14
Nodes (17): fetchAll(), fetchAllDirect(), fetchForecast(), symbolToDescription(), symbolToIcon(), fetchForecast(), wmoDescription(), wmoIcon() (+9 more)

### Community 7 - "Stats Trend Charts"
Cohesion: 0.21
Nodes (17): cacheKeyFor(), makeStyles(), RANGES, readCache(), startYearFor(), TrendChart(), writeCache(), ALL_YEARS (+9 more)

### Community 8 - "Package Scripts Config"
Cohesion: 0.10
Nodes (20): babel-preset-expo, devDependencies, babel-preset-expo, expo, install, exclude, main, name (+12 more)

### Community 9 - "Core RN Dependencies"
Cohesion: 0.29
Nodes (7): axios, expo-location, dependencies, axios, expo-location, react-native-webview, react-native-webview

### Community 17 - "@expo/vector-icons"
Cohesion: 0.23
Nodes (18): WeatherContext, WeatherProvider(), aggAvg(), aggMajorityPair(), buildAggregateData(), buildAggregateDays(), buildAggregateHourly(), buildTomorrowNarrative() (+10 more)

### Community 26 - "climateNormals.js"
Cohesion: 0.46
Nodes (7): avg(), cacheKey(), dayOfYear(), fetchRange(), fetchRangeWithRetry(), getClimateNormals(), staleKey()

### Community 36 - "generate_snapshot.js"
Cohesion: 0.26
Nodes (11): EXCLUDED_DIR_NAMES, fs, INCLUDED_EXTENSIONS, isExplicitlyExcluded(), main(), OUTPUT, path, ROOT (+3 more)

## Knowledge Gaps
- **119 isolated node(s):** `Tab`, `TAB_ICONS`, `name`, `slug`, `version` (+114 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `exclude` connect `Package Scripts Config` to `App Navigation & Error Boundary`?**
  _High betweenness centrality (0.299) - this node is a cross-community bridge._
- **What connects `Tab`, `TAB_ICONS`, `name` to the rest of the system?**
  _119 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Home Screen Widgets` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `App Navigation & Error Boundary` be split into smaller, more focused modules?**
  _Cohesion score 0.10887096774193548 - nodes in this community are weakly interconnected._
- **Should `Theming & Alerts UI` be split into smaller, more focused modules?**
  _Cohesion score 0.08961593172119488 - nodes in this community are weakly interconnected._
- **Should `Expo App Config` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `Forecast Modal Details` be split into smaller, more focused modules?**
  _Cohesion score 0.10037878787878787 - nodes in this community are weakly interconnected._