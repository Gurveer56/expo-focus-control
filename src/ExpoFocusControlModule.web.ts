import { registerWebModule, NativeModule } from 'expo';

import { ExpoFocusControlModuleEvents } from './ExpoFocusControl.types';

class ExpoFocusControlModule extends NativeModule<ExpoFocusControlModuleEvents> {
  getPermissionStatuses() {
    return {
      usageAccess: 'unavailable',
      accessibilityService: 'unavailable',
      overlayPermission: 'unavailable',
      notificationPermission: 'unavailable',
      vpnPermission: 'unavailable',
      batteryOptimization: 'unavailable',
      exactAlarm: 'unavailable',
    };
  }
  getUsageAccessStatus() { return 'unavailable'; }
  openUsageAccessSettings() {}
  getAccessibilityStatus() { return 'unavailable'; }
  openAccessibilitySettings() {}
  getOverlayPermissionStatus() { return 'unavailable'; }
  openOverlaySettings() {}
  getNotificationPermissionStatus() { return 'unavailable'; }
  openNotificationSettings() {}
  getBatteryOptimizationStatus() { return 'unavailable'; }
  openBatterySettings() {}
  getExactAlarmStatus() { return 'unavailable'; }
  openExactAlarmSettings() {}
  getVpnStatus() { return 'unavailable'; }
  async queryUsageStats() {
    return { records: [], startTime: 0, endTime: 0 };
  }
  getPlatformInfo() {
    return { platform: 'web', sdkVersion: 0 };
  }
}

export default registerWebModule(ExpoFocusControlModule, 'ExpoFocusControl');
