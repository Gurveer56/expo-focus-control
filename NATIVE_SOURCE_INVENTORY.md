# Native Source Inventory — expo-focus-control

This document inventories all source files, modules, classes, and resources within `expo-focus-control`, detailing their roles, implementation status, Android/iOS APIs utilized, and privacy/security considerations.

---

## 1. Android Native Layer (`android/`)

### A. `ExpoFocusControlModule.kt`
- **Path**: [`android/src/main/java/expo/modules/focuscontrol/ExpoFocusControlModule.kt`](file:///D:/CustomModules/expo-focus-control/android/src/main/java/expo/modules/focuscontrol/ExpoFocusControlModule.kt)
- **Role**: Primary bridge between React Native / Expo JavaScript runtime and Android native platform logic.
- **Implementation Status**: **Implemented (Phase 1 Complete)**
- **Exports**:
  - Events: `onPermissionChanged`, `onUsageUpdated`, `onBlockedAppDetected`, `onFocusSessionStarted`, `onFocusSessionCompleted`, `onProtectionStatusChanged`, `onVpnStatusChanged`.
  - Methods: `getPermissionStatuses`, `getUsageAccessStatus`, `openUsageAccessSettings`, `getAccessibilityStatus`, `openAccessibilitySettings`, `getOverlayPermissionStatus`, `openOverlaySettings`, `getNotificationPermissionStatus`, `openNotificationSettings`, `getBatteryOptimizationStatus`, `openBatterySettings`, `getExactAlarmStatus`, `openExactAlarmSettings`, `getVpnStatus`.
  - Async Methods: `queryUsageStats(startTime, endTime, excludeSelf, limit, sortByUsage)`.
  - Info: `getPlatformInfo`.
- **Security & Privacy**: No network communication; accesses only system services via `ReactContext`.

### B. `PermissionManager.kt`
- **Path**: [`android/src/main/java/expo/modules/focuscontrol/PermissionManager.kt`](file:///D:/CustomModules/expo-focus-control/android/src/main/java/expo/modules/focuscontrol/PermissionManager.kt)
- **Role**: Centralized permission query and settings navigation dispatcher.
- **Implementation Status**: **Implemented (Phase 1 Complete)**
- **APIs Used**:
  - `android.app.AppOpsManager` (`OPSTR_GET_USAGE_STATS`, `unsafeCheckOpNoThrow`, `checkOpNoThrow`)
  - `android.view.accessibility.AccessibilityManager` (`getEnabledAccessibilityServiceList`)
  - `android.provider.Settings` (`ACTION_USAGE_ACCESS_SETTINGS`, `ACTION_ACCESSIBILITY_SETTINGS`, `ACTION_MANAGE_OVERLAY_PERMISSION`, `ACTION_APP_NOTIFICATION_SETTINGS`, `ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`, `ACTION_REQUEST_SCHEDULE_EXACT_ALARM`)
  - `android.os.PowerManager` (`isIgnoringBatteryOptimizations`)
  - `android.app.AlarmManager` (`canScheduleExactAlarms`)
  - `androidx.core.app.NotificationManagerCompat` (`areNotificationsEnabled`)
- **Identified Deficiencies**:
  1. Accessibility component check uses `FocusAccessibilityService::class.java` without verifying if the manifest registered the fully-qualified class name.
  2. Battery optimization opens the global `ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS` list instead of application-specific battery details.
  3. VPN status is hardcoded to `'denied'` rather than querying `VpnService.prepare(context) == null`.
  4. Lacks `ActivityManager.isBackgroundRestricted()` detection.

### C. `UsageStatsManagerHelper.kt`
- **Path**: [`android/src/main/java/expo/modules/focuscontrol/UsageStatsManagerHelper.kt`](file:///D:/CustomModules/expo-focus-control/android/src/main/java/expo/modules/focuscontrol/UsageStatsManagerHelper.kt)
- **Role**: Queries, aggregates, filters, and formats historical app usage metrics.
- **Implementation Status**: **Implemented (Phase 1 Complete)**
- **APIs Used**:
  - `android.app.usage.UsageStatsManager` (`queryUsageStats(INTERVAL_DAILY, startTime, endTime)`)
  - `android.app.usage.UsageStats` (`totalTimeVisible`, `totalTimeInForeground`, `lastTimeUsed`)
  - `android.content.pm.PackageManager` (`getApplicationInfo`, `getApplicationLabel`)
- **Security & Privacy**:
  - Local processing only.
  - Queries foreground duration and timestamps only; never accesses text, messages, passwords, or screenshots.
  - Safely handles `SecurityException` if permission is revoked during query.

### D. `FocusAccessibilityService.kt`
- **Path**: [`android/src/main/java/expo/modules/focuscontrol/FocusAccessibilityService.kt`](file:///D:/CustomModules/expo-focus-control/android/src/main/java/expo/modules/focuscontrol/FocusAccessibilityService.kt)
- **Role**: Foreground package detection and app blocking service.
- **Implementation Status**: **Lifecycle Scaffold (Phase 2 Target)**
- **APIs Used**:
  - `android.accessibilityservice.AccessibilityService`
  - `android.accessibilityservice.AccessibilityServiceInfo` (`TYPE_WINDOW_STATE_CHANGED`, `FEEDBACK_GENERIC`)
- **Security & Privacy**:
  - `canRetrieveWindowContent="false"` in XML configuration.
  - Does NOT declare `isAccessibilityTool="true"` to prevent Google Play policy violations.

### E. Resources
- [`android/src/main/res/xml/focus_accessibility_service.xml`](file:///D:/CustomModules/expo-focus-control/android/src/main/res/xml/focus_accessibility_service.xml): Accessibility configuration metadata.
- [`android/src/main/res/values/strings.xml`](file:///D:/CustomModules/expo-focus-control/android/src/main/res/values/strings.xml): Service description string.
- [`android/build.gradle`](file:///D:/CustomModules/expo-focus-control/android/build.gradle): Library gradle build script (`com.android.library`, `expo-module-gradle-plugin`).

---

## 2. iOS Native Layer (`ios/`)

### A. `ExpoFocusControlModule.swift`
- **Path**: [`ios/ExpoFocusControlModule.swift`](file:///D:/CustomModules/expo-focus-control/ios/ExpoFocusControlModule.swift)
- **Role**: iOS native module definition using `ExpoModulesCore`.
- **Implementation Status**: **Baseline Stub (Phase 4 Target)**
- **Behavior**: Reports `'unavailable'` for Android-specific APIs (`usageAccess`, `overlay`, `batteryOptimization`, `exactAlarm`); opens iOS system settings (`UIApplication.openSettingsURLString`).
- **Extensions Needed in Phase 4**: `FamilyControls`, `DeviceActivityMonitor`, `DeviceActivityReport`, `ShieldConfiguration`.

---

## 3. TypeScript Layer (`src/`)

### A. `ExpoFocusControl.types.ts`
- **Path**: [`src/ExpoFocusControl.types.ts`](file:///D:/CustomModules/expo-focus-control/src/ExpoFocusControl.types.ts)
- **Role**: Data contracts, event interfaces, and query options.
- **Implementation Status**: **Implemented (Phase 1 Complete)**

### B. `ExpoFocusControlModule.ts`
- **Path**: [`src/ExpoFocusControlModule.ts`](file:///D:/CustomModules/expo-focus-control/src/ExpoFocusControlModule.ts)
- **Role**: Native module type definition loaded via `requireNativeModule`.

### C. `ExpoFocusControlModule.web.ts`
- **Path**: [`src/ExpoFocusControlModule.web.ts`](file:///D:/CustomModules/expo-focus-control/src/ExpoFocusControlModule.web.ts)
- **Role**: Web stub returning default `'unavailable'` states.

### D. `index.ts`
- **Path**: [`src/index.ts`](file:///D:/CustomModules/expo-focus-control/src/index.ts)
- **Role**: Public consumer interface for React Native applications.
- **Implementation Status**: **Implemented (Phase 1 Complete)**

### E. `src/__tests__/ExpoFocusControl.test.ts`
- **Path**: [`src/__tests__/ExpoFocusControl.test.ts`](file:///D:/CustomModules/expo-focus-control/src/__tests__/ExpoFocusControl.test.ts)
- **Role**: Automated unit tests for all public API methods.
- **Coverage**: 7 tests, 100% passing.

---

## 4. Config Plugin Layer (`plugin/`)

### A. `plugin/src/index.ts`
- **Path**: [`plugin/src/index.ts`](file:///D:/CustomModules/expo-focus-control/plugin/src/index.ts)
- **Role**: Plugin entrypoint and strict schema validator.
- **Implementation Status**: **Implemented (Phase 1 Complete)**

### B. `plugin/src/withAndroid.ts`
- **Path**: [`plugin/src/withAndroid.ts`](file:///D:/CustomModules/expo-focus-control/plugin/src/withAndroid.ts)
- **Role**: Modifies `AndroidManifest.xml` based on enabled feature flags.
- **Implementation Status**: **Implemented (Phase 1 Complete with CRITICAL finding noted below)**
- **CRITICAL Issue Identified**: Service class names are inserted as relative names (`.FocusAccessibilityService`, `.FocusVpnService`, `.FocusSessionService`, `.FocusOverlayService`, `.FocusBootReceiver`). When merged into a consumer app, AAPT2 prefixes the app's package name (`<app.package>.FocusAccessibilityService`), causing runtime `ClassNotFoundException`.

### C. `plugin/src/withIos.ts`
- **Path**: [`plugin/src/withIos.ts`](file:///D:/CustomModules/expo-focus-control/plugin/src/withIos.ts)
- **Role**: Injects Family Controls entitlement and `NSFamilyControlsUsageDescription`.

### D. `plugin/src/__tests__/plugin.test.ts`
- **Path**: [`plugin/src/__tests__/plugin.test.ts`](file:///D:/CustomModules/expo-focus-control/plugin/src/__tests__/plugin.test.ts)
- **Role**: Unit tests for schema validation, manifest mutations, idempotency, and clean rollback.
- **Coverage**: 10 tests, 100% passing.

---

## 5. Example Application (`example/`)

### A. `example/App.tsx`
- **Path**: [`example/App.tsx`](file:///D:/CustomModules/expo-focus-control/example/App.tsx)
- **Role**: Permission Dashboard and Today's Usage testing interface.
- **Features**: Status badges, direct settings navigation, auto-refresh on foregrounding via `AppState`, and foreground usage duration rendering.

### B. `example/app.json`
- **Path**: [`example/app.json`](file:///D:/CustomModules/expo-focus-control/example/app.json)
- **Role**: Expo SDK 58 application manifest with `../app.plugin.js` configuration.

