import { ConfigPlugin, createRunOncePlugin } from 'expo/config-plugins';
import { withAndroid } from './withAndroid';
import { withIos } from './withIos';

const pkg = require('../../package.json');

/**
 * Plugin configuration options for expo-focus-control.
 */
export interface FocusControlPluginConfig {
  android?: AndroidConfig;
  ios?: IosConfig;
}

export interface AndroidConfig {
  /** Enable UsageStatsManager access. Default: true */
  usageStats?: boolean;
  /** Enable AccessibilityService for app blocking. Default: false */
  accessibilityBlocking?: boolean;
  /** Enable SYSTEM_ALERT_WINDOW overlay. Default: false */
  overlay?: boolean;
  /** Enable VPN-based website blocking. Default: false */
  websiteBlocking?: boolean;
  /** Enable focus session foreground service. Default: false */
  focusForegroundService?: boolean;
  /** Enable POST_NOTIFICATIONS permission. Default: false */
  notifications?: boolean;
  /** Enable SCHEDULE_EXACT_ALARM permission. Default: false */
  exactAlarms?: boolean;
  /** Enable boot receiver for restoring schedules. Default: false */
  bootReceiver?: boolean;
  /** Request battery optimization exemption. Default: false */
  batteryOptimizationExemption?: boolean;
  /** Package visibility configuration */
  packageVisibility?: PackageVisibilityConfig;
}

export interface PackageVisibilityConfig {
  /** 'all' uses QUERY_ALL_PACKAGES (rarely approved), 'selected' uses <queries>. Default: 'selected' */
  mode?: 'all' | 'selected';
  /** Specific package names to include in <queries>. Only used when mode is 'selected'. */
  packages?: string[];
}

export interface IosConfig {
  /** Enable Family Controls framework. Default: false */
  familyControls?: boolean;
  /** Enable Device Activity monitoring. Default: false */
  deviceActivity?: boolean;
  /** Enable Managed Settings. Default: false */
  managedSettings?: boolean;
}

export const ANDROID_DEFAULTS: Required<Omit<AndroidConfig, 'packageVisibility'>> & { packageVisibility: Required<PackageVisibilityConfig> } = {
  usageStats: true,
  accessibilityBlocking: false,
  overlay: false,
  websiteBlocking: false,
  focusForegroundService: false,
  notifications: false,
  exactAlarms: false,
  bootReceiver: false,
  batteryOptimizationExemption: false,
  packageVisibility: {
    mode: 'selected',
    packages: [],
  },
};

export const IOS_DEFAULTS: Required<IosConfig> = {
  familyControls: false,
  deviceActivity: false,
  managedSettings: false,
};

export function validateConfig(config: FocusControlPluginConfig): {
  android: typeof ANDROID_DEFAULTS;
  ios: typeof IOS_DEFAULTS;
} {
  const android = { ...ANDROID_DEFAULTS };
  const ios = { ...IOS_DEFAULTS };

  if (config.android) {
    const ac = config.android;
    const validAndroidKeys = new Set(Object.keys(ANDROID_DEFAULTS));
    for (const key of Object.keys(ac)) {
      if (!validAndroidKeys.has(key)) {
        throw new Error(
          `[expo-focus-control] Invalid android config key: "${key}". Valid keys: ${[...validAndroidKeys].join(', ')}`
        );
      }
    }

    if (ac.usageStats !== undefined) {
      if (typeof ac.usageStats !== 'boolean') throw new Error('[expo-focus-control] android.usageStats must be a boolean');
      android.usageStats = ac.usageStats;
    }
    if (ac.accessibilityBlocking !== undefined) {
      if (typeof ac.accessibilityBlocking !== 'boolean') throw new Error('[expo-focus-control] android.accessibilityBlocking must be a boolean');
      android.accessibilityBlocking = ac.accessibilityBlocking;
    }
    if (ac.overlay !== undefined) {
      if (typeof ac.overlay !== 'boolean') throw new Error('[expo-focus-control] android.overlay must be a boolean');
      android.overlay = ac.overlay;
    }
    if (ac.websiteBlocking !== undefined) {
      if (typeof ac.websiteBlocking !== 'boolean') throw new Error('[expo-focus-control] android.websiteBlocking must be a boolean');
      android.websiteBlocking = ac.websiteBlocking;
    }
    if (ac.focusForegroundService !== undefined) {
      if (typeof ac.focusForegroundService !== 'boolean') throw new Error('[expo-focus-control] android.focusForegroundService must be a boolean');
      android.focusForegroundService = ac.focusForegroundService;
    }
    if (ac.notifications !== undefined) {
      if (typeof ac.notifications !== 'boolean') throw new Error('[expo-focus-control] android.notifications must be a boolean');
      android.notifications = ac.notifications;
    }
    if (ac.exactAlarms !== undefined) {
      if (typeof ac.exactAlarms !== 'boolean') throw new Error('[expo-focus-control] android.exactAlarms must be a boolean');
      android.exactAlarms = ac.exactAlarms;
    }
    if (ac.bootReceiver !== undefined) {
      if (typeof ac.bootReceiver !== 'boolean') throw new Error('[expo-focus-control] android.bootReceiver must be a boolean');
      android.bootReceiver = ac.bootReceiver;
    }
    if (ac.batteryOptimizationExemption !== undefined) {
      if (typeof ac.batteryOptimizationExemption !== 'boolean') throw new Error('[expo-focus-control] android.batteryOptimizationExemption must be a boolean');
      android.batteryOptimizationExemption = ac.batteryOptimizationExemption;
    }
    if (ac.packageVisibility !== undefined) {
      const pv = ac.packageVisibility;
      if (typeof pv !== 'object' || pv === null) {
        throw new Error('[expo-focus-control] android.packageVisibility must be an object');
      }
      if (pv.mode !== undefined) {
        if (pv.mode !== 'all' && pv.mode !== 'selected') {
          throw new Error('[expo-focus-control] android.packageVisibility.mode must be "all" or "selected"');
        }
        android.packageVisibility.mode = pv.mode;
        if (pv.mode === 'all') {
          console.warn(
            '[expo-focus-control] WARNING: QUERY_ALL_PACKAGES requires Google Play approval. ' +
            'Most apps should use mode "selected" with specific package names.'
          );
        }
      }
      if (pv.packages !== undefined) {
        if (!Array.isArray(pv.packages) || !pv.packages.every((p: unknown) => typeof p === 'string')) {
          throw new Error('[expo-focus-control] android.packageVisibility.packages must be an array of strings');
        }
        android.packageVisibility.packages = pv.packages;
      }
    }
  }

  if (config.ios) {
    const ic = config.ios;
    const validIosKeys = new Set(Object.keys(IOS_DEFAULTS));
    for (const key of Object.keys(ic)) {
      if (!validIosKeys.has(key)) {
        throw new Error(
          `[expo-focus-control] Invalid ios config key: "${key}". Valid keys: ${[...validIosKeys].join(', ')}`
        );
      }
    }

    if (ic.familyControls !== undefined) {
      if (typeof ic.familyControls !== 'boolean') throw new Error('[expo-focus-control] ios.familyControls must be a boolean');
      ios.familyControls = ic.familyControls;
    }
    if (ic.deviceActivity !== undefined) {
      if (typeof ic.deviceActivity !== 'boolean') throw new Error('[expo-focus-control] ios.deviceActivity must be a boolean');
      ios.deviceActivity = ic.deviceActivity;
    }
    if (ic.managedSettings !== undefined) {
      if (typeof ic.managedSettings !== 'boolean') throw new Error('[expo-focus-control] ios.managedSettings must be a boolean');
      ios.managedSettings = ic.managedSettings;
    }
  }

  return { android, ios };
}

const withFocusControl: ConfigPlugin<FocusControlPluginConfig | void> = (config, props = {}) => {
  const validated = validateConfig(props ?? {});

  config = withAndroid(config, validated.android);
  config = withIos(config, validated.ios);

  return config;
};

export default createRunOncePlugin(withFocusControl, pkg.name, pkg.version);
