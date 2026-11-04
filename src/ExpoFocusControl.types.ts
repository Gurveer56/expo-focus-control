/**
 * Permission status values returned by the native module.
 * - 'granted': Permission is active and usable.
 * - 'denied': Permission was explicitly denied or is not yet requested.
 * - 'unavailable': The feature is not available on this device/OS version.
 * - 'restricted': System policy prevents granting (iOS).
 */
export type PermissionStatus = 'granted' | 'denied' | 'unavailable' | 'restricted';

/**
 * Map of all permission statuses the module can report.
 */
export interface PermissionStatuses {
  usageAccess: PermissionStatus;
  accessibilityService: PermissionStatus;
  overlayPermission: PermissionStatus;
  notificationPermission: PermissionStatus;
  vpnPermission: PermissionStatus;
  batteryOptimization: PermissionStatus;
  exactAlarm: PermissionStatus;
}

/**
 * A single app's usage record for a given time period.
 */
export interface AppUsageRecord {
  /** Android package name (e.g. "com.example.app") */
  packageName: string;
  /** Total foreground time in milliseconds */
  totalTimeInForeground: number;
  /** Last time the app was used, as Unix timestamp in milliseconds */
  lastTimeUsed: number;
  /** App label / display name (may be empty if unavailable) */
  appName: string;
}

/**
 * Options for querying usage data.
 */
export interface UsageQueryOptions {
  /** Start time as Unix timestamp in milliseconds */
  startTime: number;
  /** End time as Unix timestamp in milliseconds */
  endTime: number;
  /** Whether to exclude the current app from results. Default: false */
  excludeSelf?: boolean;
  /** Maximum number of results to return. Default: no limit */
  limit?: number;
  /** Sort by foreground time descending. Default: true */
  sortByUsage?: boolean;
}

/**
 * Result from a usage data query.
 */
export interface UsageQueryResult {
  /** The usage records matching the query */
  records: AppUsageRecord[];
  /** Start of the queried time range (ms) */
  startTime: number;
  /** End of the queried time range (ms) */
  endTime: number;
}

/**
 * Predefined time range presets for convenience methods.
 */
export type UsageTimeRange = 'today' | 'yesterday' | 'week' | 'month';

/**
 * Events emitted by the native module.
 */
export type ExpoFocusControlModuleEvents = {
  onPermissionChanged: (params: PermissionChangeEvent) => void;
  onUsageUpdated: (params: UsageUpdateEvent) => void;
  onBlockedAppDetected: (params: BlockedAppEvent) => void;
  onFocusSessionStarted: (params: FocusSessionEvent) => void;
  onFocusSessionCompleted: (params: FocusSessionEvent) => void;
  onProtectionStatusChanged: (params: ProtectionStatusEvent) => void;
  onVpnStatusChanged: (params: VpnStatusEvent) => void;
};

export interface PermissionChangeEvent {
  permission: keyof PermissionStatuses;
  status: PermissionStatus;
}

export interface UsageUpdateEvent {
  records: AppUsageRecord[];
}

export interface BlockedAppEvent {
  packageName: string;
  timestamp: number;
}

export interface FocusSessionEvent {
  sessionId: string;
  startTime: number;
  endTime?: number;
  durationMs: number;
}

export interface ProtectionStatusEvent {
  enabled: boolean;
}

export interface VpnStatusEvent {
  connected: boolean;
}
