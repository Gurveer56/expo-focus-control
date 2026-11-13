import { NativeModule, requireNativeModule } from 'expo';

import {
  AppBlockingStatus,
  BatteryDiagnostics,
  EmergencyPassActivationResult,
  EmergencyPassConfig,
  EmergencyPassStatus,
  ExpoFocusControlModuleEvents,
  FocusSessionStatus,
  OverlayConfig,
  WebsiteBlockingStatus,
} from './ExpoFocusControl.types';

declare class ExpoFocusControlModule extends NativeModule<ExpoFocusControlModuleEvents> {
  // Permission methods
  getPermissionStatuses(): Record<string, any>;
  getUsageAccessStatus(): string;
  openUsageAccessSettings(): void;
  getAccessibilityStatus(): string;
  openAccessibilitySettings(): void;
  getOverlayPermissionStatus(): string;
  openOverlaySettings(): void;
  getBatteryOptimizationStatus(): string;
  getBatteryDiagnostics(): BatteryDiagnostics;
  openBatterySettings(): void;
  openOemBatterySettings(): void;
  getExactAlarmStatus(): string;
  openExactAlarmSettings(): void;
  getVpnStatus(): string;
  requestVpnPermission(): boolean;

  // App Blocking APIs
  setBlockedApplications(packages: string[]): void;
  startAppBlocking(): void;
  stopAppBlocking(): void;
  getAppBlockingStatus(): AppBlockingStatus;
  getInstalledApplications(includeSystemApps: boolean): Promise<Record<string, any>[]>;
  setOverlayConfig(config: OverlayConfig): void;
  getOverlayConfig(): OverlayConfig;
  resetOverlayConfig(): void;
  setOverlayLayout(layoutJson: string): void;
  getOverlayLayout(): string | null;
  resetOverlayLayout(): void;

  // Emergency Pass APIs
  setEmergencyPassConfig(config: EmergencyPassConfig): void;
  getEmergencyPassConfig(): EmergencyPassConfig;
  resetEmergencyPassConfig(): void;
  getEmergencyPassStatus(packageName?: string): EmergencyPassStatus;
  activateEmergencyPass(packageName?: string, customMinutes?: number): EmergencyPassActivationResult;
  cancelEmergencyPass(): void;
  resetEmergencyPasses(): void;
  grantEmergencyPasses(count: number): void;

  // Focus Session APIs
  startFocusSession(durationSeconds: number, sessionName?: string, enableAppBlocking?: boolean): FocusSessionStatus;
  stopFocusSession(): FocusSessionStatus;
  pauseFocusSession(): FocusSessionStatus;
  resumeFocusSession(): FocusSessionStatus;
  getFocusSessionStatus(): FocusSessionStatus;

  // Website Blocking APIs
  setBlockedWebsites(domains: string[]): void;
  getBlockedWebsites(): string[];
  startWebsiteBlocking(): boolean;
  stopWebsiteBlocking(): void;
  getWebsiteBlockingStatus(): WebsiteBlockingStatus;

  // Usage stats methods
  queryUsageStats(startTime: number, endTime: number, excludeSelf: boolean, limit: number, sortByUsage: boolean): Promise<Record<string, any>>;

  // Platform info
  getPlatformInfo(): Record<string, any>;
}

export default requireNativeModule<ExpoFocusControlModule>('ExpoFocusControl');
