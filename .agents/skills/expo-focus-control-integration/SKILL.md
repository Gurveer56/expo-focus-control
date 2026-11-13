---
name: expo-focus-control-integration
description: Complete integration guide for adding and using expo-focus-control in any Expo / React Native project. Covers package installation, app.json config plugin setup, permission management, app blocking, focus sessions, website blocking, and usage stats tracking.
---

# `expo-focus-control` Integration Guide

This skill teaches AI coding assistants how to install, configure, and integrate `expo-focus-control` into any consumer Expo (SDK 50+) or React Native project.

---

## 1. Package Overview

`expo-focus-control` is a reusable Expo Native Module for digital wellbeing and focus control:
- **Application Blocking**: Intercepts distracting apps via Android `AccessibilityService` and displays an un-bypassable native `TYPE_ACCESSIBILITY_OVERLAY` full-screen shield.
- **Installed App Picker**: Queries all user-facing launchable apps on the device (`getInstalledApplications()`) to build custom selection screens.
- **Timed Focus Sessions**: Runs background focus sessions via an Android Foreground Service with a persistent, un-swipeable status bar countdown notification.
- **Reboot Resilience**: Automatically restores ongoing focus sessions and app blocking rules if the user reboots their device.
- **Website & Domain Blocking**: Local DNS sinkhole VPN service (`VpnService`) that intercepts browser requests to distracting domains (Chrome, Brave, etc.) without external servers.
- **Screen Time & App Usage**: Reads real daily or historical application screen time using Android `UsageStatsManager`.
- **Battery & OEM Diagnostics**: Detects Android Doze mode exemption, background execution restrictions, battery saver mode, and provides deep-links to OEM autostart screens (Xiaomi MIUI/HyperOS, Huawei, Oppo, Vivo, Samsung).

---

## 2. Installation & Continuous Native Generation (CNG)

### Step 1: Install Package
In the target project root, run:
```bash
# With npm:
npx expo install github:Gurveer56/expo-focus-control

# With Yarn:
yarn add https://github.com/Gurveer56/expo-focus-control.git
```

### Step 2: Configure `app.json` (Config Plugin)
Add `expo-focus-control` to the `plugins` array in `app.json`. Enable only the capabilities the app uses:

```json
{
  "expo": {
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

#### Plugin Options Reference:
| Option | Type | Description |
| :--- | :--- | :--- |
| `usageStats` | `boolean` | Injects `PACKAGE_USAGE_STATS`. Required for `getDailyUsage()` / `getUsageBetween()`. |
| `accessibilityBlocking` | `boolean` | Registers `FocusAccessibilityService`. Required for detecting and blocking apps. |
| `overlay` | `boolean` | Injects `SYSTEM_ALERT_WINDOW` & registers `FocusOverlayService`. |
| `websiteBlocking` | `boolean` | Registers `FocusVpnService` with `BIND_VPN_SERVICE` for on-device DNS blocking. |
| `focusForegroundService`| `boolean` | Registers `FocusSessionService` (`specialUse`) for persistent countdown notifications. |
| `bootReceiver` | `boolean` | Registers `FocusBootReceiver` to resume sessions across device restarts. |
| `exactAlarms` | `boolean` | Injects `SCHEDULE_EXACT_ALARM`. |
| `packageVisibility.mode`| `"all" \| "selected"` | Set to `"all"` to discover every user app on Android 11+ (`QUERY_ALL_PACKAGES`). |

### Step 3: Run Prebuild
Because this module includes native Kotlin code and background services, always generate the native code:
```bash
npx expo prebuild --clean
```

---

## 3. TypeScript Public API Reference

```typescript
import * as FocusControl from 'expo-focus-control';
import type {
  InstalledApp,
  FocusSessionStatus,
  FocusSessionOptions,
  AppBlockingStatus,
  EmergencyPassActivationResult,
  EmergencyPassConfig,
  EmergencyPassStatus,
  OverlayConfig,
  OverlayBlock,
  OverlayLayoutConfig,
  WebsiteBlockingStatus,
  PermissionStatuses,
  BatteryDiagnostics,
  UsageQueryResult,
} from 'expo-focus-control';
```

### A. Permissions & Settings Navigation
```typescript
// Snapshot of all permissions
const statuses: PermissionStatuses = FocusControl.getPermissionStatuses();
// statuses.accessibilityService: 'CONNECTED' | 'ENABLED' | 'DISABLED' | 'NOT_DECLARED' | 'UNAVAILABLE'
// statuses.usageAccess: 'granted' | 'denied'
// statuses.overlayPermission: 'granted' | 'denied'
// statuses.vpnPermission: 'granted' | 'denied'

// Direct deep-links to system settings:
FocusControl.openAccessibilitySettings();
FocusControl.openUsageAccessSettings();
FocusControl.openOverlaySettings();
FocusControl.openBatterySettings();       // Standard App Info details
FocusControl.openOemBatterySettings();    // OEM autostart (Xiaomi MIUI/HyperOS, Huawei, Oppo, Vivo)
```

> **Android 13+ "Restricted Settings" Rule**:  
> For sideloaded development APKs, Android disables the Accessibility toggle by default. Guide the user to: **App Info ➔ 3 dots (top right) ➔ Allow restricted settings**, and then turn on the Accessibility toggle.

---

### B. Device Applications Discovery (App Picker)
```typescript
// Fetch launchable apps (excludes background system daemons)
const apps: InstalledApp[] = await FocusControl.getInstalledApplications({
  includeSystemApps: false, // Set to true to include system tools
});

// Each item contains:
// { packageName: string, appName: string, isSystemApp: boolean }
```

---

### C. Application Blocking
```typescript
// 1. Configure target package names
FocusControl.setBlockedApplications([
  'com.instagram.android',
  'com.google.android.youtube',
]);

// 2. Start blocking
FocusControl.startAppBlocking();

// 3. Inspect live status
const status: AppBlockingStatus = FocusControl.getAppBlockingStatus();
// status.isBlockingActive: boolean
// status.blockedApplications: string[]
// status.overlayShowing: boolean

// 4. Stop blocking (immediately dismisses native overlay)
FocusControl.stopAppBlocking();
```

---

### D. Native Overlay UI Customization
Consumers can fully customize the visual presentation, text, sizes, colors, alignment, icon/emoji, and buttons of the full-screen blocking shield without modifying native Android code:

```typescript
// Configure overlay design (persists in SharedPreferences across app restarts)
FocusControl.setOverlayConfig({
  // Text content & typography
  title: 'Focus Mode Active',
  titleColor: '#FFFFFF',
  titleSize: 24, // in sp
  message: 'This application is restricted during your focus time.',
  messageColor: '#94A3B8',
  messageSize: 14, // in sp

  // Icon / Emoji
  iconEmoji: '🛡️',
  iconSize: 64,      // in dp
  showAppIcon: true, // Display blocked app's real icon, fallback to iconEmoji

  // Blocked app name badge
  showBlockedAppName: true,
  blockedAppFormat: 'Restricted: %s',
  badgeTextColor: '#F87171',
  badgeTextSize: 13,

  // Primary action button (brings user back to host app)
  showPrimaryButton: true,
  primaryButtonText: 'Return to Focus',
  primaryButtonColor: '#3B82F6',
  primaryButtonTextColor: '#FFFFFF',

  // Secondary action button (takes user to Home Screen)
  showSecondaryButton: true,
  secondaryButtonText: 'Go to Home Screen',
  secondaryButtonTextColor: '#94A3B8',

  // Layout, positioning & styling
  cardAlignment: 'center', // 'center' | 'top' | 'bottom'
  cardMaxWidth: 360,       // in dp
  cardCornerRadius: 28,    // in dp
  cardBackgroundColor: '#0F172A',
  cardBorderColor: '#1E293B',
  cardBorderWidth: 1,
  backgroundColor: '#F2020617', // Semi-transparent dark blur backdrop
});

// Query active config
const currentOverlayConfig: OverlayConfig = FocusControl.getOverlayConfig();

// Reset to default clean aesthetic
FocusControl.resetOverlayConfig();
```

---

### D2. Block-Based Layout Engine (Full Visual Freedom)
When consumers want complete design control (like Opal screens, streak badges, custom action button orders, or custom image assets), use `setOverlayLayout()`:

```typescript
import * as FocusControl from 'expo-focus-control';

FocusControl.setOverlayLayout({
  backgroundColor: '#0D1117',
  paddingTop: 54,
  paddingBottom: 36,
  paddingHorizontal: 24,
  cardMaxWidth: 380,
  blocks: [
    {
      type: 'icon',
      imageUri: 'data:image/png;base64,...', // Or file:/// URI
      iconSize: 48,
      containerSize: 92,
      containerColor: '#3B1824',
      badgeEmoji: '💬',
      badgeSize: 28,
      alignSelf: 'center',
    },
    {
      type: 'text',
      text: 'You’ve hit your limit',
      fontSize: 24,
      fontWeight: 'bold',
      color: '#FFFFFF',
      textAlign: 'center',
      marginTop: 22,
    },
    {
      type: 'text',
      text: "You've used {appName} for 30 of 30 minutes today.",
      fontSize: 14,
      color: '#94A3B8',
      textAlign: 'center',
      marginTop: 8,
    },
    {
      type: 'badge',
      text: '🛡 Study streak protected (+45 XP)',
      backgroundColor: '#1E293B',
      textColor: '#22C55E',
      borderRadius: 16,
      alignSelf: 'center',
      marginTop: 16,
    },
    {
      type: 'spacer',
      flex: 1,
    },
    {
      type: 'button',
      text: 'Close app',
      action: 'close',
      backgroundColor: '#D4FF32',
      textColor: '#000000',
      borderRadius: 28,
      height: 54,
    },
    {
      type: 'button',
      text: '⏱ Emergency use ({durationMinutes} min)',
      action: 'emergency',
      backgroundColor: '#1B222C',
      textColor: '#F1F5F9',
      borderRadius: 28,
      height: 50,
      marginTop: 12,
    },
    {
      type: 'text',
      text: '{remainingPasses} left today',
      fontSize: 12,
      color: '#64748B',
      textAlign: 'center',
      marginTop: 12,
    },
  ],
});

// Revert to setOverlayConfig or defaults:
FocusControl.resetOverlayLayout();
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
Regulate emergency app usage with daily quotas, automatic midnight reset, cooldown periods, and auto re-blocking:

```typescript
// Configure emergency access rules
FocusControl.setEmergencyPassConfig({
  enabled: true,
  durationMinutes: 5,           // Unlocks app for 5 minutes
  dailyLimit: 3,                // Max 3 passes per calendar day
  cooldownMinutes: 10,          // Wait 10 minutes before next emergency unlock
  showButtonOnOverlay: true,    // Shows button on native blocking shield
  buttonText: 'Emergency Access',
  buttonColor: '#334155',
  buttonTextColor: '#F8FAFC',
  showRemainingCount: true,     // Appends "· 2 left" to button
});

// Check live status
const passStatus: EmergencyPassStatus = FocusControl.getEmergencyPassStatus();
console.log(passStatus.remainingPasses); // 2
console.log(passStatus.isPassActive);    // true if currently running
console.log(passStatus.remainingSeconds); // seconds remaining in active pass
console.log(passStatus.isInCooldown);     // boolean

// Programmatic controls:
// Manually activate a pass from React Native:
FocusControl.activateEmergencyPass('com.instagram.android', 5);

// Cancel active pass early (re-arms blocking immediately):
FocusControl.cancelEmergencyPass();

// Reset or grant extra passes:
FocusControl.grantEmergencyPasses(1);
FocusControl.resetEmergencyPasses();
```

---

### F. Timed Focus Sessions (Pomodoro / Deep Focus)
```typescript
// Start a 25-minute Pomodoro session (duration in seconds)
// Automatically starts Foreground Service with status bar countdown notification
const session: FocusSessionStatus = FocusControl.startFocusSession(1500, {
  sessionName: 'Deep Work',
  enableAppBlocking: true, // Auto-links app blocking to this session
});

// Live query
const status: FocusSessionStatus = FocusControl.getFocusSessionStatus();
console.log(status.remainingSeconds); // Seconds remaining
console.log(status.elapsedSeconds);   // Seconds spent
console.log(status.isPaused);         // boolean

// Controls
FocusControl.pauseFocusSession();
FocusControl.resumeFocusSession();
FocusControl.stopFocusSession();      // Completes session and lifts blocking
```

---

### G. Website & Domain Blocking (Local DNS VPN)
```typescript
// 1. Set blocked domains
FocusControl.setBlockedWebsites(['instagram.com', 'tiktok.com', 'reddit.com']);

// 2. Request VPN authorization (triggers Android native system prompt)
const isAuthorized: boolean = FocusControl.requestVpnPermission();

// 3. Start local website blocking
if (isAuthorized) {
  FocusControl.startWebsiteBlocking();
}

// 4. Check status
const vpnStatus: WebsiteBlockingStatus = FocusControl.getWebsiteBlockingStatus();
// vpnStatus.isActive: boolean
// vpnStatus.blockedWebsites: string[]
// vpnStatus.vpnServiceRunning: boolean

// 5. Stop website blocking
FocusControl.stopWebsiteBlocking();
```

---

### H. Screen Time & App Usage Stats
```typescript
// Query preset time ranges ('today' | 'yesterday' | 'week' | 'month')
const todayUsage: UsageQueryResult = await FocusControl.getDailyUsage('today', {
  excludeSelf: true,
  sortByUsage: true,
  limit: 10,
});

todayUsage.records.forEach((record) => {
  const minutes = Math.round(record.totalTimeInForeground / 60000);
  console.log(`${record.appName || record.packageName}: ${minutes} mins`);
});

// Or query custom millisecond timestamps
const customUsage = await FocusControl.getUsageBetween(startTimeMs, endTimeMs, {
  excludeSelf: true,
  sortByUsage: true,
});
```

---

### I. Battery & OEM Diagnostics
```typescript
const diag: BatteryDiagnostics = FocusControl.getBatteryDiagnostics();

console.log(diag.dozeExempt);                 // boolean (true if exempt from Android Doze)
console.log(diag.backgroundRestricted);       // boolean (true if restricted in App Info)
console.log(diag.batterySaverEnabled);        // boolean (true if Low Power Mode active)
console.log(diag.overallBackgroundReadiness); // 'READY' | 'OPTIMIZED' | 'DEGRADED' | 'RESTRICTED'

if (diag.overallBackgroundReadiness === 'RESTRICTED') {
  FocusControl.openBatterySettings();
}
```

---

## 4. Key Architectural Guarantees

1. **Anti-Lockout Protection**: System settings (`com.android.settings`), SystemUI, emergency dialers, the default home launcher, and the host app are hardcoded as exempt. They can never be blocked.
2. **Zero Screen Content Scraping**: `android:canRetrieveWindowContent="false"` is strictly enforced in the accessibility metadata. The module never reads passwords, screen text, or keystrokes.
3. **100% Local DNS Sinkhole**: `FocusVpnService` routes DNS queries to local loopback and sinks blocked domains. Zero network data is logged or uploaded externally.
4. **Xiaomi / OEM Overlay Bypass**: Uses `WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY` when the accessibility service is running, which bypasses OEM background popup restrictions (such as HyperOS/MIUI "Display pop-up windows in background").

