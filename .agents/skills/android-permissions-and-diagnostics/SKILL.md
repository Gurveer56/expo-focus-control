---
name: android-permissions-and-diagnostics
description: Teaches Android permission types, authorization mechanisms, battery diagnostics, background restrictions, and OEM quirks in expo-focus-control without confusing system states.
---

# Android Permissions and Diagnostics

## Purpose
This skill teaches agents how Android permissions, authorization mechanisms, background limits, and power management features work in `expo-focus-control`. It details how each permission is detected, navigated, and reported, and prevents confusing distinct operating system states.

## When to Use
Use this skill when:
- Adding or checking permissions in `PermissionManager.kt`.
- Diagnosing why a permission or setting appears disabled, denied, or restricted.
- Implementing settings navigation intents (`Settings.ACTION_*`).
- Evaluating battery optimization, Doze mode, or background execution readiness.
- Handling manufacturer-specific autostart or power policies (Xiaomi, Samsung, Oppo, etc.).

## Critical Concept Separations (Never Confuse These)

1. **Doze Whitelist vs. Unrestricted Battery Mode**:
   - `PowerManager.isIgnoringBatteryOptimizations(pkg)` checks ONLY whether the app is exempt from network cuts during Doze idle windows.
   - It does NOT mean the user selected "Unrestricted" in Android 12+ App Info.
   - It does NOT mean the app cannot be killed by the OS or an OEM task killer.
2. **Background Restriction vs. OEM Autostart**:
   - `ActivityManager.isBackgroundRestricted` (API 28+) detects whether the user placed the app in restricted background mode in standard Android settings.
   - It CANNOT detect OEM proprietary locks (e.g., Xiaomi MIUI Autostart, Huawei App Launch, Samsung Sleeping Apps). Always report OEM status as `"UNKNOWN"` if not querying a verified OEM provider.
3. **Accessibility Enabled vs. AccessibilityService Connected**:
   - `AccessibilityManager.getEnabledAccessibilityServiceList` tells you only if the switch is ON in Settings.
   - It does NOT mean the service is alive, bound, or handling events. If the service crashed or was killed by the system, it will be enabled but disconnected.
   - Always track the active connected lifecycle flag (`isConnected` in `FocusAccessibilityService`).
4. **Manifest Declaration vs. User-Granted Access**:
   - Declaring `<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" />` in the manifest does NOT grant usage stats.
   - It requires explicit user authorization via AppOps in Special App Access settings.
5. **VPN Service Registration vs. VPN Authorization**:
   - Declaring `FocusVpnService` in the manifest does NOT mean VPN permission is granted.
   - Check `VpnService.prepare(context) == null` to verify if the system has authorized the VPN tunnel.

## Android Permissions Reference Table

| Permission / Subsystem | Android API Level | Authorization Mechanism | Detection Method | Settings Navigation Intent |
| :--- | :--- | :--- | :--- | :--- |
| **Usage Stats** (`PACKAGE_USAGE_STATS`) | API 21+ | AppOps Special App Access | `AppOpsManager.unsafeCheckOpRawNoThrow(OPSTR_GET_USAGE_STATS)` | `Settings.ACTION_USAGE_ACCESS_SETTINGS` |
| **Accessibility** (`BIND_ACCESSIBILITY_SERVICE`) | API 16+ | Special System Service Binding | `AccessibilityManager` + Service Companion `isConnected` | `Settings.ACTION_ACCESSIBILITY_SETTINGS` |
| **Overlay** (`SYSTEM_ALERT_WINDOW`) | API 23+ | AppOps Draw Over Other Apps | `Settings.canDrawOverlays(context)` | `Settings.ACTION_MANAGE_OVERLAY_PERMISSION` with `package:<pkg>` |
| **VPN** (`BIND_VPN_SERVICE`) | API 14+ | System dialog prompt via `VpnService.prepare` | `VpnService.prepare(context) == null` | `VpnService.prepare(context)` (returns Intent if ungranted) |
| **Exact Alarms** (`SCHEDULE_EXACT_ALARM`) | API 31+ | AppOps Alarms & Reminders | `AlarmManager.canScheduleExactAlarms()` | `Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM` with `package:<pkg>` |
| **Doze Exemption** | API 23+ | User optimization whitelist | `PowerManager.isIgnoringBatteryOptimizations(pkg)` | `Settings.ACTION_APPLICATION_DETAILS_SETTINGS` (App Info) |
| **Background Restricted** | API 28+ | User per-app restriction | `ActivityManager.isBackgroundRestricted` | `Settings.ACTION_APPLICATION_DETAILS_SETTINGS` (App Info) |

## Notifications Architecture Rule
**IMPORTANT**: Notifications (`POST_NOTIFICATIONS`) must **NOT** be managed by `expo-focus-control`. 
- The consuming application handles notification requests and delivery through `expo-notifications`.
- Do not add notification permission checkers, prompt methods, or manifest injections to `expo-focus-control`.
- If a foreground service in future phases requires an ongoing notification under Android 14+ rules, document that requirement for the consuming app rather than managing general notification permissions inside this module.

## Granular Battery Diagnostics Model

In `PermissionManager.kt`, battery status must be reported as a structured diagnostic object:
```kotlin
fun getBatteryDiagnostics(): Map<String, Any> {
  val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
  val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager

  val dozeExempt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
    pm.isIgnoringBatteryOptimizations(context.packageName)
  } else false

  val backgroundRestricted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
    am.isBackgroundRestricted
  } else false

  val batterySaverEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
    pm.isPowerSaveMode
  } else false

  val readiness = when {
    backgroundRestricted -> "RESTRICTED"
    batterySaverEnabled -> "DEGRADED"
    dozeExempt -> "READY"
    else -> "OPTIMIZED"
  }

  return mapOf(
    "dozeExempt" to dozeExempt,
    "backgroundRestricted" to backgroundRestricted,
    "batterySaverEnabled" to batterySaverEnabled,
    "oemBatteryManagement" to "UNKNOWN",
    "overallBackgroundReadiness" to readiness
  )
}
```

## Universal Navigation Fallback
When navigating users to configure battery or permissions:
- Use `Settings.ACTION_APPLICATION_DETAILS_SETTINGS` with `package:<packageName>`.
- This directs the user to their app's main page where they can access "Battery", "Permissions", and the Android 13+ "Allow restricted settings" option.

## Common Mistakes
1. **Calling `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`**: This pops a direct prompt to whitelist the app from battery optimization, but Google Play policy explicitly forbids this intent for productivity/focus apps and will reject submissions.
2. **Assuming `canScheduleExactAlarms()` works without manifest declaration**: On Android 13+, calling `canScheduleExactAlarms()` returns `false` if `SCHEDULE_EXACT_ALARM` was not injected by the config plugin.
3. **Assuming `canDrawOverlays()` is enough on MIUI/HyperOS**: Xiaomi requires an extra permission ("Display pop-up windows while running in the background") located in `com.miui.permcenter.permissions.PermissionsEditorActivity`.

## Relevant Files
- `android/src/main/java/expo/modules/focuscontrol/PermissionManager.kt`
- `src/ExpoFocusControl.types.ts`
- `src/index.ts`

