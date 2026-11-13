import ExpoFocusControlModule from './ExpoFocusControlModule';

export * from './ExpoFocusControl.types';

import type {
  AccessibilityStatus,
  AppBlockingStatus,
  BatteryDiagnostics,
  FocusSessionOptions,
  FocusSessionStatus,
  InstalledApp,
  InstalledAppsOptions,
  PermissionStatus,
  PermissionStatuses,
  UsageQueryOptions,
  UsageQueryResult,
  AppUsageRecord,
  UsageTimeRange,
  WebsiteBlockingStatus,
} from './ExpoFocusControl.types';

// Re-export the raw module for advanced use / event subscriptions
export { default as ExpoFocusControlModule } from './ExpoFocusControlModule';

// ── Permission API ──────────────────────────────────────────────────────

/**
 * Get all permission statuses and battery diagnostics at once.
 */
export function getPermissionStatuses(): PermissionStatuses {
  const raw = ExpoFocusControlModule.getPermissionStatuses();
  return {
    usageAccess: raw.usageAccess as PermissionStatus,
    accessibilityService: raw.accessibilityService as AccessibilityStatus,
    overlayPermission: raw.overlayPermission as PermissionStatus,
    vpnPermission: raw.vpnPermission as PermissionStatus,
    batteryOptimization: raw.batteryOptimization as PermissionStatus,
    exactAlarm: raw.exactAlarm as PermissionStatus,
    batteryDiagnostics: raw.batteryDiagnostics as BatteryDiagnostics | undefined,
  };
}

export function getUsageAccessStatus(): PermissionStatus {
  return ExpoFocusControlModule.getUsageAccessStatus() as PermissionStatus;
}

export function openUsageAccessSettings(): void {
  ExpoFocusControlModule.openUsageAccessSettings();
}

export function getAccessibilityStatus(): AccessibilityStatus {
  return ExpoFocusControlModule.getAccessibilityStatus() as AccessibilityStatus;
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

export function getBatteryOptimizationStatus(): PermissionStatus {
  return ExpoFocusControlModule.getBatteryOptimizationStatus() as PermissionStatus;
}

/**
 * Get granular background and battery diagnostics:
 * dozeExempt, backgroundRestricted, batterySaverEnabled, oemBatteryManagement, overallBackgroundReadiness.
 */
export function getBatteryDiagnostics(): BatteryDiagnostics {
  return ExpoFocusControlModule.getBatteryDiagnostics();
}

/**
 * Opens App Info / App Battery settings screen (ACTION_APPLICATION_DETAILS_SETTINGS).
 */
export function openBatterySettings(): void {
  ExpoFocusControlModule.openBatterySettings();
}

/**
 * Attempts to open manufacturer-specific autostart/battery management (Xiaomi, Huawei, Oppo, etc.)
 * Safely falls back to App Info if the OEM intent is not supported.
 */
export function openOemBatterySettings(): void {
  ExpoFocusControlModule.openOemBatterySettings();
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

/**
 * Triggers the Android system VPN confirmation dialog if permission has not yet been granted.
 * Returns true if VPN is already authorized, false if the system prompt was opened.
 */
export function requestVpnPermission(): boolean {
  return ExpoFocusControlModule.requestVpnPermission();
}

// ── Phase 2: App Blocking API ───────────────────────────────────────────

/**
 * Configure the list of application package names to block during active focus sessions.
 */
export function setBlockedApplications(packageNames: string[]): void {
  ExpoFocusControlModule.setBlockedApplications(packageNames);
}

/**
 * Activate application blocking. While active, AccessibilityService intercepts
 * foreground events for blocked packages and displays the native WindowManager overlay.
 */
export function startAppBlocking(): void {
  ExpoFocusControlModule.startAppBlocking();
}

/**
 * Deactivate application blocking and immediately dismiss any visible blocking overlay.
 */
export function stopAppBlocking(): void {
  ExpoFocusControlModule.stopAppBlocking();
}

/**
 * Retrieve current application blocking and overlay visibility status.
 */
export function getAppBlockingStatus(): AppBlockingStatus {
  return ExpoFocusControlModule.getAppBlockingStatus();
}

/**
 * Retrieve the list of launchable applications installed on the device.
 * Useful for building application pickers and selection lists for blocking.
 *
 * @param options.includeSystemApps Whether to include pre-installed system applications. Default false.
 */
export async function getInstalledApplications(
  options?: InstalledAppsOptions
): Promise<InstalledApp[]> {
  const raw = await ExpoFocusControlModule.getInstalledApplications(
    options?.includeSystemApps ?? false
  );
  return (raw ?? []) as InstalledApp[];
}

// ── Phase 3: Focus Session API ──────────────────────────────────────────

/**
 * Start a timed focus session in the background.
 * Automatically spawns an ongoing Android Foreground Service with a sticky
 * countdown notification in the status bar.
 *
 * @param durationSeconds Total session duration in seconds (e.g. 1500 for 25m Pomodoro).
 * @param options Optional session name and whether to link app blocking.
 */
export function startFocusSession(
  durationSeconds: number,
  options?: FocusSessionOptions
): FocusSessionStatus {
  return ExpoFocusControlModule.startFocusSession(
    durationSeconds,
    options?.sessionName,
    options?.enableAppBlocking ?? true
  );
}

/**
 * Stop and complete the active focus session, cancelling the countdown
 * and dismissing the status bar notification.
 */
export function stopFocusSession(): FocusSessionStatus {
  return ExpoFocusControlModule.stopFocusSession();
}

/**
 * Pause the active focus session countdown.
 */
export function pauseFocusSession(): FocusSessionStatus {
  return ExpoFocusControlModule.pauseFocusSession();
}

/**
 * Resume a paused focus session countdown.
 */
export function resumeFocusSession(): FocusSessionStatus {
  return ExpoFocusControlModule.resumeFocusSession();
}

/**
 * Retrieve live status of the active or last focus session.
 */
export function getFocusSessionStatus(): FocusSessionStatus {
  return ExpoFocusControlModule.getFocusSessionStatus();
}

// ── Phase 3: Website & Domain Blocking API ──────────────────────────────

/**
 * Configure the list of website domain names to block (e.g. ['instagram.com', 'reddit.com']).
 */
export function setBlockedWebsites(domains: string[]): void {
  ExpoFocusControlModule.setBlockedWebsites(domains);
}

/**
 * Get the currently configured list of blocked website domains.
 */
export function getBlockedWebsites(): string[] {
  return ExpoFocusControlModule.getBlockedWebsites();
}

/**
 * Start website blocking via a local DNS sinkhole VPN service.
 * Returns true if successfully started, false if VPN permission dialog needs to be accepted.
 */
export function startWebsiteBlocking(): boolean {
  return ExpoFocusControlModule.startWebsiteBlocking();
}

/**
 * Stop the local DNS sinkhole VPN service and restore normal device DNS.
 */
export function stopWebsiteBlocking(): void {
  ExpoFocusControlModule.stopWebsiteBlocking();
}

/**
 * Retrieve live status of the website blocking VPN engine.
 */
export function getWebsiteBlockingStatus(): WebsiteBlockingStatus {
  return ExpoFocusControlModule.getWebsiteBlockingStatus();
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
