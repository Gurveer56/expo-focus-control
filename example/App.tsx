import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  AppState,
  type AppStateStatus,
} from 'react-native';
import * as FocusControl from 'expo-focus-control';
import type { PermissionStatus, PermissionStatuses, AppUsageRecord } from 'expo-focus-control';

// ── Permission Dashboard ────────────────────────────────────────────────

interface PermissionRowProps {
  label: string;
  status: PermissionStatus;
  onOpen: () => void;
}

function PermissionRow({ label, status, onOpen }: PermissionRowProps) {
  const statusColor = {
    granted: '#4CAF50',
    denied: '#F44336',
    unavailable: '#9E9E9E',
    restricted: '#FF9800',
  }[status];

  const statusLabel = {
    granted: 'Enabled',
    denied: 'Disabled',
    unavailable: 'Not supported',
    restricted: 'Restricted',
  }[status];

  return (
    <View style={styles.permissionRow}>
      <View style={styles.permissionInfo}>
        <Text style={styles.permissionLabel}>{label}</Text>
        <Text style={[styles.permissionStatus, { color: statusColor }]}>
          {statusLabel}
        </Text>
      </View>
      {status !== 'unavailable' && (
        <TouchableOpacity style={styles.settingsButton} onPress={onOpen}>
          <Text style={styles.settingsButtonText}>Settings</Text>
        </TouchableOpacity>
      )}
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
  const [usageRecords, setUsageRecords] = useState<AppUsageRecord[]>([]);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [platformInfo, setPlatformInfo] = useState<{ platform: string; sdkVersion: number } | null>(null);

  const refreshPermissions = useCallback(() => {
    try {
      const s = FocusControl.getPermissionStatuses();
      setStatuses(s);
    } catch (e) {
      console.warn('Failed to get permission statuses:', e);
    }
  }, []);

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

  // Load platform info on mount
  useEffect(() => {
    try {
      setPlatformInfo(FocusControl.getPlatformInfo());
    } catch (e) {
      console.warn('Failed to get platform info:', e);
    }
  }, []);

  // Refresh permissions on mount and when app comes to foreground
  useEffect(() => {
    refreshPermissions();

    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        refreshPermissions();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);
    return () => subscription.remove();
  }, [refreshPermissions]);

  // Load usage data when usage access becomes granted
  useEffect(() => {
    if (statuses?.usageAccess === 'granted') {
      loadUsageData();
    }
  }, [statuses?.usageAccess, loadUsageData]);

  const permissionRows: { label: string; key: keyof PermissionStatuses; onOpen: () => void }[] = [
    { label: 'Usage Access', key: 'usageAccess', onOpen: FocusControl.openUsageAccessSettings },
    { label: 'Accessibility Service', key: 'accessibilityService', onOpen: FocusControl.openAccessibilitySettings },
    { label: 'Overlay', key: 'overlayPermission', onOpen: FocusControl.openOverlaySettings },
    { label: 'Notifications', key: 'notificationPermission', onOpen: FocusControl.openNotificationSettings },
    { label: 'VPN', key: 'vpnPermission', onOpen: () => {} },
    { label: 'Battery Optimization', key: 'batteryOptimization', onOpen: FocusControl.openBatterySettings },
    { label: 'Exact Alarms', key: 'exactAlarm', onOpen: FocusControl.openExactAlarmSettings },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>expo-focus-control</Text>
        {platformInfo && (
          <Text style={styles.subheader}>
            {platformInfo.platform.toUpperCase()} · SDK {platformInfo.sdkVersion}
          </Text>
        )}

        {/* Permission Dashboard */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Permissions</Text>
            <TouchableOpacity onPress={refreshPermissions}>
              <Text style={styles.refreshButton}>↻ Refresh</Text>
            </TouchableOpacity>
          </View>

          {statuses ? (
            permissionRows.map(({ label, key, onOpen }) => (
              <PermissionRow
                key={key}
                label={label}
                status={statuses[key]}
                onOpen={onOpen}
              />
            ))
          ) : (
            <Text style={styles.emptyText}>Loading permissions...</Text>
          )}
        </View>

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
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
  settingsButton: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  settingsButtonText: {
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '500',
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
});
