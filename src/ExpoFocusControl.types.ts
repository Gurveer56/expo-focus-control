/**
 * Standard permission status values returned by the native module.
 * - 'granted': Permission is active and usable.
 * - 'denied': Permission was explicitly denied or is not yet requested.
 * - 'unavailable': The feature is not available on this device/OS version.
 * - 'restricted': System policy prevents granting (iOS Screen Time / Android Restricted Settings).
 */
export type PermissionStatus = 'granted' | 'denied' | 'unavailable' | 'restricted';

/**
 * Detailed accessibility service lifecycle states:
 * - 'NOT_DECLARED': Service is not registered in AndroidManifest.xml.
 * - 'DISABLED': Declared in manifest, but toggle is OFF in Accessibility Settings.
 * - 'ENABLED': Toggled ON in settings, but not actively connected or bound.
 * - 'CONNECTED': Actively bound and onServiceConnected() has fired.
 * - 'UNAVAILABLE': System error or unsupported platform.
 */
export type AccessibilityStatus =
  | 'NOT_DECLARED'
  | 'DISABLED'
  | 'ENABLED'
  | 'CONNECTED'
  | 'UNAVAILABLE';

/**
 * Android battery and background execution diagnostics.
 */
export interface BatteryDiagnostics {
  /** Whether the app is on the Doze battery optimization whitelist */
  dozeExempt: boolean;
  /** Whether the user placed the app in background restricted mode (Android 9+) */
  backgroundRestricted: boolean;
  /** Whether system Battery Saver is currently active */
  batterySaverEnabled: boolean;
  /** OEM custom battery manager status (e.g. MIUI Autostart). 'UNKNOWN' when unreadable */
  oemBatteryManagement: string;
  /** Overall readiness score: 'READY', 'OPTIMIZED', 'DEGRADED', or 'RESTRICTED' */
  overallBackgroundReadiness: 'READY' | 'OPTIMIZED' | 'DEGRADED' | 'RESTRICTED';
}

/**
 * Map of all permission statuses the module reports.
 * Note: Notification permissions are handled independently by expo-notifications.
 */
export interface PermissionStatuses {
  usageAccess: PermissionStatus;
  accessibilityService: AccessibilityStatus;
  overlayPermission: PermissionStatus;
  vpnPermission: PermissionStatus;
  batteryOptimization: PermissionStatus;
  exactAlarm: PermissionStatus;
  batteryDiagnostics?: BatteryDiagnostics;
}

/**
 * Application blocking status.
 */
export interface AppBlockingStatus {
  /** Whether application blocking is currently active in the background */
  isBlockingActive: boolean;
  /** List of package names configured to be blocked */
  blockedApplications: string[];
  /** Whether the blocking overlay view is currently visible */
  overlayShowing: boolean;
}

/**
 * Options for configuring and starting a timed focus session.
 */
export interface FocusSessionOptions {
  /** Display label for the session (e.g. "Deep Work"). Default: "Focus Session" */
  sessionName?: string;
  /** Whether to automatically activate application blocking during this session. Default: true */
  enableAppBlocking?: boolean;
}

/**
 * Live status of the ongoing or last focus session.
 */
export interface FocusSessionStatus {
  /** Whether a focus session is currently running in the background */
  isActive: boolean;
  /** Whether the session countdown is currently paused */
  isPaused: boolean;
  /** Display label of the focus session */
  sessionName: string;
  /** Target duration in seconds (0 for untimed) */
  durationSeconds: number;
  /** Remaining countdown seconds */
  remainingSeconds: number;
  /** Elapsed seconds in focus */
  elapsedSeconds: number;
  /** Whether application blocking is linked to this session */
  autoAppBlocking: boolean;
}

/**
 * Live status of website and domain blocking via local VPN.
 */
export interface WebsiteBlockingStatus {
  /** Whether website blocking is currently active */
  isActive: boolean;
  /** Configured list of blocked domains */
  blockedWebsites: string[];
  /** Whether the underlying local VpnService is running */
  vpnServiceRunning: boolean;
}

/**
 * Information about an installed application on the device.
 */
export interface InstalledApp {
  /** Android application package name (e.g. 'com.instagram.android') */
  packageName: string;
  /** Human-readable application label (e.g. 'Instagram') */
  appName: string;
  /** Whether the package is pre-installed as an Android system app */
  isSystemApp: boolean;
}

export interface InstalledAppsOptions {
  /** Whether to include pre-installed system applications. Defaults to false. */
  includeSystemApps?: boolean;
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
  status: PermissionStatus | AccessibilityStatus;
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
