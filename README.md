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

### D. Customizing the Native Blocking Overlay UI

You can fully customize the visual appearance, texts, colors, sizes, alignment, emoji/icons, and buttons of the full-screen blocking overlay directly from TypeScript without writing native Android XML or Kotlin code:

```tsx
import * as FocusControl from 'expo-focus-control';

// Customize overlay shield appearance
FocusControl.setOverlayConfig({
  // Text & Messages
  title: 'Deep Work In Progress',
  titleColor: '#FFFFFF',
  titleSize: 24, // in sp
  message: 'This application is restricted during your scheduled focus time. Take a deep breath and return to your goals.',
  messageColor: '#94A3B8',
  messageSize: 14,

  // Icon / Emoji
  iconEmoji: '🧘‍♂️', // Custom emoji or badge icon
  iconSize: 64,     // in dp
  showAppIcon: true, // Display the blocked app's real icon, falls back to iconEmoji

  // Blocked App Name Label
  showBlockedAppName: true,
  blockedAppFormat: 'Restricted: %s',
  badgeTextColor: '#F87171',
  badgeTextSize: 13,

  // Primary Action Button (Brings user back to your focus app)
  showPrimaryButton: true,
  primaryButtonText: 'Return to Focus',
  primaryButtonColor: '#3B82F6',
  primaryButtonTextColor: '#FFFFFF',

  // Secondary Action Button (Sends user safely to Home Screen)
  showSecondaryButton: true,
  secondaryButtonText: 'Go to Home Screen',
  secondaryButtonTextColor: '#94A3B8',

  // Layout & Positioning
  cardAlignment: 'center', // 'center' | 'top' | 'bottom'
  cardMaxWidth: 360,       // in dp
  cardCornerRadius: 28,    // rounded pill card
  cardBackgroundColor: '#0F172A',
  cardBorderColor: '#1E293B',
  cardBorderWidth: 1,
  backgroundColor: '#F2020617', // Semi-transparent dark blur backdrop
});

// Inspect current active config
const currentConfig = FocusControl.getOverlayConfig();

// Reset back to clean default aesthetic anytime
FocusControl.resetOverlayConfig();
```

> **Persistence**: The overlay configuration is persisted in Android `SharedPreferences`. Once set, it stays active across app launches, device reboots, and applies even when your React Native app is completely backgrounded or closed.

---

### D2. Block-Based Layout Engine (Full Visual Freedom)

When you need complete design freedom—such as Opal-style screens with custom image icons, streak badges, dynamic cards, spacers, and custom button placements—use the **Block-Based Layout Engine**.

Similar to React Native's `StyleSheet`, you declare an ordered hierarchy of native blocks in TypeScript. The native module parses the configuration and converts it directly into native Android Views (`LinearLayout`, `TextView`, `Button`, `ImageView`, `FrameLayout`) in the `WindowManager` overlay:

```tsx
import * as FocusControl from 'expo-focus-control';

// Configure a custom block-based overlay layout
FocusControl.setOverlayLayout({
  backgroundColor: '#0D1117',
  paddingTop: 54,
  paddingBottom: 36,
  paddingHorizontal: 24,
  cardMaxWidth: 380,
  blocks: [
    // 1. Hero icon: circular crimson container with custom PNG image & app badge
    {
      type: 'icon',
      imageUri: 'data:image/png;base64,...', // Or file:/// or content:// URI
      iconSize: 48,
      containerSize: 92,
      containerColor: '#3B1824',
      containerBorderColor: '#EF4444',
      containerBorderWidth: 1,
      badgeEmoji: '💬',
      badgeSize: 28,
      badgeBackgroundColor: '#1F2937',
      alignSelf: 'center',
    },

    // 2. Headline
    {
      type: 'text',
      text: 'You’ve hit your limit',
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
      textAlign: 'center',
      marginTop: 22,
    },

    // 3. Subtitle with {appName} template substitution
    {
      type: 'text',
      text: "You've used {appName} for 30 of 30 minutes today.",
      fontSize: 14,
      color: '#94A3B8',
      textAlign: 'center',
      marginTop: 8,
    },

    // 4. Streak pill or info badge
    {
      type: 'badge',
      text: '🛡 Study streak protected (+45 XP)',
      backgroundColor: '#1E293B',
      textColor: '#22C55E',
      borderRadius: 16,
      fontSize: 13,
      paddingHorizontal: 14,
      paddingVertical: 6,
      alignSelf: 'center',
      marginTop: 16,
    },

    // 5. Flexible spacer pushing action buttons to bottom
    {
      type: 'spacer',
      flex: 1,
    },

    // 6. Primary Action: Electric lime "Close app" button
    {
      type: 'button',
      text: 'Close app',
      action: 'close', // 'close' | 'emergency' | 'goHome'
      backgroundColor: '#D4FF32',
      textColor: '#000000',
      borderRadius: 28,
      height: 54,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 12,
    },

    // 7. Secondary Action: Dark emergency pass button
    {
      type: 'button',
      text: '⏱ Emergency use ({durationMinutes} min)',
      action: 'emergency',
      backgroundColor: '#1B222C',
      textColor: '#F1F5F9',
      borderRadius: 28,
      height: 50,
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 10,
    },

    // 8. Footer subtext with {remainingPasses}
    {
      type: 'text',
      text: '{remainingPasses} left today',
      fontSize: 12,
      color: '#64748B',
      textAlign: 'center',
    },
  ],
});

// Retrieve or reset block layout
const activeLayout = FocusControl.getOverlayLayout();
FocusControl.resetOverlayLayout(); // Reverts to setOverlayConfig or default theme
```

#### Supported Block Types:
| Block Type | Description | Key Properties |
|---|---|---|
| `text` | Dynamic text with template variables | `text`, `fontSize`, `fontWeight`, `color`, `textAlign`, `lineHeight` |
| `button` | Native interactive button | `text`, `action` (`close`, `emergency`, `goHome`), `backgroundColor`, `textColor`, `borderRadius`, `borderWidth`, `borderColor`, `height` |
| `icon` | Circular container with image/emoji + badge | `imageUri`, `emoji`, `iconSize`, `containerSize`, `containerColor`, `containerBorderColor`, `badgeEmoji`, `badgeImageUri`, `badgeSize` |
| `image` | Standalone graphic or illustration | `uri` (file/content/base64), `width`, `height`, `borderRadius`, `resizeMode` |
| `badge` | Rounded pill badge for status/streaks | `text`, `textColor`, `backgroundColor`, `borderRadius`, `paddingVertical`, `paddingHorizontal` |
| `spacer` | Flexible or fixed vertical spacing | `flex` (default 1), `size` (fixed dp) |
| `divider` | Horizontal divider line | `color`, `thickness` |
| `card` | Grouped container with rounded border | `children`, `backgroundColor`, `borderColor`, `borderWidth`, `borderRadius`, `padding` |
| `row` | Horizontal flex container | `children`, `justifyContent`, `alignItems`, `backgroundColor`, `padding` |

#### Template Variables:
All text strings in `text`, `button`, and `badge` blocks automatically replace:
- `{appName}` — The human-readable name of the blocked application (e.g. `Reddit`, `Instagram`).
- `{remainingPasses}` — Number of emergency passes remaining for today (e.g. `3`).
- `{durationMinutes}` — Emergency pass duration in minutes (e.g. `5`).

---

### E. Emergency Passes & Temporary Grace Periods

Allow users a strictly regulated number of emergency unlocks per day (e.g. 5 minutes, max 3 times daily) with automatic midnight reset, optional cooldowns, and automatic re-blocking when the minutes expire:

```tsx
import * as FocusControl from 'expo-focus-control';

// 1. Configure the emergency pass rules
FocusControl.setEmergencyPassConfig({
  enabled: true,
  durationMinutes: 5,           // Unlocks app for 5 minutes
  dailyLimit: 3,                // Max 3 emergency unlocks per calendar day
  cooldownMinutes: 10,          // 10-minute cooldown between passes to prevent abuse
  showButtonOnOverlay: true,    // Shows emergency button directly on native overlay
  buttonText: 'Emergency Access',
  buttonColor: '#334155',
  buttonTextColor: '#F8FAFC',
  showRemainingCount: true,     // Shows "· 2 left" on the button
});

// 2. Query live status in your app UI
const status = FocusControl.getEmergencyPassStatus();
console.log(status.remainingPasses); // 2
console.log(status.isPassActive);    // true if currently inside an emergency window
console.log(status.remainingSeconds); // Seconds left before app re-locks
console.log(status.isInCooldown);     // true if cooldown is active

// 3. Programmatic controls (optional)
// Trigger a pass directly from React Native:
FocusControl.activateEmergencyPass('com.instagram.android', 5);

// Cancel active pass immediately (restores blocking):
FocusControl.cancelEmergencyPass();

// Grant extra bonus passes or reset:
FocusControl.grantEmergencyPasses(1);
FocusControl.resetEmergencyPasses();
```

> **Zero Host Interaction Required**: When `showButtonOnOverlay` is enabled, users can tap the emergency button directly on the native blocking overlay to unlock the app without having to open your focus app first. When the timer expires, the overlay immediately re-appears and re-locks the application.

---

### F. Track Screen Time & Daily App Usage

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

### G. Battery & OEM Diagnostics

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

### H. Timed Focus Sessions & Sticky Countdown Notification

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

### I. Website & Domain Blocking via Local DNS Sinkhole

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

### Native Overlay UI Customization
- **`setOverlayConfig(config: OverlayConfig)`**: `void`  
  Configures overlay texts, colors, sizes, alignment (`'center' | 'top' | 'bottom'`), icon/emoji, and primary/secondary action buttons.
- **`getOverlayConfig()`**: `OverlayConfig`  
  Returns current active overlay UI configuration.
- **`resetOverlayConfig()`**: `void`  
  Resets overlay styling to module default theme.

### Emergency Pass / Grace Period
- **`setEmergencyPassConfig(config: EmergencyPassConfig)`**: `void`  
  Configures pass duration (mins), daily limits, cooldown, and button styling.
- **`getEmergencyPassConfig()`**: `EmergencyPassConfig`  
  Returns active emergency pass configuration.
- **`resetEmergencyPassConfig()`**: `void`  
  Resets emergency pass configuration to defaults.
- **`getEmergencyPassStatus(packageName?)`**: `EmergencyPassStatus`  
  Returns daily remaining count, active timer, and cooldown info.
- **`activateEmergencyPass(packageName?, customMinutes?)`**: `EmergencyPassActivationResult`  
  Unlocks the app temporarily, decrements daily count, and dismisses overlay.
- **`cancelEmergencyPass()`**: `void`  
  Cancels active grace period early and re-arms blocking.
- **`resetEmergencyPasses()`**: `void`  
  Resets daily passes counter back to the configured limit.
- **`grantEmergencyPasses(count: number)`**: `void`  
  Adds bonus emergency passes to today's remaining allowance.

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
