---
name: expo-config-plugin-development
description: Teaches how to develop, test, and maintain Expo Config Plugins for Android and iOS in expo-focus-control, including conditional permissions, service declarations, XML resources, manifest merging, and idempotent prebuilding.
---

# Expo Config Plugin Development

## Purpose
This skill guides agents in authoring and maintaining the Expo Config Plugin for `expo-focus-control`. The plugin enables consumers to conditionally inject Android permissions, service declarations, receivers, queries, and iOS capabilities during `expo prebuild`.

## When to Use
Use this skill when:
- Adding or modifying configurable feature flags in `app.json`.
- Injecting or removing Android permissions based on user configuration.
- Declaring Android `<service>`, `<receiver>`, or `<property>` tags in `AndroidManifest.xml`.
- Managing XML metadata resources such as `focus_accessibility_service.xml`.
- Ensuring that turning a feature flag to `false` cleanly removes the corresponding native components.
- Debugging prebuild errors or manifest merge conflicts.

## Required Workflow

### 1. Structure of the Plugin
The plugin source is located in `plugin/src/`:
- `index.ts`: The main plugin function wrapped by `createRunOncePlugin`. Validates plugin options.
- `withAndroid.ts`: Modifies Android project files (primarily `AndroidManifest.xml` via `withAndroidManifest`).
- `withIos.ts`: Modifies iOS target entitlements and Info.plist.
- `permissions.ts`: Logic for computing the list of Android permissions to add or remove.
- `services.ts`: Constants and types for Android services.

The plugin entry point for consumers is `app.plugin.js`, which imports `plugin/build/index.js`.

### 2. Modifying the Android Manifest Idempotently

#### A. Fully Qualified Component Names
**CRITICAL**: When adding services, receivers, or providers, never use shorthand relative names (like `.FocusAccessibilityService`). A relative name will cause AAPT2 to prepend the consuming app's package name, leading to `ClassNotFoundException`.
Always use the full package path:
```typescript
const accessibilityServiceName = 'expo.modules.focuscontrol.FocusAccessibilityService';
```

#### B. Conditional Addition and Removal
A config plugin must be **idempotent**. If a consumer enables a flag and then disables it, the native manifest must return to its clean state without leaving orphaned declarations:
```typescript
// Filter out previously injected service instances first
application.service = (application.service || []).filter(
  (s) => s.$['android:name'] !== accessibilityServiceName
);

// Add only if the feature flag is true
if (options.android?.accessibilityBlocking) {
  application.service.push({
    $: {
      'android:name': accessibilityServiceName,
      'android:exported': 'true' as any,
      'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } }],
      },
    ],
    'meta-data': [
      {
        $: {
          'android:name': 'android.accessibilityservice',
          'android:resource': '@xml/focus_accessibility_service',
        },
      },
    ],
  } as any);
}
```

#### C. Android 14+ FGS Subtype Properties
For any foreground service using `specialUse`, Android 14+ strictly requires a `<property>` tag:
```typescript
application.service.push({
  $: {
    'android:name': sessionServiceName,
    'android:exported': 'false' as any,
    'android:foregroundServiceType': 'specialUse',
  },
  'property': [
    {
      $: {
        'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
        'android:value': 'Focus session countdown timer and application usage monitoring',
      },
    },
  ],
} as any);
```

#### D. Package Visibility (`<queries>`)
To query installed applications on Android 11+ (API 30+), avoid broad `QUERY_ALL_PACKAGES` (which violates Google Play policies for wellbeing apps). Instead, support a targeted package list:
```typescript
if (options.android?.packageVisibility?.mode === 'selected') {
  const packages = options.android.packageVisibility.packages || [];
  manifest.queries = manifest.queries || [];
  const existingQueries = manifest.queries[0] || { package: [] };
  existingQueries.package = existingQueries.package || [];
  
  for (const pkg of packages) {
    if (!existingQueries.package.some((p: any) => p.$['android:name'] === pkg)) {
      existingQueries.package.push({ $: { 'android:name': pkg } });
    }
  }
}
```

### 3. Build & Test Cycle

Whenever modifying `plugin/src/`:
1. **Transpile plugin**:
   ```bash
   npm run build plugin
   # or root prepare
   npm run prepare
   ```
2. **Run plugin unit tests**:
   ```bash
   npm test -- plugin/src/__tests__/plugin.test.ts
   ```
3. **Execute clean prebuild in example**:
   ```bash
   cd example
   npx expo prebuild --platform android --clean --no-install
   ```
4. **Verify generated AndroidManifest.xml**:
   Inspect `example/android/app/src/main/AndroidManifest.xml` to verify elements were correctly injected without duplicate entries.
5. **Verify merged manifest via Gradle**:
   ```bash
   cd example/android
   .\gradlew :app:processDebugMainManifest
   ```
   Inspect the final merged manifest in:
   `example/android/app/build/intermediates/merged_manifest/debug/processDebugMainManifest/AndroidManifest.xml`

## Security & Policy Rules
- **Do NOT inject `POST_NOTIFICATIONS`**: Notification permissions belong to application-level features (`expo-notifications`).
- **Do NOT automatically inject `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`** unless explicitly requested by flag.
- Never add `android:exported="true"` to services or receivers unless they are bound by the Android OS framework (e.g., `AccessibilityService` or `VpnService` with their respective binding permissions).

## Common Mistakes
- **Modifying only `plugin/src/` without compiling**: `app.plugin.js` reads from `plugin/build/`. Forgetting `npm run prepare` causes tests and prebuild to run against stale plugin code.
- **Forgetting `tools:replace` when necessary**: If another library declares the same attribute with different parameters, manifest merger will fail unless disambiguated.
- **Duplicate intent filters**: Appending intent filters unconditionally without filtering out existing entries.

## Relevant Files
- `plugin/src/index.ts`
- `plugin/src/withAndroid.ts`
- `plugin/src/permissions.ts`
- `plugin/src/__tests__/plugin.test.ts`
- `app.plugin.js`

