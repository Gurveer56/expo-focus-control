import { NativeModule, requireNativeModule } from 'expo';

import { ExpoFocusControlModuleEvents } from './ExpoFocusControl.types';

declare class ExpoFocusControlModule extends NativeModule<ExpoFocusControlModuleEvents> {
  // Permission methods
  getPermissionStatuses(): Record<string, string>;
  getUsageAccessStatus(): string;
  openUsageAccessSettings(): void;
  getAccessibilityStatus(): string;
  openAccessibilitySettings(): void;
  getOverlayPermissionStatus(): string;
  openOverlaySettings(): void;
  getNotificationPermissionStatus(): string;
  openNotificationSettings(): void;
  getBatteryOptimizationStatus(): string;
  openBatterySettings(): void;
  getExactAlarmStatus(): string;
  openExactAlarmSettings(): void;
  getVpnStatus(): string;

  // Usage stats methods
  queryUsageStats(startTime: number, endTime: number, excludeSelf: boolean, limit: number, sortByUsage: boolean): Promise<Record<string, any>>;

  // Platform info
  getPlatformInfo(): Record<string, any>;
}

export default requireNativeModule<ExpoFocusControlModule>('ExpoFocusControl');
