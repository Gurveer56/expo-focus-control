import {
  ConfigPlugin,
  AndroidConfig,
  withAndroidManifest,
} from 'expo/config-plugins';
import type { AndroidConfig as FocusAndroidConfig } from './index';

type ManifestApplication = AndroidConfig.Manifest.ManifestApplication;

export type ValidatedAndroidConfig = Required<Omit<FocusAndroidConfig, 'packageVisibility'>> & {
  packageVisibility: { mode: 'all' | 'selected'; packages: string[] };
};

/**
 * Pure function that modifies an AndroidManifest object in-place according to the
 * validated configuration. Exported for direct unit testing without Expo file I/O.
 */
export function modifyAndroidManifest(
  manifest: AndroidConfig.Manifest.AndroidManifest,
  androidConfig: ValidatedAndroidConfig
): AndroidConfig.Manifest.AndroidManifest {
  if (!manifest.manifest) {
    throw new Error('[expo-focus-control] AndroidManifest.xml is missing <manifest> element');
  }

  // Ensure arrays exist
  if (!manifest.manifest['uses-permission']) {
    manifest.manifest['uses-permission'] = [];
  }
  if (!manifest.manifest.application) {
    manifest.manifest.application = [];
  }

  const permissions = manifest.manifest['uses-permission'];
  const application = manifest.manifest.application[0] as ManifestApplication | undefined;

  if (!application) {
    throw new Error('[expo-focus-control] AndroidManifest.xml is missing <application> element');
  }

  if (!application.service) {
    application.service = [];
  }
  if (!application.receiver) {
    application.receiver = [];
  }

  // Helper to add a permission only if not already present
  const addPermission = (name: string) => {
    const exists = permissions.some(
      (p: any) => p.$?.['android:name'] === name
    );
    if (!exists) {
      permissions.push({ $: { 'android:name': name } } as any);
    }
  };

  // Helper to remove permissions added by this plugin
  const removePermission = (name: string) => {
    const index = permissions.findIndex(
      (p: any) => p.$?.['android:name'] === name
    );
    if (index !== -1) {
      permissions.splice(index, 1);
    }
  };

  // ── Usage Stats ─────────────────────────────────────────────────────
  if (androidConfig.usageStats) {
    addPermission('android.permission.PACKAGE_USAGE_STATS');
  } else {
    removePermission('android.permission.PACKAGE_USAGE_STATS');
  }

  // ── Overlay ─────────────────────────────────────────────────────────
  if (androidConfig.overlay) {
    addPermission('android.permission.SYSTEM_ALERT_WINDOW');
  } else {
    removePermission('android.permission.SYSTEM_ALERT_WINDOW');
  }

  // Ensure POST_NOTIFICATIONS is NEVER injected by this module
  removePermission('android.permission.POST_NOTIFICATIONS');

  // ── Foreground Service ──────────────────────────────────────────────
  if (androidConfig.focusForegroundService) {
    addPermission('android.permission.FOREGROUND_SERVICE');
    addPermission('android.permission.FOREGROUND_SERVICE_SPECIAL_USE');
  } else {
    removePermission('android.permission.FOREGROUND_SERVICE');
    removePermission('android.permission.FOREGROUND_SERVICE_SPECIAL_USE');
  }

  // ── Boot Receiver ───────────────────────────────────────────────────
  if (androidConfig.bootReceiver) {
    addPermission('android.permission.RECEIVE_BOOT_COMPLETED');
  } else {
    removePermission('android.permission.RECEIVE_BOOT_COMPLETED');
  }

  // ── Exact Alarms ────────────────────────────────────────────────────
  if (androidConfig.exactAlarms) {
    addPermission('android.permission.SCHEDULE_EXACT_ALARM');
  } else {
    removePermission('android.permission.SCHEDULE_EXACT_ALARM');
  }

  // ── Battery Optimization ────────────────────────────────────────────
  if (androidConfig.batteryOptimizationExemption) {
    addPermission('android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS');
  } else {
    removePermission('android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS');
  }

  // ── Accessibility Service ───────────────────────────────────────────
  const accessibilityServiceName = 'expo.modules.focuscontrol.FocusAccessibilityService';
  const existingAccessibilityService = application.service!.findIndex(
    (s: any) => s.$?.['android:name'] === accessibilityServiceName
  );

  if (androidConfig.accessibilityBlocking) {
    if (existingAccessibilityService === -1) {
      application.service!.push({
        $: {
          'android:name': accessibilityServiceName,
          'android:exported': 'true' as any,
          'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } },
            ],
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
  } else if (existingAccessibilityService !== -1) {
    application.service!.splice(existingAccessibilityService, 1);
  }

  // ── VPN Service ─────────────────────────────────────────────────────
  const vpnServiceName = 'expo.modules.focuscontrol.FocusVpnService';
  const existingVpnService = application.service!.findIndex(
    (s: any) => s.$?.['android:name'] === vpnServiceName
  );

  if (androidConfig.websiteBlocking) {
    if (existingVpnService === -1) {
      application.service!.push({
        $: {
          'android:name': vpnServiceName,
          'android:exported': 'true' as any,
          'android:permission': 'android.permission.BIND_VPN_SERVICE',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.net.VpnService' } },
            ],
          },
        ],
      } as any);
    }
  } else if (existingVpnService !== -1) {
    application.service!.splice(existingVpnService, 1);
  }

  // ── Focus Session Service ───────────────────────────────────────────
  const sessionServiceName = 'expo.modules.focuscontrol.FocusSessionService';
  const existingSessionService = application.service!.findIndex(
    (s: any) => s.$?.['android:name'] === sessionServiceName
  );

  if (androidConfig.focusForegroundService) {
    if (existingSessionService === -1) {
      application.service!.push({
        $: {
          'android:name': sessionServiceName,
          'android:exported': 'false' as any,
          'android:foregroundServiceType': 'specialUse',
        },
        property: [
          {
            $: {
              'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
              'android:value': 'Focus session countdown timer and application usage monitoring',
            },
          },
        ],
      } as any);
    }
  } else if (existingSessionService !== -1) {
    application.service!.splice(existingSessionService, 1);
  }

  // ── Overlay Service ─────────────────────────────────────────────────
  const overlayServiceName = 'expo.modules.focuscontrol.FocusOverlayService';
  const existingOverlayService = application.service!.findIndex(
    (s: any) => s.$?.['android:name'] === overlayServiceName
  );

  if (androidConfig.overlay) {
    if (existingOverlayService === -1) {
      application.service!.push({
        $: {
          'android:name': overlayServiceName,
          'android:exported': 'false' as any,
        },
      } as any);
    }
  } else if (existingOverlayService !== -1) {
    application.service!.splice(existingOverlayService, 1);
  }

  // ── Boot Receiver ───────────────────────────────────────────────────
  const bootReceiverName = 'expo.modules.focuscontrol.FocusBootReceiver';
  const existingBootReceiver = application.receiver!.findIndex(
    (r: any) => r.$?.['android:name'] === bootReceiverName
  );

  if (androidConfig.bootReceiver) {
    if (existingBootReceiver === -1) {
      application.receiver!.push({
        $: {
          'android:name': bootReceiverName,
          'android:exported': 'false' as any,
          'android:enabled': 'true' as any,
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
            ],
          },
        ],
      } as any);
    }
  } else if (existingBootReceiver !== -1) {
    application.receiver!.splice(existingBootReceiver, 1);
  }

  // ── Package Visibility (queries element) ────────────────────────────
  if (androidConfig.packageVisibility.mode === 'all') {
    addPermission('android.permission.QUERY_ALL_PACKAGES');
  } else {
    removePermission('android.permission.QUERY_ALL_PACKAGES');

    if (androidConfig.packageVisibility.packages.length > 0) {
      if (!manifest.manifest.queries) {
        manifest.manifest.queries = [] as any;
      }
      const queries = manifest.manifest.queries as any[];
      for (const pkg of androidConfig.packageVisibility.packages) {
        const exists = queries.some(
          (q: any) => q.package?.some((p: any) => p.$?.['android:name'] === pkg)
        );
        if (!exists) {
          if (queries.length === 0) {
            queries.push({ package: [] });
          }
          queries[0].package = queries[0].package || [];
          queries[0].package.push({ $: { 'android:name': pkg } });
        }
      }
    }
  }

  return manifest;
}

/**
 * Applies Android manifest modifications based on enabled features.
 * Each feature conditionally adds only its required permissions and services.
 * Disabled features do not add any declarations.
 */
export const withAndroid: ConfigPlugin<ValidatedAndroidConfig> = (config, androidConfig) => {
  return withAndroidManifest(config, (config) => {
    config.modResults = modifyAndroidManifest(config.modResults, androidConfig);
    return config;
  });
};
