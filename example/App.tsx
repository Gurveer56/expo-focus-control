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
  Image,
  type AppStateStatus,
} from 'react-native';
import * as FocusControl from 'expo-focus-control';
import type {
  AccessibilityStatus,
  AppBlockingStatus,
  BatteryDiagnostics,
  EmergencyPassConfig,
  EmergencyPassStatus,
  FocusSessionStatus,
  InstalledApp,
  OverlayConfig,
  PermissionStatus,
  PermissionStatuses,
  AppUsageRecord,
  WebsiteBlockingStatus,
} from 'expo-focus-control';

// ── Assets ───────────────────────────────────────────────────────────────

const HOURGLASS_ICON_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAB+UlEQVR42u3ay3HDMBAEUUWj/A8IwkE4F/rigy6yBQL8YOd11QZgTO8Qpvh4AAAAAAAAAAAAAAAAAAAAAAAADPL9fG5pI3UCIDF4EhCAAAQgwFsBkkQnQMDBCD+8BYQfvCG2f+JlsMrfI+3iArj5B0sg/BPeCRCYBJvwSbARgADCJ4HwowW48oD94BMsgfBvJsDZh02A4BYQfnAL+NgjWALhB0vgU6/FBJgdgvCDW0D4wS2g+oMlEH4RAfaE4xv/cAmEHyyA7Q+WQPiLS/BJiFffL3BwC+yRQPhhLfA7Xy8j/LQWGAmfAAu0wEi1/yeSU1+kBUaf77Y/WALbHyzAJ48XLCRAjwSf3i+wmACz3g847aLh97SGU1/k38DRO4AWCNv+nguk0y+6/Vog8OavBQpu/6zfAkhQ98VPexmvhcOqv/UIQIJa29/ejNfDweF7FKx+8ZsQ/pAE0rlw+3dc+oYk0AJ1t58ABbe/7RwS3H37DwyfBHff/hPC3y2B1K4Pf6YAJAjefgIInwQrCdAOHgIEh08CAvRLIM164WuBmwnQLhoSBIfvUSB8EhCgUwIp1wxfC5wsQLvpECA4fBKcIEBbZAgwGH5bXAASDAjQig8J/hCghQwBBt/7lxkCEACpIkidACAAAAAAAAAAAAAAAAAAAAAAAAC7+QFc0A2nwHqQyAAAAABJRU5ErkJggg==';

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

      <Text style={styles.subhead}>Blocked Domains:</Text>
      <View style={styles.chipRow}>
        {PRESET_DOMAINS.map((domain) => {
          const isSelected = blockedSites.includes(domain);
          return (
            <TouchableOpacity
              key={domain}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => onToggleDomain(domain)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
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

// ── Live App Blocking Shield Preview ─────────────────────────────────────

interface LimitShieldPreviewProps {
  appName: string;
  passesLeft: number;
  isEmergencyActive: boolean;
  emergencySecondsLeft: number;
  onCloseApp: () => void;
  onEmergencyUse: () => void;
}

function LimitShieldPreview({
  appName,
  passesLeft,
  isEmergencyActive,
  emergencySecondsLeft,
  onCloseApp,
  onEmergencyUse,
}: LimitShieldPreviewProps) {
  return (
    <View style={styles.limitShieldContainer}>
      <Text style={styles.previewBadge}>LIVE BLOCKING SHIELD PREVIEW</Text>
      <View style={styles.limitShieldCard}>
        {/* Top Icon Area: Crimson circle with hourglass image & overlapping badge */}
        <View style={styles.heroIconWrapper}>
          <View style={styles.heroOuterCircle}>
            <Image
              source={require('./assets/hourglass_icon.png')}
              style={styles.heroHourglassImage}
            />
          </View>
          <View style={styles.heroAppBadge}>
            <Text style={styles.heroAppBadgeText}>💬</Text>
          </View>
        </View>

        {/* Heading & Subtitle */}
        <Text style={styles.limitShieldTitle}>You’ve hit your limit</Text>
        <Text style={styles.limitShieldSubtitle}>
          You've used <Text style={styles.limitShieldAppHighlight}>{appName}</Text> for 30 of 30 minutes today.
        </Text>

        {/* Emergency Pass Info Banner */}
        <View style={styles.limitShieldBanner}>
          <View style={styles.bannerIndicatorCircle}>
            <Text style={styles.bannerIndicatorText}>{isEmergencyActive ? emergencySecondsLeft : passesLeft}</Text>
          </View>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerHeading}>
              {isEmergencyActive ? 'Emergency pass active' : passesLeft > 0 ? 'Emergency pass unlocked' : 'No passes left today'}
            </Text>
            <Text style={styles.bannerSubtext}>Take a deep breath and pause</Text>
          </View>
        </View>

        {/* Primary Action Button (Electric Lime) */}
        <TouchableOpacity style={styles.closeAppButton} onPress={onCloseApp} activeOpacity={0.85}>
          <Text style={styles.closeAppButtonText}>Close app</Text>
        </TouchableOpacity>

        {/* Secondary Action Button (Dark Pill) */}
        <TouchableOpacity
          style={[styles.emergencyUseButton, passesLeft <= 0 && !isEmergencyActive && { opacity: 0.5 }]}
          onPress={onEmergencyUse}
          activeOpacity={0.85}
          disabled={passesLeft <= 0 && !isEmergencyActive}
        >
          <Text style={styles.emergencyUseButtonText}>
            ⏱ {isEmergencyActive ? `Emergency active (${emergencySecondsLeft}s)` : 'Emergency use (5 min)'}
          </Text>
        </TouchableOpacity>

        {/* Remaining passes subtext */}
        <Text style={styles.limitShieldRemainingSubtext}>
          {passesLeft} left today
        </Text>
      </View>
    </View>
  );
}

// ── Overlay UI Customization Section ────────────────────────────────────

interface OverlaySectionProps {
  onApplyPreset: (preset: 'limitShield' | 'default' | 'minimal' | 'cyberpunk') => void;
  onReset: () => void;
  activePreset: string;
}

function OverlaySection({ onApplyPreset, onReset, activePreset }: OverlaySectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Native Overlay Customization</Text>
      <Text style={styles.sectionSubtitle}>
        Customize the native Android WindowManager blocking shield appearance without writing native code.
      </Text>

      <Text style={[styles.diagLabel, { marginBottom: 8 }]}>
        Active Theme: <Text style={{ color: '#22C55E', fontWeight: '700' }}>{activePreset.toUpperCase()}</Text>
      </Text>

      <View style={styles.durationPresets}>
        <TouchableOpacity
          style={[styles.presetButton, activePreset === 'limitShield' && { backgroundColor: '#1E2532' }]}
          onPress={() => onApplyPreset('limitShield')}
        >
          <Text style={styles.presetButtonText}>Limit Shield ⏳</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.presetButton, activePreset === 'default' && { backgroundColor: '#1E2532' }]}
          onPress={() => onApplyPreset('default')}
        >
          <Text style={styles.presetButtonText}>Clean Dark</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.presetButton, activePreset === 'minimal' && { backgroundColor: '#1E2532' }]}
          onPress={() => onApplyPreset('minimal')}
        >
          <Text style={styles.presetButtonText}>Calm Zen 🧘</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.presetButton, activePreset === 'cyberpunk' && { backgroundColor: '#1E2532' }]}
          onPress={() => onApplyPreset('cyberpunk')}
        >
          <Text style={styles.presetButtonText}>Cyberpunk 🚀</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 10 }}>
        <TouchableOpacity style={styles.secondaryActionBtn} onPress={onReset}>
          <Text style={styles.secondaryActionText}>↺ Reset Overlay to Defaults</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Emergency Pass Section ──────────────────────────────────────────────

interface EmergencySectionProps {
  status: EmergencyPassStatus | null;
  onEnable1mTest: () => void;
  onActivatePass: () => void;
  onCancelPass: () => void;
  onResetPasses: () => void;
  onGrantPass: () => void;
}

function EmergencySection({
  status,
  onEnable1mTest,
  onActivatePass,
  onCancelPass,
  onResetPasses,
  onGrantPass,
}: EmergencySectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Emergency Pass / Grace Period</Text>
      <Text style={styles.sectionSubtitle}>
        Regulated temporary app access during blocks (daily limit + auto-reset at midnight + automatic re-block).
      </Text>

      {status ? (
        <View style={styles.timerDisplayContainer}>
          <Text style={styles.timerCountdown}>
            {status.isPassActive ? `${status.remainingSeconds}s` : `${status.remainingPasses} / ${status.dailyLimit}`}
          </Text>
          <Text style={styles.timerLabel}>
            {status.isPassActive
              ? `⚡ Active Grace Period (${status.activePackage || 'Any App'})`
              : status.isInCooldown
              ? `⏳ Cooldown (${status.cooldownRemainingSeconds}s remaining)`
              : `Passes Remaining Today (${status.durationMinutes}m each)`}
          </Text>
        </View>
      ) : (
        <Text style={styles.emptyText}>Loading emergency status...</Text>
      )}

      <View style={styles.durationPresets}>
        <TouchableOpacity style={styles.presetButton} onPress={onEnable1mTest}>
          <Text style={styles.presetButtonText}>⚙ 1m Test Config</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.presetButton, { backgroundColor: '#16A34A' }]}
          onPress={onActivatePass}
        >
          <Text style={styles.presetButtonText}>▶ Trigger 1m Pass</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.sessionActionRow, { marginTop: 8 }]}>
        <TouchableOpacity style={styles.pauseButton} onPress={onCancelPass}>
          <Text style={styles.buttonText}>■ Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.resumeButton, { backgroundColor: '#6366F1' }]} onPress={onGrantPass}>
          <Text style={styles.buttonText}>+1 Bonus</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.resumeButton, { backgroundColor: '#64748B' }]} onPress={onResetPasses}>
          <Text style={styles.buttonText}>↺ Reset</Text>
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
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyPassStatus | null>(null);
  const [activeTheme, setActiveTheme] = useState<string>('limitShield');

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
      const em = FocusControl.getEmergencyPassStatus();
      setEmergencyStatus(em);
    } catch (e) {
      console.warn('Failed to refresh statuses:', e);
    }
  }, []);

  // Live timer tick for active focus sessions and emergency pass cooldown/active timers
  useEffect(() => {
    const shouldTick = (sessionStatus?.isActive && !sessionStatus?.isPaused) ||
                       emergencyStatus?.isPassActive ||
                       emergencyStatus?.isInCooldown;
    if (!shouldTick) return;

    const interval = setInterval(() => {
      try {
        if (sessionStatus?.isActive) {
          const ses = FocusControl.getFocusSessionStatus();
          setSessionStatus(ses);
        }
        if (emergencyStatus?.isPassActive || emergencyStatus?.isInCooldown) {
          const em = FocusControl.getEmergencyPassStatus();
          setEmergencyStatus(em);
        }
      } catch (e) {
        // ignore
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [
    sessionStatus?.isActive,
    sessionStatus?.isPaused,
    emergencyStatus?.isPassActive,
    emergencyStatus?.isInCooldown
  ]);

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

  // ── Overlay Customization Handlers ──
  const handleApplyPreset = useCallback((preset: 'limitShield' | 'default' | 'minimal' | 'cyberpunk') => {
    setActiveTheme(preset);
    if (preset === 'limitShield') {
      // Configure block-based layout with custom image asset for native WindowManager overlay
      FocusControl.setOverlayLayout({
        backgroundColor: '#0D1117',
        paddingTop: 54,
        paddingBottom: 36,
        paddingHorizontal: 24,
        cardMaxWidth: 380,
        blocks: [
          // Hero icon: circular crimson container with custom PNG hourglass asset + app badge
          {
            type: 'icon',
            imageUri: HOURGLASS_ICON_BASE64,
            iconSize: 48,
            containerSize: 92,
            containerColor: '#3B1824',
            containerBorderColor: '#EF4444',
            containerBorderWidth: 1,
            badgeEmoji: '💬',
            badgeSize: 28,
            badgeBackgroundColor: '#1F2937',
            alignSelf: 'center',
          },
          // Headline
          {
            type: 'text',
            text: 'You’ve hit your limit',
            fontSize: 24,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textAlign: 'center',
            marginTop: 22,
          },
          // Subtitle with app name template variable
          {
            type: 'text',
            text: "You've used {appName} for 30 of 30 minutes today.",
            fontSize: 14,
            color: '#94A3B8',
            textAlign: 'center',
            marginTop: 8,
          },
          // Card: Emergency pass status / mindful pause
          {
            type: 'card',
            backgroundColor: '#161B24',
            borderColor: '#232B3A',
            borderWidth: 1,
            borderRadius: 18,
            padding: 16,
            marginTop: 20,
            children: [
              {
                type: 'row',
                alignItems: 'center',
                children: [
                  {
                    type: 'badge',
                    text: '{remainingPasses}',
                    backgroundColor: '#1E293B',
                    textColor: '#10B981',
                    borderRadius: 20,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    fontSize: 14,
                    fontWeight: 'bold',
                    marginRight: 12,
                  },
                  {
                    type: 'card',
                    backgroundColor: '#00000000',
                    borderWidth: 0,
                    padding: 0,
                    flex: 1,
                    children: [
                      {
                        type: 'text',
                        text: 'Emergency pass unlocked',
                        color: '#22C55E',
                        fontSize: 14,
                        fontWeight: 'bold',
                        textAlign: 'left',
                      },
                      {
                        type: 'text',
                        text: 'Take a deep breath and pause',
                        color: '#94A3B8',
                        fontSize: 12,
                        textAlign: 'left',
                        marginTop: 2,
                      },
                    ],
                  },
                ],
              },
            ],
          },
          // Flexible vertical space pushing buttons down
          {
            type: 'spacer',
            flex: 1,
          },
          // Primary Action: Lime green "Close app" button
          {
            type: 'button',
            text: 'Close app',
            action: 'close',
            backgroundColor: '#D4FF32',
            textColor: '#000000',
            borderRadius: 28,
            height: 54,
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 12,
          },
          // Secondary Action: Dark pill "Emergency use" button
          {
            type: 'button',
            text: '⏱ Emergency use ({durationMinutes} min)',
            action: 'emergency',
            backgroundColor: '#1B222C',
            textColor: '#F1F5F9',
            borderRadius: 28,
            height: 50,
            fontSize: 14,
            fontWeight: 'bold',
            marginBottom: 10,
          },
          // Footer note
          {
            type: 'text',
            text: '{remainingPasses} left today',
            fontSize: 12,
            color: '#64748B',
            textAlign: 'center',
          },
        ],
      });

      FocusControl.setEmergencyPassConfig({
        enabled: true,
        durationMinutes: 5,
        dailyLimit: 3,
        showButtonOnOverlay: true,
        buttonText: '⏱ Emergency use',
        buttonColor: '#1B222C',
        buttonTextColor: '#F1F5F9',
        showRemainingCount: true,
      });
    } else {
      // Reset block-based layout so standard config presets apply cleanly
      FocusControl.resetOverlayLayout();

      if (preset === 'default') {
        FocusControl.setOverlayConfig({
          title: 'Focus Mode Active',
          message: 'This application is restricted during your scheduled focus time.',
          titleColor: '#F8FAFC',
          messageColor: '#94A3B8',
          cardBackgroundColor: '#1E293B',
          cardBorderColor: '#334155',
          primaryButtonColor: '#2563EB',
          showAppIcon: true,
          cardAlignment: 'center',
        });
      } else if (preset === 'minimal') {
        FocusControl.setOverlayConfig({
          title: 'Mindful Moment',
          message: 'Pause and take three deep breaths before proceeding.',
          iconEmoji: '🧘‍♂️',
          showAppIcon: false,
          titleColor: '#10B981',
          messageColor: '#6EE7B7',
          cardBackgroundColor: '#064E3B',
          cardBorderColor: '#059669',
          cardCornerRadius: 32,
          primaryButtonColor: '#059669',
          primaryButtonText: 'Return to Calm',
          cardAlignment: 'center',
        });
      } else if (preset === 'cyberpunk') {
        FocusControl.setOverlayConfig({
          title: 'ACCESS RESTRICTED // 403',
          message: 'Protocol engaged. Firewall preventing unauthorized distractions.',
          iconEmoji: '🚀',
          showAppIcon: false,
          titleColor: '#F43F5E',
          titleSize: 22,
          messageColor: '#FB7185',
          cardBackgroundColor: '#18181B',
          cardBorderColor: '#E11D48',
          cardBorderWidth: 2,
          cardCornerRadius: 12,
          primaryButtonColor: '#E11D48',
          primaryButtonText: 'DISCONNECT TARGET',
          cardAlignment: 'center',
        });
      }
    }
  }, []);

  const handleResetOverlay = useCallback(() => {
    FocusControl.resetOverlayLayout();
    FocusControl.resetOverlayConfig();
    setActiveTheme('default');
  }, []);

  // ── Emergency Pass Handlers ──
  const handleEnable1mTest = useCallback(() => {
    FocusControl.setEmergencyPassConfig({
      enabled: true,
      durationMinutes: 1, // 1 minute for fast live testing
      dailyLimit: 3,
      cooldownMinutes: 0,
      showButtonOnOverlay: true,
      buttonText: 'Emergency Access',
      buttonColor: '#334155',
      buttonTextColor: '#F8FAFC',
      showRemainingCount: true,
    });
    refreshAll();
  }, [refreshAll]);

  const handleActivateEmergencyPass = useCallback(() => {
    FocusControl.activateEmergencyPass(undefined, 1);
    refreshAll();
  }, [refreshAll]);

  const handleCancelEmergencyPass = useCallback(() => {
    FocusControl.cancelEmergencyPass();
    refreshAll();
  }, [refreshAll]);

  const handleResetEmergencyPasses = useCallback(() => {
    FocusControl.resetEmergencyPasses();
    refreshAll();
  }, [refreshAll]);

  const handleGrantBonusPass = useCallback(() => {
    FocusControl.grantEmergencyPasses(1);
    refreshAll();
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
      handleApplyPreset('limitShield');
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

        {/* Overlay UI Customization Tester */}
        <OverlaySection
          activePreset={activeTheme}
          onApplyPreset={handleApplyPreset}
          onReset={handleResetOverlay}
        />

        {/* Live Blocking Shield Preview (Matching Reference Design) */}
        <LimitShieldPreview
          appName={blockingStatus?.blockedApplications?.[0]?.split('.').pop()?.toUpperCase() || 'REDDIT'}
          passesLeft={emergencyStatus?.remainingPasses ?? 3}
          isEmergencyActive={emergencyStatus?.isPassActive ?? false}
          emergencySecondsLeft={emergencyStatus?.remainingSeconds ?? 0}
          onCloseApp={() => {
            FocusControl.stopAppBlocking();
            refreshAll();
          }}
          onEmergencyUse={() => {
            FocusControl.activateEmergencyPass(undefined, 5);
            refreshAll();
          }}
        />

        {/* Emergency Pass Tester */}
        <EmergencySection
          status={emergencyStatus}
          onEnable1mTest={handleEnable1mTest}
          onActivatePass={handleActivateEmergencyPass}
          onCancelPass={handleCancelEmergencyPass}
          onResetPasses={handleResetEmergencyPasses}
          onGrantPass={handleGrantBonusPass}
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
  secondaryActionBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  secondaryActionText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  previewBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D4FF32',
    letterSpacing: 1.2,
    marginBottom: 8,
    textAlign: 'center',
  },
  limitShieldContainer: {
    backgroundColor: '#090D14',
    borderRadius: 24,
    padding: 20,
    marginVertical: 14,
    borderWidth: 1.5,
    borderColor: '#1E2532',
  },
  limitShieldCard: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  heroIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroOuterCircle: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: '#26151D',
    borderWidth: 1.5,
    borderColor: '#FF4D6D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroHourglass: {
    fontSize: 40,
  },
  heroHourglassImage: {
    width: 44,
    height: 44,
  },
  heroAppBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#1E2430',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  heroAppBadgeText: {
    fontSize: 16,
  },
  limitShieldTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  limitShieldSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 22,
  },
  limitShieldAppHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  limitShieldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#232B3A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 24,
  },
  bannerIndicatorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F131A',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  bannerIndicatorText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#22C55E',
  },
  bannerTextCol: {
    flex: 1,
  },
  bannerHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#22C55E',
    marginBottom: 2,
  },
  bannerSubtext: {
    fontSize: 13,
    color: '#8B949E',
  },
  closeAppButton: {
    backgroundColor: '#D4FF32',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  closeAppButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  emergencyUseButton: {
    backgroundColor: '#1B222C',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A3444',
    marginBottom: 10,
  },
  emergencyUseButtonText: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '700',
  },
  limitShieldRemainingSubtext: {
    fontSize: 13,
    color: '#6E7681',
    fontWeight: '500',
    textAlign: 'center',
  },
});
