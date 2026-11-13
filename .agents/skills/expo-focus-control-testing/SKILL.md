---
name: expo-focus-control-testing
description: Teaches how to test and verify expo-focus-control through unit tests, clean prebuilds, Gradle manifest processing, ADB physical device inspection, and evidence-based audit reporting.
---

# Expo Focus Control Testing & Verification

## Purpose
This skill establishes the rigorous verification and testing procedures for `expo-focus-control`. It ensures that agents do not assume code works simply because TypeScript or Gradle compiled, but verify through merged manifest inspections, automated unit tests, and real-world ADB hardware queries.

## When to Use
Use this skill when:
- Running regression test suites before and after code modifications.
- Verifying that config plugin changes result in clean, valid Android manifests.
- Building and installing debug APKs onto connected Android emulators or physical devices.
- Verifying service registration and system binding status using ADB commands.
- Compiling evidence-based audit reports.

## Testing Procedures & Commands

### 1. TypeScript & Unit Tests
Run the Jest test suite covering the public API and config plugin:
```bash
# In repository root
npm test
```
To run each test suite individually:
```bash
npx jest src/__tests__/ExpoFocusControl.test.ts
npx jest plugin/src/__tests__/plugin.test.ts
```
To verify TypeScript compilation across the module and plugin without emitting files:
```bash
npx tsc --noEmit
cd plugin && npx tsc --noEmit && cd ..
cd example && npx tsc --noEmit && cd ..
```

### 2. Clean Prebuild & Config Plugin Verification
Verify Continuous Native Generation idempotency by running clean prebuilds:
```bash
cd example
npx expo prebuild --platform android --clean --no-install
```
Inspect the generated manifest:
`example/android/app/src/main/AndroidManifest.xml`

### 3. Gradle Manifest Processing
Run the Android Gradle Plugin manifest merger to ensure there are no attribute clashes, missing resources, or AAPT2 errors:
```bash
cd example/android
.\gradlew :app:processDebugMainManifest
```
Inspect the merged manifest at:
`example/android/app/build/intermediates/merged_manifest/debug/processDebugMainManifest/AndroidManifest.xml`

### 4. Compiling Kotlin & Installing Development Build
Build and deploy the debug APK to the connected device:
```bash
cd example/android
.\gradlew installDebug
```

### 5. Physical Device ADB Inspection

#### A. Verify Accessibility Service Discovery
Check whether the Android OS recognizes the service:
```bash
adb shell pm query-services -a "android.accessibilityservice.AccessibilityService"
```
Look for:
`name=expo.modules.focuscontrol.FocusAccessibilityService`
`permission=android.permission.BIND_ACCESSIBILITY_SERVICE`

#### B. Verify Accessibility Service Binding & Live Status
Check if the service is currently enabled and bound:
```bash
adb shell dumpsys accessibility | grep -E "Bound services|Enabled services"
```
To programmatically enable for testing:
```bash
adb shell settings put secure enabled_accessibility_services expo.modules.focuscontrol.example/expo.modules.focuscontrol.FocusAccessibilityService
adb shell settings put secure accessibility_enabled 1
```

#### C. Verify AppOps Permissions
Check runtime status of AppOps permissions (Usage Stats, System Alert Window):
```bash
adb shell cmd appops get expo.modules.focuscontrol.example
```
Look for:
`GET_USAGE_STATS: allow`
`SYSTEM_ALERT_WINDOW: allow`

#### D. Verify VPN Service
Check VPN registration:
```bash
adb shell pm query-services -a "android.net.VpnService"
```

#### E. Test Overlay Intent
Check app details settings intent:
```bash
adb shell am start -a android.settings.APPLICATION_DETAILS_SETTINGS -d package:expo.modules.focuscontrol.example
```

## Evidence-Based Reporting Rules

When producing audit or implementation reports:
1. **Never fabricate test results**: If a physical device is disconnected, explicitly state **[NOT TESTED ON PHYSICAL HARDWARE]**.
2. **Include actual command outputs**: Copy the exact JSON or terminal text produced by Gradle or ADB.
3. **Trace root causes**: Do not describe just the symptom (e.g. "it was grayed out"); explain the mechanism (e.g. "feature flag was false in app.json, resulting in no manifest injection").

## Relevant Project Files
- `src/__tests__/ExpoFocusControl.test.ts`
- `plugin/src/__tests__/plugin.test.ts`
- `GENERATED_MERGED_MANIFEST.xml`
- `FOCUS_CONTROL_AUDIT.md`

