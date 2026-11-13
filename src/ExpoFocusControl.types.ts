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
 * Visual customization configuration for the native blocking overlay shield.
 */
export interface OverlayConfig {
  /** Headline text displayed on the overlay card. Default: "Focus Mode Active" */
  title?: string;
  /** Primary description/body message. Default: "Stay committed to your focus session..." */
  message?: string;
  /** Emoji icon displayed at the top of the card. Default: "🛡️" */
  iconEmoji?: string;
  /** Optional custom image icon URI (PNG, JPEG, WebP, local file path, or base64 data URI). Overrides emoji and app icon. */
  customIconUri?: string;
  /** Whether to show the real app icon of the blocked application instead of the emoji. Default: true */
  showAppIcon?: boolean;
  /** Whether to show the blocked app name badge. Default: true */
  showBlockedAppName?: boolean;
  /** Template string for the blocked app badge (use {appName} as placeholder). Default: "{appName} is blocked" */
  blockedAppFormat?: string;

  /** Whether to display the primary action button. Default: true */
  showPrimaryButton?: boolean;
  /** Label for the primary button. Default: "Return to Focus" */
  primaryButtonText?: string;
  /** Hex color for primary button background. Default: "#2563EB" */
  primaryButtonColor?: string;
  /** Hex color for primary button text. Default: "#FFFFFF" */
  primaryButtonTextColor?: string;

  /** Whether to display the secondary action button. Default: true */
  showSecondaryButton?: boolean;
  /** Label for secondary button. Default: "Exit to Home Screen" */
  secondaryButtonText?: string;
  /** Hex color for secondary button text. Default: "#94A3B8" */
  secondaryButtonTextColor?: string;

  /** Full-screen background overlay hex color (supports alpha e.g. #EE0F172A). Default: "#EE0F172A" */
  backgroundColor?: string;
  /** Centered card background hex color. Default: "#1E293B" */
  cardBackgroundColor?: string;
  /** Centered card border stroke hex color. Default: "#334155" */
  cardBorderColor?: string;
  /** Centered card border width in dp. Default: 1 */
  cardBorderWidth?: number;
  /** Centered card corner radius in dp. Default: 20 */
  cardCornerRadius?: number;
  /** Centered card max width in dp. Default: 320 */
  cardMaxWidth?: number;

  /** Title text hex color. Default: "#F8FAFC" */
  titleColor?: string;
  /** Title font size in sp. Default: 22 */
  titleSize?: number;
  /** Message text hex color. Default: "#94A3B8" */
  messageColor?: string;
  /** Message font size in sp. Default: 13 */
  messageSize?: number;
  /** Emoji icon size in sp. Default: 44 */
  iconSize?: number;
  /** Blocked app badge text hex color. Default: "#F87171" */
  badgeTextColor?: string;
  /** Blocked app badge font size in sp. Default: 15 */
  badgeTextSize?: number;

  /** Vertical positioning of the card: 'center' | 'top' | 'bottom'. Default: 'center' */
  cardAlignment?: 'center' | 'top' | 'bottom';
}

/**
 * Common layout and spacing properties available on every overlay layout block.
 */
export interface OverlayBaseBlockProps {
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  marginRight?: number;
  marginHorizontal?: number;
  marginVertical?: number;
  margin?: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  padding?: number;
  width?: number;
  height?: number;
  flex?: number;
}

/**
 * Text block for headings, subtitles, descriptions, and dynamic counters.
 * Supports template variables: {appName}, {remainingPasses}, {durationMinutes}.
 */
export interface OverlayTextBlock extends OverlayBaseBlockProps {
  type: 'text';
  text: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

/**
 * Interactive button block triggering close, emergency access, or home actions.
 */
export interface OverlayButtonBlock extends OverlayBaseBlockProps {
  type: 'button';
  text: string;
  action?: 'close' | 'emergency' | 'goHome';
  backgroundColor?: string;
  textColor?: string;
  color?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
}

/**
 * Hero icon block with circular container, image or emoji, and optional badge icon.
 */
export interface OverlayIconBlock extends OverlayBaseBlockProps {
  type: 'icon';
  /** Custom image icon URI (file://, content://, base64 data URI). Overrides emoji */
  imageUri?: string;
  /** Fallback emoji icon. Default: "⏳" */
  emoji?: string;
  /** Icon size in dp/sp. Default: 40 */
  iconSize?: number;
  /** Circular container diameter in dp. Default: 88 */
  containerSize?: number;
  /** Circular container background hex color. Default: "#3B1824" */
  containerColor?: string;
  /** Circular container border hex color. Default: "#EF4444" */
  containerBorderColor?: string;
  /** Circular container border width in dp. Default: 1 */
  containerBorderWidth?: number;
  /** Optional badge emoji overlapping the bottom edge (e.g. "💬") */
  badgeEmoji?: string;
  /** Optional badge custom image URI */
  badgeImageUri?: string;
  /** Whether to show the real blocked app icon as badge */
  showAppBadge?: boolean;
  /** Badge size in dp. Default: 28 */
  badgeSize?: number;
  /** Badge background hex color. Default: "#1F2937" */
  badgeBackgroundColor?: string;
  /** Horizontal alignment: 'center' | 'left' | 'right'. Default: 'center' */
  alignSelf?: 'center' | 'left' | 'right';
}

/**
 * Image block for custom graphics, logos, or illustrations.
 */
export interface OverlayImageBlock extends OverlayBaseBlockProps {
  type: 'image';
  /** Image source URI (file://, content://, base64 data URI) */
  uri: string;
  width?: number;
  height?: number;
  borderRadius?: number;
  resizeMode?: 'fit' | 'center' | 'crop';
  alignSelf?: 'center' | 'left' | 'right';
}

/**
 * Pill-shaped badge block for streaks, tags, or status indicators.
 */
export interface OverlayBadgeBlock extends OverlayBaseBlockProps {
  type: 'badge';
  text: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textColor?: string;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  alignSelf?: 'center' | 'left' | 'right';
}

/**
 * Spacer block for expanding or fixed vertical spacing.
 */
export interface OverlaySpacerBlock extends OverlayBaseBlockProps {
  type: 'spacer';
  /** Fixed height in dp. If omitted or 0, flex weight is used */
  size?: number;
  /** Flex weight (default 1 when size is 0) */
  flex?: number;
}

/**
 * Horizontal divider line block.
 */
export interface OverlayDividerBlock extends OverlayBaseBlockProps {
  type: 'divider';
  color?: string;
  thickness?: number;
}

/**
 * Rounded card container grouping child blocks with a background and border.
 */
export interface OverlayCardBlock extends OverlayBaseBlockProps {
  type: 'card';
  children: OverlayBlock[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  maxWidth?: number;
  alignSelf?: 'center' | 'stretch';
}

/**
 * Horizontal row container for side-by-side elements.
 */
export interface OverlayRowBlock extends OverlayBaseBlockProps {
  type: 'row';
  children: OverlayBlock[];
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  alignItems?: 'flex-start' | 'center' | 'flex-end';
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
}

/**
 * Union of all available overlay layout blocks.
 */
export type OverlayBlock =
  | OverlayTextBlock
  | OverlayButtonBlock
  | OverlayIconBlock
  | OverlayImageBlock
  | OverlayBadgeBlock
  | OverlaySpacerBlock
  | OverlayDividerBlock
  | OverlayCardBlock
  | OverlayRowBlock;

/**
 * Complete block-based blocking overlay layout configuration.
 */
export interface OverlayLayoutConfig {
  /** Full-screen overlay background hex color (supports alpha e.g. #EE0D1117). Default: "#EE0D1117" */
  backgroundColor?: string;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingHorizontal?: number;
  paddingVertical?: number;
  /** Optional max width for the content column in dp. Default: 0 (fills screen with horizontal padding) */
  cardMaxWidth?: number;
  /** Ordered list of blocks to render */
  blocks: OverlayBlock[];
}

/**
 * Configuration options for the Emergency Pass / Grace Period feature.
 */
export interface EmergencyPassConfig {
  /** Whether emergency passes are enabled. Default: false */
  enabled?: boolean;
  /** Number of minutes each emergency pass unlocks the app. Default: 5 */
  durationMinutes?: number;
  /** Maximum number of emergency passes allowed per calendar day. Default: 3 */
  dailyLimit?: number;
  /** Minimum cooldown in minutes required between passes. Default: 0 */
  cooldownMinutes?: number;
  /** Whether to render the emergency button on the native blocking overlay. Default: true */
  showButtonOnOverlay?: boolean;
  /** Label for the emergency button. Default: "Emergency Access" */
  buttonText?: string;
  /** Background hex color for emergency button. Default: "#334155" */
  buttonColor?: string;
  /** Text hex color for emergency button. Default: "#F8FAFC" */
  buttonTextColor?: string;
  /** Whether to display remaining passes count on button (e.g. "· 2 left"). Default: true */
  showRemainingCount?: boolean;
  /** Optional custom subtext or disclaimer. Default: "" */
  customMessage?: string;
}

/**
 * Live status of the emergency pass system.
 */
export interface EmergencyPassStatus {
  /** Whether emergency passes are enabled. */
  enabled: boolean;
  /** Configured maximum passes per calendar day. */
  dailyLimit: number;
  /** Number of emergency passes remaining for today. */
  remainingPasses: number;
  /** Number of emergency passes consumed today. */
  usedPassesToday: number;
  /** Duration in minutes per pass. */
  durationMinutes: number;
  /** Whether an emergency pass is currently active. */
  isPassActive: boolean;
  /** The package name currently granted emergency access (or null). */
  activePackage: string | null;
  /** Timestamp in ms when the active pass expires (or null). */
  expiresAt: number | null;
  /** Seconds remaining in the active emergency pass. */
  remainingSeconds: number;
  /** Whether emergency passes are currently in cooldown. */
  isInCooldown: boolean;
  /** Timestamp in ms when cooldown expires (or null). */
  cooldownUntil: number | null;
  /** Seconds remaining in the cooldown. */
  cooldownRemainingSeconds: number;
}

/**
 * Result returned when activating an emergency pass.
 */
export interface EmergencyPassActivationResult {
  /** Whether the pass was successfully activated. */
  success: boolean;
  /** Passes remaining today after this activation. */
  remainingPasses?: number;
  /** Duration granted in minutes. */
  durationMinutes?: number;
  /** Expiration timestamp in ms. */
  expiresAt?: number;
  /** Package name unlocked. */
  activePackage?: string;
  /** Error code if activation failed (e.g. 'DAILY_LIMIT_EXHAUSTED', 'COOLDOWN_ACTIVE'). */
  error?: string;
  /** Human-readable explanation. */
  message?: string;
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
