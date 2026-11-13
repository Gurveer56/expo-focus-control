import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  AppState,
  type AppStateStatus,
} from 'react-native';
import * as FocusControl from 'expo-focus-control';
import type {
  AccessibilityStatus,
  AppBlockingStatus,
  BatteryDiagnostics,
  FocusSessionStatus,
  InstalledApp,
  PermissionStatus,
  PermissionStatuses,
  AppUsageRecord,
  WebsiteBlockingStatus,
} from 'expo-focus-control';

// ── Permission Dashboard ────────────────────────────────────────────────

interface PermissionRowProps {
  label: string;
  status: PermissionStatus | AccessibilityStatus;
  onOpen?: () => void;
}

function PermissionRow({ label, status, onOpen }: PermissionRowProps) {
  let statusColor = '#9E9E9E';
  let statusLabel: string = status;

  switch (status) {
    case 'granted':
    case 'CONNECTED':
      statusColor = '#4CAF50';
      statusLabel = status === 'CONNECTED' ? 'CONNECTED (Active)' : 'Granted';
      break;
    case 'ENABLED':
      statusColor = '#8BC34A';
      statusLabel = 'ENABLED (Pending bind)';
      break;
    case 'denied':
    case 'DISABLED':
      statusColor = '#F44336';
      statusLabel = status === 'DISABLED' ? 'DISABLED (Turn on)' : 'Denied';
      break;
    case 'NOT_DECLARED':
      statusColor = '#757575';
      statusLabel = 'NOT DECLARED';
      break;
    case 'restricted':
      statusColor = '#FF9800';
      statusLabel = 'Restricted';
      break;
    case 'unavailable':
    case 'UNAVAILABLE':
      statusColor = '#9E9E9E';
      statusLabel = 'Not supported';
      break;
  }

  return (
    <View style={styles.permissionRow}>
      <View style={styles.permissionInfo}>
        <Text style={styles.permissionLabel}>{label}</Text>
        <Text style={[styles.permissionStatus, { color: statusColor }]}>
          {statusLabel}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        {onOpen && status !== 'unavailable' && status !== 'UNAVAILABLE' && status !== 'NOT_DECLARED' && (
          <TouchableOpacity style={styles.settingsButton} onPress={onOpen}>
            <Text style={styles.settingsButtonText}>Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── App Blocking Section ─────────────────────────────────────────────────

interface BlockingSectionProps {
  blockingStatus: AppBlockingStatus | null;
  installedApps: InstalledApp[];
  loadingApps: boolean;
  onRefreshApps: () => void;
  onStart: () => void;
  onStop: () => void;
  onTogglePackage: (pkg: string) => void;
}

const PRESET_PACKAGES = [
  { name: 'Instagram', pkg: 'com.instagram.android' },
  { name: 'Instagram Lite', pkg: 'com.instagram.lite' },
  { name: 'YouTube', pkg: 'com.google.android.youtube' },
  { name: 'TikTok', pkg: 'com.zhiliaoapp.musically' },
];

function BlockingSection({
  blockingStatus,
  installedApps,
  loadingApps,
  onRefreshApps,
  onStart,
  onStop,
  onTogglePackage,
}: BlockingSectionProps) {
  const isActive = blockingStatus?.isBlockingActive ?? false;
  const overlayShowing = blockingStatus?.overlayShowing ?? false;
  const blockedList = blockingStatus?.blockedApplications ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [showAllApps, setShowAllApps] = useState(false);

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return installedApps;
    const q = searchQuery.toLowerCase().trim();
    return installedApps.filter(
      (app) => app.appName.toLowerCase().includes(q) || app.packageName.toLowerCase().includes(q)
    );
  }, [installedApps, searchQuery]);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>App Blocking</Text>
        <View style={[styles.statusBadge, { backgroundColor: isActive ? '#E8F5E9' : '#F5F5F5' }]}>
          <Text style={[styles.statusBadgeText, { color: isActive ? '#2E7D32' : '#757575' }]}>
            {isActive ? 'SESSION ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionSubtitle}>
        When active, AccessibilityService detects foreground app changes and displays a native WindowManager overlay.
      </Text>

      {overlayShowing && (
        <View style={styles.overlayNotice}>
          <Text style={styles.overlayNoticeText}>🛡️ Native Overlay is currently visible on screen!</Text>
        </View>
      )}

      {/* Quick Presets */}
      <Text style={styles.subhead}>Quick Distracting Apps:</Text>
      <View style={styles.chipRow}>
        {PRESET_PACKAGES.map(({ name, pkg }) => {
          const isSelected = blockedList.includes(pkg);
          return (
            <TouchableOpacity
              key={pkg}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onTogglePackage(pkg)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                {isSelected ? '✓ ' : '+ '}
                {name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Full Installed App Picker */}
      <View style={styles.pickerHeaderRow}>
        <Text style={styles.subhead}>
          Device Applications ({blockedList.length} selected):
        </Text>
        <TouchableOpacity
          style={styles.pickerToggleBtn}
          onPress={() => {
            if (!showAllApps && installedApps.length === 0) {
              onRefreshApps();
            }
            setShowAllApps(!showAllApps);
          }}
        >
          <Text style={styles.pickerToggleText}>
            {showAllApps ? '▲ Hide Device Apps' : `▼ Browse Device Apps (${installedApps.length || '...'})`}
          </Text>
        </TouchableOpacity>
      </View>

      {showAllApps && (
        <View style={styles.appPickerBox}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search apps by name or package..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                <Text style={styles.searchClearText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingApps && <Text style={styles.emptyText}>Loading installed applications...</Text>}

          {!loadingApps && filteredApps.length === 0 && (
            <Text style={styles.emptyText}>No applications found matching "{searchQuery}"</Text>
          )}

          <ScrollView style={styles.appListScroll} nestedScrollEnabled>
            {filteredApps.map((app) => {
              const isSelected = blockedList.includes(app.packageName);
              return (
                <TouchableOpacity
                  key={app.packageName}
                  style={[styles.appPickRow, isSelected && styles.appPickRowSelected]}
                  onPress={() => onTogglePackage(app.packageName)}
                >
                  <View style={styles.appPickInfo}>
                    <Text style={styles.appPickName}>{app.appName}</Text>
                    <Text style={styles.appPickPackage} numberOfLines={1}>
                      {app.packageName}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    <Text style={[styles.checkboxText, isSelected && styles.checkboxTextSelected]}>
                      {isSelected ? '✓' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={styles.controlButtons}>
        {!isActive ? (
          <TouchableOpacity style={styles.startButton} onPress={onStart}>
            <Text style={styles.buttonText}>▶ Start App Blocking ({blockedList.length} apps)</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={onStop}>
            <Text style={styles.buttonText}>■ Stop App Blocking</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Timed Focus Session Section ─────────────────────────────────────────

interface SessionSectionProps {
  sessionStatus: FocusSessionStatus | null;
  onStartSession: (durationSec: number) => void;
  onStopSession: () => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
}

function SessionSection({
  sessionStatus,
  onStartSession,
  onStopSession,
  onPauseSession,
  onResumeSession,
}: SessionSectionProps) {
  const isActive = sessionStatus?.isActive ?? false;
  const isPaused = sessionStatus?.isPaused ?? false;
  const remainingSec = sessionStatus?.remainingSeconds ?? 0;

  const formatCountdown = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Focus Session</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isActive ? (isPaused ? '#FFF3E0' : '#E8F5E9') : '#F5F5F5' },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: isActive ? (isPaused ? '#E65100' : '#2E7D32') : '#757575' },
            ]}
          >
            {isActive ? (isPaused ? 'PAUSED' : 'SESSION RUNNING') : 'IDLE'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionSubtitle}>
        Persistent foreground service with live status bar countdown and phone reboot restoration.
      </Text>

      {isActive && (
        <View style={styles.timerDisplayContainer}>
          <Text style={styles.timerCountdown}>{formatCountdown(remainingSec)}</Text>
          <Text style={styles.timerLabel}>
            {sessionStatus?.sessionName} · {isPaused ? 'Paused' : 'Sticky Notification Active'}
          </Text>
        </View>
      )}

      {!isActive ? (
        <View style={styles.durationPresets}>
          <TouchableOpacity style={styles.presetButton} onPress={() => onStartSession(60)}>
            <Text style={styles.presetButtonText}>1 min (Test)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.presetButton} onPress={() => onStartSession(900)}>
            <Text style={styles.presetButtonText}>15 min</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.presetButton} onPress={() => onStartSession(1500)}>
            <Text style={styles.presetButtonText}>25 min (Pomo)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.presetButton} onPress={() => onStartSession(2700)}>
            <Text style={styles.presetButtonText}>45 min</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.sessionActionRow}>
          {!isPaused ? (
            <TouchableOpacity style={styles.pauseButton} onPress={onPauseSession}>
              <Text style={styles.buttonText}>⏸ Pause</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.resumeButton} onPress={onResumeSession}>
              <Text style={styles.buttonText}>▶ Resume</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.stopButton} onPress={onStopSession}>
            <Text style={styles.buttonText}>■ End Session</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Website / Domain Blocking Section ───────────────────────────────────

interface WebsiteSectionProps {
  vpnStatus: WebsiteBlockingStatus | null;
  onToggleDomain: (domain: string) => void;
  onStartVpn: () => void;
  onStopVpn: () => void;
}

const PRESET_DOMAINS = [
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'reddit.com',
  'twitter.com',
];

function WebsiteSection({ vpnStatus, onToggleDomain, onStartVpn, onStopVpn }: WebsiteSectionProps) {
  const isActive = vpnStatus?.isActive ?? false;
  const blockedSites = vpnStatus?.blockedWebsites ?? [];

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Website Blocking</Text>
        <View style={[styles.statusBadge, { backgroundColor: isActive ? '#E8F5E9' : '#F5F5F5' }]}>
          <Text style={[styles.statusBadgeText, { color: isActive ? '#2E7D32' : '#757575' }]}>
            {isActive ? 'VPN ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionSubtitle}>
        Local DNS sinkhole VPN that intercepts and blocks distracting websites in Chrome, Brave, and other browsers.
      </Text>

      <Text style={styles.label}>Blocked Domains:</Text>
      <View style={styles.chipContainer}>
        {PRESET_DOMAINS.map((domain) => {
          const isSelected = blockedSites.includes(domain);
          return (
            <TouchableOpacity
              key={domain}
              style={[styles.chip, isSelected && styles.chipActive]}
              onPress={() => onToggleDomain(domain)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                {isSelected ? `✓ ${domain}` : `+ ${domain}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.controlButtons}>
        {!isActive ? (
          <TouchableOpacity style={styles.startButton} onPress={onStartVpn}>
            <Text style={styles.buttonText}>▶ Start Website Blocking ({blockedSites.length} sites)</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={onStopVpn}>
            <Text style={styles.buttonText}>■ Stop Website Blocking</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Battery Diagnostics Section ─────────────────────────────────────────

interface BatterySectionProps {
  diagnostics?: BatteryDiagnostics;
  onOpenBattery: () => void;
  onOpenOem: () => void;
}

function BatterySection({ diagnostics, onOpenBattery, onOpenOem }: BatterySectionProps) {
  if (!diagnostics) return null;

  const readinessColor = {
    READY: '#4CAF50',
    OPTIMIZED: '#2196F3',
    DEGRADED: '#FF9800',
    RESTRICTED: '#F44336',
  }[diagnostics.overallBackgroundReadiness];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Battery & Background Diagnostics</Text>
      <Text style={styles.sectionSubtitle}>
        Granular inspection of Android Doze, background restrictions, and power state.
      </Text>

      <View style={styles.diagRow}>
        <Text style={styles.diagLabel}>Overall Readiness</Text>
        <Text style={[styles.diagValue, { color: readinessColor, fontWeight: '700' }]}>
          {diagnostics.overallBackgroundReadiness}
        </Text>
      </View>

      <View style={styles.diagRow}>
        <Text style={styles.diagLabel}>Doze Exemption</Text>
        <Text style={[styles.diagValue, { color: diagnostics.dozeExempt ? '#4CAF50' : '#FF9800' }]}>
          {diagnostics.dozeExempt ? 'Whitelisted (Exempt)' : 'Optimized (Default)'}
        </Text>
      </View>

      <View style={styles.diagRow}>
        <Text style={styles.diagLabel}>Background Restricted (Android 9+)</Text>
        <Text style={[styles.diagValue, { color: diagnostics.backgroundRestricted ? '#F44336' : '#4CAF50' }]}>
          {diagnostics.backgroundRestricted ? 'RESTRICTED (Blocked)' : 'Allowed'}
        </Text>
      </View>

      <View style={styles.diagRow}>
        <Text style={styles.diagLabel}>System Battery Saver</Text>
        <Text style={[styles.diagValue, { color: diagnostics.batterySaverEnabled ? '#FF9800' : '#4CAF50' }]}>
          {diagnostics.batterySaverEnabled ? 'ACTIVE (Throttled)' : 'Inactive'}
        </Text>
      </View>

      <View style={styles.diagRow}>
        <Text style={styles.diagLabel}>OEM Battery Management</Text>
        <Text style={[styles.diagValue, { color: '#757575' }]}>
          {diagnostics.oemBatteryManagement}
        </Text>
      </View>

      <View style={styles.batteryActions}>
        <TouchableOpacity style={styles.diagButton} onPress={onOpenBattery}>
          <Text style={styles.diagButtonText}>App Info Battery</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.diagButton, styles.oemButton]} onPress={onOpenOem}>
          <Text style={styles.diagButtonText}>OEM Autostart / Battery</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Usage Data Section ──────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

interface UsageRowProps {
  record: AppUsageRecord;
}

function UsageRow({ record }: UsageRowProps) {
  return (
    <View style={styles.usageRow}>
      <View style={styles.usageInfo}>
        <Text style={styles.usageAppName} numberOfLines={1}>
          {record.appName || record.packageName}
        </Text>
        <Text style={styles.usagePackage} numberOfLines={1}>
          {record.packageName}
        </Text>
      </View>
      <Text style={styles.usageDuration}>
        {formatDuration(record.totalTimeInForeground)}
      </Text>
    </View>
  );
}

// ── Main App ────────────────────────────────────────────────────────────

export default function App() {
  const [statuses, setStatuses] = useState<PermissionStatuses | null>(null);
  const [blockingStatus, setBlockingStatus] = useState<AppBlockingStatus | null>(null);
  const [usageRecords, setUsageRecords] = useState<AppUsageRecord[]>([]);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [platformInfo, setPlatformInfo] = useState<{ platform: string; sdkVersion: number } | null>(null);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<FocusSessionStatus | null>(null);
  const [vpnStatus, setVpnStatus] = useState<WebsiteBlockingStatus | null>(null);

  const refreshAll = useCallback(() => {
    try {
      const s = FocusControl.getPermissionStatuses();
      setStatuses(s);
      const b = FocusControl.getAppBlockingStatus();
      setBlockingStatus(b);
      const ses = FocusControl.getFocusSessionStatus();
      setSessionStatus(ses);
      const vpn = FocusControl.getWebsiteBlockingStatus();
      setVpnStatus(vpn);
    } catch (e) {
      console.warn('Failed to refresh statuses:', e);
    }
  }, []);

  // Live timer tick for active focus sessions
  useEffect(() => {
    if (!sessionStatus?.isActive || sessionStatus?.isPaused) return;
    const interval = setInterval(() => {
      try {
        const ses = FocusControl.getFocusSessionStatus();
        setSessionStatus(ses);
      } catch (e) {
        // ignore
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStatus?.isActive, sessionStatus?.isPaused]);

  const loadInstalledApps = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    setLoadingApps(true);
    try {
      const apps = await FocusControl.getInstalledApplications({ includeSystemApps: false });
      setInstalledApps(apps);
    } catch (e) {
      console.warn('Failed to load installed apps:', e);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  const handleStartBlocking = useCallback(() => {
    try {
      FocusControl.startAppBlocking();
      refreshAll();
    } catch (e) {
      console.warn('Failed to start blocking:', e);
    }
  }, [refreshAll]);

  const handleStopBlocking = useCallback(() => {
    try {
      FocusControl.stopAppBlocking();
      refreshAll();
    } catch (e) {
      console.warn('Failed to stop blocking:', e);
    }
  }, [refreshAll]);

  const handleStartSession = useCallback((durationSec: number) => {
    try {
      FocusControl.startFocusSession(durationSec, { sessionName: 'Deep Work' });
      refreshAll();
    } catch (e) {
      console.warn('Failed to start session:', e);
    }
  }, [refreshAll]);

  const handleStopSession = useCallback(() => {
    try {
      FocusControl.stopFocusSession();
      refreshAll();
    } catch (e) {
      console.warn('Failed to stop session:', e);
    }
  }, [refreshAll]);

  const handlePauseSession = useCallback(() => {
    try {
      FocusControl.pauseFocusSession();
      refreshAll();
    } catch (e) {
      console.warn('Failed to pause session:', e);
    }
  }, [refreshAll]);

  const handleResumeSession = useCallback(() => {
    try {
      FocusControl.resumeFocusSession();
      refreshAll();
    } catch (e) {
      console.warn('Failed to resume session:', e);
    }
  }, [refreshAll]);

  const handleToggleDomain = useCallback((domain: string) => {
    try {
      const current = vpnStatus?.blockedWebsites ?? [];
      const updated = current.includes(domain)
        ? current.filter((d) => d !== domain)
        : [...current, domain];
      FocusControl.setBlockedWebsites(updated);
      refreshAll();
    } catch (e) {
      console.warn('Failed to toggle domain:', e);
    }
  }, [vpnStatus?.blockedWebsites, refreshAll]);

  const handleStartVpn = useCallback(() => {
    try {
      const granted = FocusControl.requestVpnPermission();
      if (granted) {
        FocusControl.startWebsiteBlocking();
      }
      refreshAll();
    } catch (e) {
      console.warn('Failed to start VPN:', e);
    }
  }, [refreshAll]);

  const handleStopVpn = useCallback(() => {
    try {
      FocusControl.stopWebsiteBlocking();
      refreshAll();
    } catch (e) {
      console.warn('Failed to stop VPN:', e);
    }
  }, [refreshAll]);

  const handleTogglePackage = useCallback((pkg: string) => {
    try {
      const current = blockingStatus?.blockedApplications ?? [];
      const updated = current.includes(pkg)
        ? current.filter((p) => p !== pkg)
        : [...current, pkg];
      FocusControl.setBlockedApplications(updated);
      refreshAll();
    } catch (e) {
      console.warn('Failed to update blocked apps:', e);
    }
  }, [blockingStatus?.blockedApplications, refreshAll]);

  const loadUsageData = useCallback(async () => {
    if (statuses?.usageAccess !== 'granted') {
      setUsageError('Usage access permission required');
      setUsageRecords([]);
      return;
    }

    setLoading(true);
    setUsageError(null);
    try {
      const result = await FocusControl.getDailyUsage('today', {
        excludeSelf: true,
        sortByUsage: true,
        limit: 20,
      });
      setUsageRecords(result.records);
      if (result.records.length === 0) {
        setUsageError('No usage data available for today');
      }
    } catch (e: any) {
      setUsageError(e?.message ?? 'Failed to load usage data');
      setUsageRecords([]);
    } finally {
      setLoading(false);
    }
  }, [statuses?.usageAccess]);

  // Load platform info, initial blocked packages, and installed apps on mount
  useEffect(() => {
    try {
      setPlatformInfo(FocusControl.getPlatformInfo());
      loadInstalledApps();
      // Pre-configure initial test packages if empty
      const current = FocusControl.getAppBlockingStatus();
      if (!current.blockedApplications || current.blockedApplications.length === 0) {
        FocusControl.setBlockedApplications(['com.instagram.android', 'com.google.android.youtube']);
      }
    } catch (e) {
      console.warn('Initialization error:', e);
    }
  }, [loadInstalledApps]);

  // Refresh permissions on mount and when app comes to foreground
  useEffect(() => {
    refreshAll();

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        refreshAll();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [refreshAll]);

  // Load usage data when usage access becomes granted
  useEffect(() => {
    if (statuses?.usageAccess === 'granted') {
      loadUsageData();
    }
  }, [statuses?.usageAccess, loadUsageData]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>expo-focus-control</Text>
        {platformInfo && (
          <Text style={styles.subheader}>
            {platformInfo.platform.toUpperCase()} · SDK {platformInfo.sdkVersion}
          </Text>
        )}

        {/* App Blocking */}
        <BlockingSection
          blockingStatus={blockingStatus}
          installedApps={installedApps}
          loadingApps={loadingApps}
          onRefreshApps={loadInstalledApps}
          onStart={handleStartBlocking}
          onStop={handleStopBlocking}
          onTogglePackage={handleTogglePackage}
        />

        {/* Focus Session */}
        <SessionSection
          sessionStatus={sessionStatus}
          onStartSession={handleStartSession}
          onStopSession={handleStopSession}
          onPauseSession={handlePauseSession}
          onResumeSession={handleResumeSession}
        />

        {/* Website Blocking */}
        <WebsiteSection
          vpnStatus={vpnStatus}
          onToggleDomain={handleToggleDomain}
          onStartVpn={handleStartVpn}
          onStopVpn={handleStopVpn}
        />

        {/* Permission Dashboard */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Permissions & Services</Text>
            <TouchableOpacity onPress={refreshAll}>
              <Text style={styles.refreshButton}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>

          {statuses ? (
            <>
              <PermissionRow
                label="Usage Access"
                status={statuses.usageAccess}
                onOpen={FocusControl.openUsageAccessSettings}
              />
              <PermissionRow
                label="Accessibility Service"
                status={statuses.accessibilityService}
                onOpen={FocusControl.openAccessibilitySettings}
              />
              <PermissionRow
                label="Overlay (Draw Over Other Apps)"
                status={statuses.overlayPermission}
                onOpen={FocusControl.openOverlaySettings}
              />
              <PermissionRow
                label="Exact Alarms"
                status={statuses.exactAlarm}
                onOpen={FocusControl.openExactAlarmSettings}
              />
            </>
          ) : (
            <Text style={styles.emptyText}>Loading permissions...</Text>
          )}

          {statuses?.accessibilityService === 'DISABLED' && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>
                ⚠️ <Text style={{ fontWeight: '700' }}>Android 13+ Note:</Text> If Accessibility is grayed out
                ("Restricted setting"), tap App Info ➔ 3 dots in upper right ➔ tap "Allow restricted settings".
              </Text>
            </View>
          )}
        </View>

        {/* Battery & Background Diagnostics */}
        {statuses?.batteryDiagnostics && (
          <BatterySection
            diagnostics={statuses.batteryDiagnostics}
            onOpenBattery={FocusControl.openBatterySettings}
            onOpenOem={FocusControl.openOemBatterySettings}
          />
        )}

        {/* Usage Data */}
        {Platform.OS === 'android' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Usage</Text>
              <TouchableOpacity onPress={loadUsageData}>
                <Text style={styles.refreshButton}>↻ Refresh</Text>
              </TouchableOpacity>
            </View>

            {loading && <Text style={styles.emptyText}>Loading...</Text>}
            {usageError && <Text style={styles.errorText}>{usageError}</Text>}
            {!loading && !usageError && usageRecords.length === 0 && (
              <Text style={styles.emptyText}>
                Grant Usage Access permission to see app usage data.
              </Text>
            )}
            {usageRecords.map((record) => (
              <UsageRow key={record.packageName} record={record} />
            ))}
          </View>
        )}

        {Platform.OS === 'ios' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>iOS Screen Time</Text>
            <Text style={styles.emptyText}>
              Screen Time integration requires FamilyControls entitlement
              and app extension targets. See the README for setup instructions.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  subheader: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
    marginBottom: 12,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  overlayNotice: {
    backgroundColor: '#E0F2FE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  overlayNoticeText: {
    fontSize: 13,
    color: '#0369A1',
    fontWeight: '600',
    textAlign: 'center',
  },
  subhead: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  chipText: {
    fontSize: 13,
    color: '#475569',
  },
  chipTextSelected: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerToggleBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pickerToggleText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  appPickerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    height: 38,
    fontSize: 13,
    color: '#1E293B',
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClearText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  appListScroll: {
    maxHeight: 260,
  },
  appPickRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    borderRadius: 6,
  },
  appPickRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  appPickInfo: {
    flex: 1,
    marginRight: 10,
  },
  appPickName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  appPickPackage: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  checkboxSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkboxText: {
    fontSize: 12,
    color: 'transparent',
  },
  checkboxTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  controlButtons: {
    marginTop: 4,
  },
  startButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#C62828',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  refreshButton: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  permissionInfo: {
    flex: 1,
  },
  permissionLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  permissionStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  settingsButtonText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
  },
  noticeBox: {
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    padding: 10,
    marginTop: 12,
    borderRadius: 4,
  },
  noticeText: {
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 18,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  diagLabel: {
    fontSize: 13,
    color: '#555',
  },
  diagValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  batteryActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  diagButton: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  oemButton: {
    backgroundColor: '#EDE7F6',
  },
  diagButtonText: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '600',
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  usageInfo: {
    flex: 1,
    marginRight: 12,
  },
  usageAppName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  usagePackage: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  usageDuration: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
    paddingVertical: 16,
  },
  timerDisplayContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  timerCountdown: {
    fontSize: 48,
    fontWeight: '800',
    color: '#38BDF8',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },
  durationPresets: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  presetButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  presetButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sessionActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  pauseButton: {
    flex: 1,
    backgroundColor: '#D97706',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resumeButton: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
