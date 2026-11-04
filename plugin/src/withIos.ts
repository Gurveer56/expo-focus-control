import { ConfigPlugin, withInfoPlist, withEntitlementsPlist } from 'expo/config-plugins';
import type { IosConfig as FocusIosConfig } from './index';

/**
 * Applies iOS configuration for Screen Time frameworks.
 *
 * NOTE: Full Screen Time integration requires:
 * 1. Family Controls entitlement (approved by Apple)
 * 2. App extension targets (DeviceActivityMonitor, ShieldConfiguration, etc.)
 * 3. These extensions cannot be configured through config plugins alone
 *    and require manual Xcode project configuration.
 *
 * This plugin sets up the entitlements and Info.plist entries that CAN be
 * configured automatically. The extension targets must be added manually.
 */
export const withIos: ConfigPlugin<Required<FocusIosConfig>> = (config, iosConfig) => {
  // Add entitlements for Family Controls if enabled
  if (iosConfig.familyControls) {
    config = withEntitlementsPlist(config, (config) => {
      config.modResults['com.apple.developer.family-controls.application'] = true;
      return config;
    });

    config = withInfoPlist(config, (config) => {
      // Add usage description for Family Controls
      if (!config.modResults.NSFamilyControlsUsageDescription) {
        config.modResults.NSFamilyControlsUsageDescription =
          'This app uses Screen Time to help you manage app usage and focus sessions.';
      }
      return config;
    });
  }

  return config;
};
