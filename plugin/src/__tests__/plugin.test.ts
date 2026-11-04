import {
  validateConfig,
  ANDROID_DEFAULTS,
  IOS_DEFAULTS,
  FocusControlPluginConfig,
} from '../index';
import { modifyAndroidManifest, ValidatedAndroidConfig } from '../withAndroid';

function createBaseManifest(): any {
  return {
    manifest: {
      $: {
        'xmlns:android': 'http://schemas.android.com/apk/res/android',
        package: 'com.example.testapp',
      },
      'uses-permission': [
        { $: { 'android:name': 'android.permission.INTERNET' } },
      ],
      application: [
        {
          $: {
            'android:name': '.MainApplication',
          },
          service: [
            {
              $: {
                'android:name': '.AppService',
              },
            },
          ],
          receiver: [],
        },
      ],
    },
  };
}

describe('Expo Focus Control - Config Plugin', () => {
  describe('validateConfig', () => {
    it('returns documented defaults when empty configuration is provided', () => {
      const result = validateConfig({});
      expect(result.android).toEqual(ANDROID_DEFAULTS);
      expect(result.ios).toEqual(IOS_DEFAULTS);
      expect(result.android.usageStats).toBe(true);
      expect(result.android.accessibilityBlocking).toBe(false);
      expect(result.android.overlay).toBe(false);
      expect(result.android.websiteBlocking).toBe(false);
      expect(result.android.focusForegroundService).toBe(false);
      expect(result.android.notifications).toBe(false);
      expect(result.android.exactAlarms).toBe(false);
      expect(result.android.bootReceiver).toBe(false);
      expect(result.android.batteryOptimizationExemption).toBe(false);
      expect(result.android.packageVisibility.mode).toBe('selected');
      expect(result.android.packageVisibility.packages).toEqual([]);
    });

    it('throws when an unknown android option is passed', () => {
      expect(() => {
        validateConfig({
          android: {
            unknownOption: true,
          } as any,
        });
      }).toThrow(/Invalid android config key: "unknownOption"/);
    });

    it('throws when an unknown ios option is passed', () => {
      expect(() => {
        validateConfig({
          ios: {
            unknownIosOption: true,
          } as any,
        });
      }).toThrow(/Invalid ios config key: "unknownIosOption"/);
    });

    it('throws when a boolean option receives a non-boolean', () => {
      expect(() => {
        validateConfig({
          android: {
            usageStats: 'yes' as any,
          },
        });
      }).toThrow(/android.usageStats must be a boolean/);

      expect(() => {
        validateConfig({
          android: {
            overlay: 123 as any,
          },
        });
      }).toThrow(/android.overlay must be a boolean/);
    });

    it('validates packageVisibility options', () => {
      expect(() => {
        validateConfig({
          android: {
            packageVisibility: { mode: 'invalid' as any },
          },
        });
      }).toThrow(/packageVisibility.mode must be "all" or "selected"/);

      expect(() => {
        validateConfig({
          android: {
            packageVisibility: { packages: 'com.foo' as any },
          },
        });
      }).toThrow(/packageVisibility.packages must be an array of strings/);

      const valid = validateConfig({
        android: {
          packageVisibility: {
            mode: 'selected',
            packages: ['com.instagram.android', 'com.google.android.youtube'],
          },
        },
      });
      expect(valid.android.packageVisibility.packages).toEqual([
        'com.instagram.android',
        'com.google.android.youtube',
      ]);
    });
  });

  describe('modifyAndroidManifest', () => {
    it('applies default configuration: adds only PACKAGE_USAGE_STATS and preserves app permissions', () => {
      const manifest = createBaseManifest();
      const config: ValidatedAndroidConfig = { ...ANDROID_DEFAULTS };

      const result = modifyAndroidManifest(manifest, config);
      const permissions = result.manifest['uses-permission'].map((p: any) => p.$['android:name']);

      expect(permissions).toContain('android.permission.INTERNET'); // Preserved!
      expect(permissions).toContain('android.permission.PACKAGE_USAGE_STATS');
      expect(permissions).not.toContain('android.permission.SYSTEM_ALERT_WINDOW');
      expect(permissions).not.toContain('android.permission.QUERY_ALL_PACKAGES');

      const services = result.manifest.application[0].service.map((s: any) => s.$['android:name']);
      expect(services).toContain('.AppService'); // Preserved!
      expect(services).not.toContain('.FocusAccessibilityService');
      expect(services).not.toContain('.FocusVpnService');
    });

    it('adds all permissions and services when all features are enabled', () => {
      const manifest = createBaseManifest();
      const config: ValidatedAndroidConfig = {
        usageStats: true,
        accessibilityBlocking: true,
        overlay: true,
        websiteBlocking: true,
        focusForegroundService: true,
        notifications: true,
        exactAlarms: true,
        bootReceiver: true,
        batteryOptimizationExemption: true,
        packageVisibility: {
          mode: 'all',
          packages: [],
        },
      };

      const result = modifyAndroidManifest(manifest, config);
      const permissions = result.manifest['uses-permission'].map((p: any) => p.$['android:name']);

      expect(permissions).toContain('android.permission.PACKAGE_USAGE_STATS');
      expect(permissions).toContain('android.permission.SYSTEM_ALERT_WINDOW');
      expect(permissions).toContain('android.permission.POST_NOTIFICATIONS');
      expect(permissions).toContain('android.permission.FOREGROUND_SERVICE');
      expect(permissions).toContain('android.permission.FOREGROUND_SERVICE_SPECIAL_USE');
      expect(permissions).toContain('android.permission.RECEIVE_BOOT_COMPLETED');
      expect(permissions).toContain('android.permission.SCHEDULE_EXACT_ALARM');
      expect(permissions).toContain('android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS');
      expect(permissions).toContain('android.permission.QUERY_ALL_PACKAGES');

      const app = result.manifest.application[0];
      const services = app.service;

      // Check AccessibilityService declaration
      const accessService = services.find((s: any) => s.$['android:name'] === '.FocusAccessibilityService');
      expect(accessService).toBeDefined();
      expect(accessService.$['android:permission']).toBe('android.permission.BIND_ACCESSIBILITY_SERVICE');
      expect(accessService['intent-filter'][0].action[0].$['android:name']).toBe(
        'android.accessibilityservice.AccessibilityService'
      );
      expect(accessService['meta-data'][0].$['android:resource']).toBe('@xml/focus_accessibility_service');

      // Check VpnService declaration
      const vpnService = services.find((s: any) => s.$['android:name'] === '.FocusVpnService');
      expect(vpnService).toBeDefined();
      expect(vpnService.$['android:permission']).toBe('android.permission.BIND_VPN_SERVICE');
      expect(vpnService['intent-filter'][0].action[0].$['android:name']).toBe('android.net.VpnService');

      // Check FocusSessionService
      const sessionService = services.find((s: any) => s.$['android:name'] === '.FocusSessionService');
      expect(sessionService).toBeDefined();
      expect(sessionService.$['android:foregroundServiceType']).toBe('specialUse');

      // Check OverlayService
      const overlayService = services.find((s: any) => s.$['android:name'] === '.FocusOverlayService');
      expect(overlayService).toBeDefined();

      // Check BootReceiver
      const bootReceiver = app.receiver.find((r: any) => r.$['android:name'] === '.FocusBootReceiver');
      expect(bootReceiver).toBeDefined();
      expect(bootReceiver['intent-filter'][0].action[0].$['android:name']).toBe(
        'android.intent.action.BOOT_COMPLETED'
      );
    });

    it('adds targeted <queries> packages when packageVisibility is "selected"', () => {
      const manifest = createBaseManifest();
      const config: ValidatedAndroidConfig = {
        ...ANDROID_DEFAULTS,
        packageVisibility: {
          mode: 'selected',
          packages: ['com.instagram.android', 'com.tiktok.android'],
        },
      };

      const result = modifyAndroidManifest(manifest, config);
      expect(result.manifest.queries).toBeDefined();
      const queries = result.manifest.queries[0].package.map((p: any) => p.$['android:name']);
      expect(queries).toContain('com.instagram.android');
      expect(queries).toContain('com.tiktok.android');
    });

    it('is idempotent: running repeated times produces no duplicate declarations', () => {
      const manifest = createBaseManifest();
      const config: ValidatedAndroidConfig = {
        ...ANDROID_DEFAULTS,
        usageStats: true,
        overlay: true,
        accessibilityBlocking: true,
      };

      // Run 3 consecutive passes
      let result = modifyAndroidManifest(manifest, config);
      result = modifyAndroidManifest(result, config);
      result = modifyAndroidManifest(result, config);

      const usagePerms = result.manifest['uses-permission'].filter(
        (p: any) => p.$['android:name'] === 'android.permission.PACKAGE_USAGE_STATS'
      );
      expect(usagePerms).toHaveLength(1);

      const overlayPerms = result.manifest['uses-permission'].filter(
        (p: any) => p.$['android:name'] === 'android.permission.SYSTEM_ALERT_WINDOW'
      );
      expect(overlayPerms).toHaveLength(1);

      const accessServices = result.manifest.application[0].service.filter(
        (s: any) => s.$['android:name'] === '.FocusAccessibilityService'
      );
      expect(accessServices).toHaveLength(1);
    });

    it('cleans up previously enabled features when disabled without touching app declarations', () => {
      const manifest = createBaseManifest();

      // Step 1: Enable overlay and accessibility
      let result = modifyAndroidManifest(manifest, {
        ...ANDROID_DEFAULTS,
        overlay: true,
        accessibilityBlocking: true,
      });

      expect(
        result.manifest['uses-permission'].some(
          (p: any) => p.$['android:name'] === 'android.permission.SYSTEM_ALERT_WINDOW'
        )
      ).toBe(true);

      // Step 2: Disable overlay and accessibility
      result = modifyAndroidManifest(result, {
        ...ANDROID_DEFAULTS,
        overlay: false,
        accessibilityBlocking: false,
      });

      expect(
        result.manifest['uses-permission'].some(
          (p: any) => p.$['android:name'] === 'android.permission.SYSTEM_ALERT_WINDOW'
        )
      ).toBe(false);

      expect(
        result.manifest.application[0].service.some(
          (s: any) => s.$['android:name'] === '.FocusAccessibilityService'
        )
      ).toBe(false);

      // Consuming app's service is still there!
      expect(
        result.manifest.application[0].service.some(
          (s: any) => s.$['android:name'] === '.AppService'
        )
      ).toBe(true);
      expect(
        result.manifest['uses-permission'].some(
          (p: any) => p.$['android:name'] === 'android.permission.INTERNET'
        )
      ).toBe(true);
    });
  });
});

