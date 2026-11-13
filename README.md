# expo-focus-control

A reusable Expo Native Module for React Native and Expo (SDK 58) that handles digital wellbeing features: screen time tracking, querying installed device applications, native foreground app blocking with non-intrusive full-screen overlays, and background battery diagnostics.

Works with Continuous Native Generation (CNG) via an Expo Config Plugin.

---

## Features

- **App Usage Stats**: Query daily, weekly, or custom-range screen time data per application using Android `UsageStatsManager`.
- **Installed App Picker**: List all launchable device applications (`getInstalledApplications()`) to build custom app selection lists.
- **Application Blocking**: Intercept distracting apps in real time via an Android `AccessibilityService`.
- **Native Blocking Screen**: Renders a dark, full-screen native overlay (`TYPE_ACCESSIBILITY_OVERLAY`) directly over blocked apps with "Return to Focus" and "Exit to Home" actions. Bypasses OEM popup restrictions (e.g. Xiaomi HyperOS / MIUI).
- **Battery & Background Diagnostics**: Granular inspection of Android Doze whitelist status, background restrictions, system Battery Saver mode, and deep-links to OEM autostart screens (Xiaomi, Huawei, Oppo, Vivo).
- **Config Plugin**: Enable only the permissions and native services your app actually needs via `app.json`.

---

## Compatibility

| Platform | Support | Requirements |
| :--- | :--- | :--- |
| **Android** | ✅ Full support | Android 7.0+ (API 24+) |
| **iOS** | ⏳ Coming Soon | Apple Screen Time Frameworks |
| **Expo SDK** | 58 | New Architecture (Fabric / TurboModules) enabled |

---

## 1. Installation

Install the package into your Expo project:

```bash
npx expo install expo-focus-control
```

---

## 2. Configure `app.json` (Config Plugin)

Add `expo-focus-control` to the `plugins` array in your `app.json`. Every permission and service is strictly opt-in so you do not carry unused permissions into production:

```json
{
  "expo": {
    "name": "MyFocusApp",
    "slug": "my-focus-app",
    "plugins": [
      [
        "expo-focus-control",
        {
          "android": {
            "usageStats": true,
            "accessibilityBlocking": true,
            "overlay": true,
            "websiteBlocking": true,
            "focusForegroundService": true,
            "bootReceiver": true,
            "exactAlarms": true,
            "batteryOptimizationExemption": false,
            "packageVisibility": {
              "mode": "all"
            }
          }
        }
      ]
    ]
  }
}
```

### Config Options Explained

| Option | Default | What it does |
| :--- | :--- | :--- |
| `usageStats` | `true` | Adds `PACKAGE_USAGE_STATS`. Required for `getDailyUsage()` and `getUsageBetween()`. |
| `accessibilityBlocking` | `true` | Registers `FocusAccessibilityService`. Required to detect when blocked apps are opened. |
| `overlay` | `true` | Adds `SYSTEM_ALERT_WINDOW` permission and registers `FocusOverlayService`. |
| `websiteBlocking` | `false` | Registers `FocusVpnService` with `BIND_VPN_SERVICE` for on-device DNS website blocking. |
| `focusForegroundService`| `false` | Adds sticky foreground service with live countdown notification (`specialUse`). |
| `bootReceiver` | `false` | Adds `RECEIVE_BOOT_COMPLETED` to resume active sessions after phone restart. |
| `exactAlarms` | `false` | Adds `SCHEDULE_EXACT_ALARM`. Only enable if scheduling exact timer alarms. |
| `packageVisibility.mode`| `"all"` | Set to `"all"` to let `getInstalledApplications()` query every user app on Android 11+ (`QUERY_ALL_PACKAGES`). Or set to `"selected"` with specific packages. |

After modifying `app.json`, generate the native code:

```bash
npx expo prebuild --clean
```

---

## 3. Quick Start Guide

### A. Check Permissions & Open System Settings

Android security requires users to manually enable sensitive permissions in system settings. The module provides both status checks and direct deep-links:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import * as FocusControl from 'expo-focus-control';

export function PermissionsScreen() {
  const [statuses, setStatuses] = useState(FocusControl.getPermissionStatuses());

  const refresh = () => setStatuses(FocusControl.getPermissionStatuses());

  return (
    <View style={{ padding: 20 }}>
      {/* 1. Usage Stats Permission */}
      <Text>Usage Stats: {statuses.usageAccess}</Text>
      {statuses.usageAccess !== 'granted' && (
        <Button title="Grant Usage Access" onPress={FocusControl.openUsageAccessSettings} />
      )}

      {/* 2. Accessibility Service (Required for Blocking) */}
      <Text>Accessibility: {statuses.accessibilityService}</Text>
      {statuses.accessibilityService !== 'CONNECTED' && (
        <Button title="Enable Accessibility" onPress={FocusControl.openAccessibilitySettings} />
      )}

      {/* 3. Overlay Permission */}
      <Text>Overlay: {statuses.overlayPermission}</Text>
      {statuses.overlayPermission !== 'granted' && (
        <Button title="Grant Overlay" onPress={FocusControl.openOverlaySettings} />
      )}

      <Button title="Refresh Statuses" onPress={refresh} />
    </View>
  );
}
```

> **Android 13+ Note ("Restricted Setting")**:  
> If an APK is sideloaded (via development build or ADB), Android 13+ disables accessibility toggles by default. Tell your users to go to **App Info ➔ 3 dots (top right) ➔ Allow restricted settings**, and then turn on the Accessibility toggle.

---

### B. Build a Searchable App Picker

Use `getInstalledApplications()` to show a list of device apps so users can pick what they want to block:

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native';
import * as FocusControl from 'expo-focus-control';
import type { InstalledApp } from 'expo-focus-control';

export function AppPickerScreen() {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);

  useEffect(() => {
    // Fetches all launchable user-facing apps (filters out internal system services)
    FocusControl.getInstalledApplications({ includeSystemApps: false }).then(setApps);
  }, []);

  const toggleApp = (pkg: string) => {
    setSelectedPackages((prev) =>
      prev.includes(pkg) ? prev.filter((p) => p !== pkg) : [...prev, pkg]
    );
  };

  const filtered = apps.filter(
    (a) =>
      a.appName.toLowerCase().includes(search.toLowerCase()) ||
      a.packageName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TextInput
        placeholder="Search apps..."
        value={search}
        onChangeText={setSearch}
        style={{ borderWidth: 1, borderColor: '#ccc', padding: 8, borderRadius: 8, marginBottom: 12 }}
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.packageName}
        renderItem={({ item }) => {
          const isSelected = selectedPackages.includes(item.packageName);
          return (
            <TouchableOpacity
              onPress={() => toggleApp(item.packageName)}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: 12,
                backgroundColor: isSelected ? '#e0f2fe' : '#fff',
                borderBottomWidth: 1,
                borderBottomColor: '#eee',
              }}
            >
              <View>
                <Text style={{ fontWeight: '600' }}>{item.appName}</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>{item.packageName}</Text>
              </View>
              <Text>{isSelected ? '✓ Blocked' : '+ Add'}</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
```

---

### C. Start & Stop Application Blocking

Once you have the list of package names, start the focus session:

```tsx
import * as FocusControl from 'expo-focus-control';

// 1. Save the list of packages to block (persists across phone reboots)
FocusControl.setBlockedApplications([
  'com.instagram.android',
  'com.instagram.lite',
  'com.google.android.youtube',
]);

// 2. Start blocking
FocusControl.startAppBlocking();

// 3. Check live status at any time
const status = FocusControl.getAppBlockingStatus();
console.log(status.isBlockingActive); // true
console.log(status.overlayShowing);    // true if a blocked app is currently open

// 4. Stop blocking and immediately dismiss the overlay
FocusControl.stopAppBlocking();
```

---

### D. Track Screen Time & Daily App Usage

Query historical screen time directly from Android's `UsageStatsManager`:

```tsx
import * as FocusControl from 'expo-focus-control';

async function loadTodayStats() {
  const result = await FocusControl.getDailyUsage('today', {
    excludeSelf: true, // Don't include your own app
    sortByUsage: true, // Highest screen time first
    limit: 10,         // Top 10 apps
  });

  result.records.forEach((app) => {
    const minutes = Math.round(app.totalTimeInForeground / 60000);
    console.log(`${app.appName || app.packageName}: ${minutes} mins`);
  });
}

// Or query custom millisecond timestamps:
const stats = await FocusControl.getUsageBetween(startTimestamp, endTimestamp);
```

---

### E. Battery & OEM Diagnostics

Background services can be silently restricted by aggressive OEM managers (Xiaomi, Samsung, Huawei). You can inspect this and route users to the appropriate settings:

```tsx
import * as FocusControl from 'expo-focus-control';

const diag = FocusControl.getBatteryDiagnostics();

console.log(diag.dozeExempt);                 // true if exempt from Android Doze
console.log(diag.backgroundRestricted);       // true if restricted by user in App Info
console.log(diag.batterySaverEnabled);        // true if device is in Low Power Mode
console.log(diag.overallBackgroundReadiness); // 'READY' | 'OPTIMIZED' | 'DEGRADED' | 'RESTRICTED'

// Open standard App Info page:
FocusControl.openBatterySettings();

// Open manufacturer-specific autostart settings (Xiaomi MIUI Autostart, Huawei, etc.):
FocusControl.openOemBatterySettings();
```

---

### F. Timed Focus Sessions & Sticky Countdown Notification

Run a Pomodoro or custom focus session in the background with an ongoing status bar countdown notification:

```tsx
import * as FocusControl from 'expo-focus-control';

// 1. Start a 25-minute Pomodoro session (duration in seconds)
// Automatically starts FocusSessionService and links app blocking
const session = FocusControl.startFocusSession(1500, {
  sessionName: 'Deep Work',
  enableAppBlocking: true,
});

console.log(session.isActive);         // true
console.log(session.remainingSeconds); // 1500

// 2. Query live session progress anytime
const live = FocusControl.getFocusSessionStatus();
console.log(`${live.remainingSeconds}s remaining`);

// 3. Pause / Resume
FocusControl.pauseFocusSession();
FocusControl.resumeFocusSession();

// 4. Manually end session early
FocusControl.stopFocusSession();
```

> **Reboot Survival**: If the phone restarts during a session, `FocusBootReceiver` calculates remaining time and restores the session and blocking rules automatically upon device startup.

---

### G. Website & Domain Blocking via Local DNS Sinkhole

Block distracting websites in Chrome, Brave, and other web browsers:

```tsx
import * as FocusControl from 'expo-focus-control';

// 1. Define websites to block
FocusControl.setBlockedWebsites([
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'reddit.com',
]);

// 2. Request VPN authorization (triggers Android system prompt once)
const isVpnAuthorized = FocusControl.requestVpnPermission();

// 3. Start local website blocking
if (isVpnAuthorized) {
  FocusControl.startWebsiteBlocking();
}

// 4. Check status
const vpnStatus = FocusControl.getWebsiteBlockingStatus();
console.log(vpnStatus.isActive); // true

// 5. Stop website blocking
FocusControl.stopWebsiteBlocking();
```

> **100% Local & Private**: `FocusVpnService` routes DNS queries to a local loopback and sinks blocked domains. Zero user data leaves the device and non-blocked internet traffic is untouched.

---

## 4. API Reference

### Timed Focus Sessions
- **`startFocusSession(durationSeconds, options?)`**: `FocusSessionStatus`  
  Starts a timed session with a persistent status bar notification and auto-linked app blocking.
- **`stopFocusSession()`**: `FocusSessionStatus`  
  Cancels session, dismisses notification, and deactivates blocking.
- **`pauseFocusSession()`**: `FocusSessionStatus`  
  Pauses the countdown timer and updates notification.
- **`resumeFocusSession()`**: `FocusSessionStatus`  
  Resumes countdown from where it was paused.
- **`getFocusSessionStatus()`**: `FocusSessionStatus`  
  Returns `{ isActive, isPaused, sessionName, durationSeconds, remainingSeconds, elapsedSeconds, autoAppBlocking }`.

### Website & Domain Blocking
- **`requestVpnPermission()`**: `boolean`  
  Opens Android's native VPN authorization dialog. Returns `true` if already authorized.
- **`setBlockedWebsites(domains: string[])`**: `void`  
  Configures blocked website domain names.
- **`getBlockedWebsites()`**: `string[]`  
  Retrieves currently blocked domain names.
- **`startWebsiteBlocking()`**: `boolean`  
  Starts local DNS sinkhole VPN service.
- **`stopWebsiteBlocking()`**: `void`  
  Stops VPN and restores normal device DNS.
- **`getWebsiteBlockingStatus()`**: `WebsiteBlockingStatus`  
  Returns `{ isActive, blockedWebsites, vpnServiceRunning }`.

### App Blocking & Selection
- **`getInstalledApplications(options?)`**: `Promise<InstalledApp[]>`  
  Returns all launchable apps on the device sorted alphabetically. Pass `{ includeSystemApps: true }` to include pre-installed system tools.
- **`setBlockedApplications(packages: string[])`**: `void`  
  Saves the list of packages to block.
- **`startAppBlocking()`**: `void`  
  Enables active interception in `FocusAccessibilityService`.
- **`stopAppBlocking()`**: `void`  
  Deactivates blocking and removes any active overlay.
- **`getAppBlockingStatus()`**: `AppBlockingStatus`  
  Returns `{ isBlockingActive, blockedApplications, overlayShowing }`.

### Usage Stats
- **`getDailyUsage(range, options?)`**: `Promise<UsageQueryResult>`  
  Convenience helper for `'today'`, `'yesterday'`, `'week'`, or `'month'`.
- **`getUsageBetween(startTime, endTime, options?)`**: `Promise<UsageQueryResult>`  
  Queries usage stats between custom millisecond timestamps.

### Permissions & Diagnostics
- **`getPermissionStatuses()`**: `PermissionStatuses`  
  Returns a combined snapshot of all permissions and battery diagnostics.
- **`getAccessibilityStatus()`**: `'NOT_DECLARED' | 'DISABLED' | 'ENABLED' | 'CONNECTED' | 'UNAVAILABLE'`  
  Live state of the accessibility service.
- **`getBatteryDiagnostics()`**: `BatteryDiagnostics`  
  Inspects Doze, background restrictions, and Battery Saver status.
- **`openAccessibilitySettings()`**: Opens Android Accessibility services.
- **`openUsageAccessSettings()`**: Opens Android Usage Access page.
- **`openOverlaySettings()`**: Opens "Display over other apps" toggle.
- **`openBatterySettings()`**: Opens App Info details screen.
- **`openOemBatterySettings()`**: Opens OEM autostart management (Xiaomi/Huawei/Oppo).
- **`getPlatformInfo()`**: `{ platform: string, sdkVersion: number }`.

---

## 5. System Safety & Privacy Guarantees

- **No Screen Reading**: `canRetrieveWindowContent` is hardcoded to `false` in the accessibility metadata. The service never reads text, passwords, messages, or screen contents.
- **System Exemptions**: Emergency dialers, Android system settings (`com.android.settings`), SystemUI, and the device's home launcher can never be blocked, preventing device lockouts.
- **Overlay Type**: Uses `TYPE_ACCESSIBILITY_OVERLAY` when the service is active, ensuring the blocking screen displays reliably above full-screen apps and games across all OEM flavors.

---

## License

MIT
