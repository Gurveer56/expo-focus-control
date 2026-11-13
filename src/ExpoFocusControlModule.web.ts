import { registerWebModule, NativeModule } from 'expo';

import { AppBlockingStatus, BatteryDiagnostics, ExpoFocusControlModuleEvents, FocusSessionStatus, WebsiteBlockingStatus } from './ExpoFocusControl.types';

class ExpoFocusControlModule extends NativeModule<ExpoFocusControlModuleEvents> {
  getPermissionStatuses() {
    return {
      usageAccess: 'unavailable',
      accessibilityService: 'UNAVAILABLE',
      overlayPermission: 'unavailable',
      vpnPermission: 'unavailable',
      batteryOptimization: 'unavailable',
      exactAlarm: 'unavailable',
      batteryDiagnostics: {
        dozeExempt: false,
        backgroundRestricted: false,
        batterySaverEnabled: false,
        oemBatteryManagement: 'UNKNOWN',
        overallBackgroundReadiness: 'READY' as const,
      },
    };
  }
  getUsageAccessStatus() { return 'unavailable'; }
  openUsageAccessSettings() {}
  getAccessibilityStatus() { return 'UNAVAILABLE'; }
  openAccessibilitySettings() {}
  getOverlayPermissionStatus() { return 'unavailable'; }
  openOverlaySettings() {}
  getBatteryOptimizationStatus() { return 'unavailable'; }
  getBatteryDiagnostics(): BatteryDiagnostics {
    return {
      dozeExempt: false,
      backgroundRestricted: false,
      batterySaverEnabled: false,
      oemBatteryManagement: 'UNKNOWN',
      overallBackgroundReadiness: 'READY',
    };
  }
  openBatterySettings() {}
  openOemBatterySettings() {}
  getExactAlarmStatus() { return 'unavailable'; }
  openExactAlarmSettings() {}
  getVpnStatus() { return 'unavailable'; }
  requestVpnPermission() { return false; }

  // Phase 2 stubs
  setBlockedApplications(_packages: string[]) {}
  startAppBlocking() {}
  stopAppBlocking() {}
  getAppBlockingStatus(): AppBlockingStatus {
    return {
      isBlockingActive: false,
      blockedApplications: [],
      overlayShowing: false,
    };
  }
  async getInstalledApplications(_includeSystemApps: boolean = false) {
    return [];
  }

  // Phase 3 stubs
  startFocusSession(durationSeconds: number, sessionName?: string, enableAppBlocking?: boolean): FocusSessionStatus {
    return {
      isActive: false,
      isPaused: false,
      sessionName: sessionName ?? 'Focus Session',
      durationSeconds,
      remainingSeconds: durationSeconds,
      elapsedSeconds: 0,
      autoAppBlocking: enableAppBlocking ?? true,
    };
  }
  stopFocusSession(): FocusSessionStatus {
    return {
      isActive: false,
      isPaused: false,
      sessionName: 'Focus Session',
      durationSeconds: 0,
      remainingSeconds: 0,
      elapsedSeconds: 0,
      autoAppBlocking: true,
    };
  }
  pauseFocusSession(): FocusSessionStatus {
    return {
      isActive: false,
      isPaused: false,
      sessionName: 'Focus Session',
      durationSeconds: 0,
      remainingSeconds: 0,
      elapsedSeconds: 0,
      autoAppBlocking: true,
    };
  }
  resumeFocusSession(): FocusSessionStatus {
    return {
      isActive: false,
      isPaused: false,
      sessionName: 'Focus Session',
      durationSeconds: 0,
      remainingSeconds: 0,
      elapsedSeconds: 0,
      autoAppBlocking: true,
    };
  }
  getFocusSessionStatus(): FocusSessionStatus {
    return {
      isActive: false,
      isPaused: false,
      sessionName: 'Focus Session',
      durationSeconds: 0,
      remainingSeconds: 0,
      elapsedSeconds: 0,
      autoAppBlocking: true,
    };
  }

  setBlockedWebsites(_domains: string[]) {}
  getBlockedWebsites(): string[] { return []; }
  startWebsiteBlocking(): boolean { return false; }
  stopWebsiteBlocking() {}
  getWebsiteBlockingStatus(): WebsiteBlockingStatus {
    return {
      isActive: false,
      blockedWebsites: [],
      vpnServiceRunning: false,
    };
  }

  async queryUsageStats() {
    return { records: [], startTime: 0, endTime: 0 };
  }
  getPlatformInfo() {
    return { platform: 'web', sdkVersion: 0 };
  }
}

export default registerWebModule(ExpoFocusControlModule, 'ExpoFocusControl');
