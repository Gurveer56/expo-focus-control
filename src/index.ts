import ExpoFocusControlModule from './ExpoFocusControlModule';

export * from './ExpoFocusControl.types';

import type {
  PermissionStatus,
  PermissionStatuses,
  UsageQueryOptions,
  UsageQueryResult,
  AppUsageRecord,
  UsageTimeRange,
} from './ExpoFocusControl.types';

// Re-export the raw module for advanced use / event subscriptions
export { default as ExpoFocusControlModule } from './ExpoFocusControlModule';

// ── Permission API ──────────────────────────────────────────────────────

/**
 * Get all permission statuses at once.
 */
export function getPermissionStatuses(): PermissionStatuses {
  const raw = ExpoFocusControlModule.getPermissionStatuses();
  return {
    usageAccess: raw.usageAccess as PermissionStatus,
    accessibilityService: raw.accessibilityService as PermissionStatus,
    overlayPermission: raw.overlayPermission as PermissionStatus,
    notificationPermission: raw.notificationPermission as PermissionStatus,
    vpnPermission: raw.vpnPermission as PermissionStatus,
    batteryOptimization: raw.batteryOptimization as PermissionStatus,
    exactAlarm: raw.exactAlarm as PermissionStatus,
  };
}

export function getUsageAccessStatus(): PermissionStatus {
  return ExpoFocusControlModule.getUsageAccessStatus() as PermissionStatus;
}

export function openUsageAccessSettings(): void {
  ExpoFocusControlModule.openUsageAccessSettings();
}

export function getAccessibilityStatus(): PermissionStatus {
  return ExpoFocusControlModule.getAccessibilityStatus() as PermissionStatus;
}

export function openAccessibilitySettings(): void {
  ExpoFocusControlModule.openAccessibilitySettings();
}

export function getOverlayPermissionStatus(): PermissionStatus {
  return ExpoFocusControlModule.getOverlayPermissionStatus() as PermissionStatus;
}

export function openOverlaySettings(): void {
  ExpoFocusControlModule.openOverlaySettings();
}

export function getNotificationPermissionStatus(): PermissionStatus {
  return ExpoFocusControlModule.getNotificationPermissionStatus() as PermissionStatus;
}

export function openNotificationSettings(): void {
  ExpoFocusControlModule.openNotificationSettings();
}

export function getBatteryOptimizationStatus(): PermissionStatus {
  return ExpoFocusControlModule.getBatteryOptimizationStatus() as PermissionStatus;
}

export function openBatterySettings(): void {
  ExpoFocusControlModule.openBatterySettings();
}

export function getExactAlarmStatus(): PermissionStatus {
  return ExpoFocusControlModule.getExactAlarmStatus() as PermissionStatus;
}

export function openExactAlarmSettings(): void {
  ExpoFocusControlModule.openExactAlarmSettings();
}

export function getVpnStatus(): PermissionStatus {
  return ExpoFocusControlModule.getVpnStatus() as PermissionStatus;
}

// ── Usage Stats API ─────────────────────────────────────────────────────

function getTimeRange(range: UsageTimeRange): { startTime: number; endTime: number } {
  const now = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  switch (range) {
    case 'today':
      return { startTime: startOfToday.getTime(), endTime: now };
    case 'yesterday': {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      return { startTime: startOfYesterday.getTime(), endTime: startOfToday.getTime() };
    }
    case 'week': {
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - 7);
      return { startTime: startOfWeek.getTime(), endTime: now };
    }
    case 'month': {
      const startOfMonth = new Date(startOfToday);
      startOfMonth.setDate(startOfMonth.getDate() - 30);
      return { startTime: startOfMonth.getTime(), endTime: now };
    }
  }
}

/**
 * Query usage stats for a custom time range.
 */
export async function getUsageBetween(
  startTime: number,
  endTime: number,
  options?: Omit<UsageQueryOptions, 'startTime' | 'endTime'>
): Promise<UsageQueryResult> {
  const result = await ExpoFocusControlModule.queryUsageStats(
    startTime,
    endTime,
    options?.excludeSelf ?? false,
    options?.limit ?? 0,
    options?.sortByUsage ?? true
  );
  return {
    records: (result.records ?? []) as AppUsageRecord[],
    startTime: result.startTime as number,
    endTime: result.endTime as number,
  };
}

/**
 * Get daily usage for today, yesterday, or a preset range.
 */
export async function getDailyUsage(
  range: UsageTimeRange = 'today',
  options?: Omit<UsageQueryOptions, 'startTime' | 'endTime'>
): Promise<UsageQueryResult> {
  const { startTime, endTime } = getTimeRange(range);
  return getUsageBetween(startTime, endTime, options);
}

/**
 * Get platform information (OS, SDK version, etc.)
 */
export function getPlatformInfo(): { platform: string; sdkVersion: number } {
  const raw = ExpoFocusControlModule.getPlatformInfo();
  return {
    platform: raw.platform as string,
    sdkVersion: raw.sdkVersion as number,
  };
}
