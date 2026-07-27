# Graph Report - MeteoAggregator  (2026-07-16)

## Corpus Check
- 51 files · ~42,437 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 333 nodes · 624 edges · 15 communities
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f0ca7201`
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

## God Nodes (most connected - your core abstractions)
1. `HomeScreen()` - 30 edges
2. `useTheme()` - 27 edges
3. `ForecastModal()` - 17 edges
4. `expo` - 14 edges
5. `buildAggregateDays()` - 11 edges
6. `AlertSettingsModal()` - 10 edges
7. `AnimatedGradientBg()` - 10 edges
8. `TrendChart()` - 10 edges
9. `buildAggregateHourly()` - 10 edges
10. `StatsScreen()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `AppNavigator()` --calls--> `useTheme()`  [EXTRACTED]
  App.js → src/context/ThemeContext.js
- `App()` --calls--> `logError()`  [EXTRACTED]
  App.js → src/utils/errorLogger.js
- `AlertSettingsModal()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/AlertSettingsModal.js → src/context/ThemeContext.js
- `ForecastModal()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/ForecastModal.js → src/context/ThemeContext.js
- `ForecastModal()` --calls--> `checkDayThresholds()`  [EXTRACTED]
  src/components/ForecastModal.js → src/services/weatherAlerts.js

## Import Cycles
- None detected.

## Communities (15 total, 0 thin omitted)

### Community 0 - "Home Screen Widgets"
Cohesion: 0.10
Nodes (32): AlertsButton(), styles, ProviderBadge(), styles, ProviderStatusBanner(), styles, styles, WeatherCard() (+24 more)

### Community 1 - "App Navigation & Error Boundary"
Cohesion: 0.10
Nodes (20): App(), Tab, TAB_ICONS, @sentry/react-native, ErrorBoundary, styles, InfoScreen(), makeStyles() (+12 more)

### Community 2 - "Theming & Alerts UI"
Cohesion: 0.08
Nodes (29): AppNavigator(), AlertsSheet(), styles, AnimatedGradientBg(), getSkyColors(), styles, formatRange(), LEVEL_ICON (+21 more)

### Community 3 - "Expo App Config"
Cohesion: 0.06
Nodes (33): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, package, projectId, expo, android (+25 more)

### Community 4 - "Forecast Modal Details"
Cohesion: 0.12
Nodes (23): beaufortLabel(), DAYS_IT, fascia(), FASCIA_COLOR_DARK, FASCIA_COLOR_LIGHT, FASCIA_ICON, FASCIA_ORDER, ForecastModal() (+15 more)

### Community 5 - "Alert Thresholds Settings"
Cohesion: 0.16
Nodes (18): AlertSettingsModal(), makeStyles(), STEPPER_CONFIG, ALERT_TYPES, ANOMALY_DELTA, ANOMALY_TYPES, DEFAULT_OFFICIAL_SEVERITY, DEFAULT_THRESHOLDS (+10 more)

### Community 6 - "Weather Provider Services"
Cohesion: 0.16
Nodes (13): fetchForecast(), symbolToDescription(), symbolToIcon(), fetchForecast(), wmoDescription(), wmoIcon(), fetchForecast(), fillHourlyGaps() (+5 more)

### Community 7 - "Stats Trend Charts"
Cohesion: 0.21
Nodes (17): cacheKeyFor(), makeStyles(), RANGES, readCache(), startYearFor(), TrendChart(), writeCache(), ALL_YEARS (+9 more)

### Community 8 - "Package Scripts Config"
Cohesion: 0.11
Nodes (18): babel-preset-expo, devDependencies, babel-preset-expo, expo, install, exclude, main, name (+10 more)

### Community 9 - "Core RN Dependencies"
Cohesion: 0.04
Nodes (49): axios, expo, expo-font, expo-linear-gradient, expo-location, expo-status-bar, @expo/vector-icons, dependencies (+41 more)

### Community 10 - "Native Modules Install"
Cohesion: 0.30
Nodes (12): WeatherContext, WeatherProvider(), aggAvg(), aggMajorityPair(), buildAggregateData(), buildAggregateDays(), buildAggregateHourly(), getDateStr() (+4 more)

### Community 11 - "Climate Normals Data"
Cohesion: 0.46
Nodes (7): avg(), cacheKey(), dayOfYear(), fetchRange(), fetchRangeWithRetry(), getClimateNormals(), staleKey()

## Knowledge Gaps
- **105 isolated node(s):** `Tab`, `TAB_ICONS`, `name`, `slug`, `version` (+100 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `exclude` connect `Package Scripts Config` to `App Navigation & Error Boundary`?**
  _High betweenness centrality (0.279) - this node is a cross-community bridge._
- **Why does `@sentry/react-native` connect `App Navigation & Error Boundary` to `Package Scripts Config`?**
  _High betweenness centrality (0.272) - this node is a cross-community bridge._
- **What connects `Tab`, `TAB_ICONS`, `name` to the rest of the system?**
  _105 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Home Screen Widgets` be split into smaller, more focused modules?**
  _Cohesion score 0.09745293466223699 - nodes in this community are weakly interconnected._
- **Should `App Navigation & Error Boundary` be split into smaller, more focused modules?**
  _Cohesion score 0.10252100840336134 - nodes in this community are weakly interconnected._
- **Should `Theming & Alerts UI` be split into smaller, more focused modules?**
  _Cohesion score 0.08392603129445235 - nodes in this community are weakly interconnected._
- **Should `Expo App Config` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._