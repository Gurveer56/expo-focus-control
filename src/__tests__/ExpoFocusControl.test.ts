import * as FocusControl from '../index';
import ExpoFocusControlModule from '../ExpoFocusControlModule';

// Mock the native module
jest.mock('../ExpoFocusControlModule', () => ({
  __esModule: true,
  default: {
    getPermissionStatuses: jest.fn(() => ({
      usageAccess: 'granted',
      accessibilityService: 'denied',
      overlayPermission: 'denied',
      notificationPermission: 'granted',
      vpnPermission: 'denied',
      batteryOptimization: 'unavailable',
      exactAlarm: 'granted',
    })),
    getUsageAccessStatus: jest.fn(() => 'granted'),
    openUsageAccessSettings: jest.fn(),
    getAccessibilityStatus: jest.fn(() => 'denied'),
    openAccessibilitySettings: jest.fn(),
    getOverlayPermissionStatus: jest.fn(() => 'denied'),
    openOverlaySettings: jest.fn(),
    getNotificationPermissionStatus: jest.fn(() => 'granted'),
    openNotificationSettings: jest.fn(),
    getBatteryOptimizationStatus: jest.fn(() => 'unavailable'),
    openBatterySettings: jest.fn(),
    getExactAlarmStatus: jest.fn(() => 'granted'),
    openExactAlarmSettings: jest.fn(),
    getVpnStatus: jest.fn(() => 'denied'),
    queryUsageStats: jest.fn(async (startTime: number, endTime: number, excludeSelf: boolean, limit: number, sortByUsage: boolean) => ({
      records: [
        {
          packageName: 'com.instagram.android',
          appName: 'Instagram',
          totalTimeInForeground: 3600000,
          lastTimeUsed: Date.now(),
        },
        {
          packageName: 'com.google.android.youtube',
          appName: 'YouTube',
          totalTimeInForeground: 1800000,
          lastTimeUsed: Date.now(),
        },
      ],
      startTime,
      endTime,
    })),
    getPlatformInfo: jest.fn(() => ({
      platform: 'android',
      sdkVersion: 34,
    })),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

describe('ExpoFocusControl Public API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Statuses', () => {
    it('returns all permission statuses as typed object', () => {
      const statuses = FocusControl.getPermissionStatuses();
      expect(statuses).toEqual({
        usageAccess: 'granted',
        accessibilityService: 'denied',
        overlayPermission: 'denied',
        notificationPermission: 'granted',
        vpnPermission: 'denied',
        batteryOptimization: 'unavailable',
        exactAlarm: 'granted',
      });
      expect(ExpoFocusControlModule.getPermissionStatuses).toHaveBeenCalledTimes(1);
    });

    it('queries individual permission statuses', () => {
      expect(FocusControl.getUsageAccessStatus()).toBe('granted');
      expect(FocusControl.getAccessibilityStatus()).toBe('denied');
      expect(FocusControl.getOverlayPermissionStatus()).toBe('denied');
      expect(FocusControl.getNotificationPermissionStatus()).toBe('granted');
      expect(FocusControl.getBatteryOptimizationStatus()).toBe('unavailable');
      expect(FocusControl.getExactAlarmStatus()).toBe('granted');
      expect(FocusControl.getVpnStatus()).toBe('denied');
    });

    it('calls open settings methods on the native module', () => {
      FocusControl.openUsageAccessSettings();
      expect(ExpoFocusControlModule.openUsageAccessSettings).toHaveBeenCalledTimes(1);

      FocusControl.openAccessibilitySettings();
      expect(ExpoFocusControlModule.openAccessibilitySettings).toHaveBeenCalledTimes(1);

      FocusControl.openOverlaySettings();
      expect(ExpoFocusControlModule.openOverlaySettings).toHaveBeenCalledTimes(1);

      FocusControl.openNotificationSettings();
      expect(ExpoFocusControlModule.openNotificationSettings).toHaveBeenCalledTimes(1);

      FocusControl.openBatterySettings();
      expect(ExpoFocusControlModule.openBatterySettings).toHaveBeenCalledTimes(1);

      FocusControl.openExactAlarmSettings();
      expect(ExpoFocusControlModule.openExactAlarmSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('Usage Stats Queries', () => {
    it('queries usage stats between timestamps', async () => {
      const start = Date.now() - 86400000;
      const end = Date.now();
      const result = await FocusControl.getUsageBetween(start, end, {
        excludeSelf: true,
        limit: 10,
        sortByUsage: true,
      });

      expect(ExpoFocusControlModule.queryUsageStats).toHaveBeenCalledWith(
        start,
        end,
        true,
        10,
        true
      );
      expect(result.records).toHaveLength(2);
      expect(result.records[0].packageName).toBe('com.instagram.android');
      expect(result.records[0].totalTimeInForeground).toBe(3600000);
    });

    it('defaults query options when omitted', async () => {
      const start = 1000;
      const end = 2000;
      await FocusControl.getUsageBetween(start, end);

      expect(ExpoFocusControlModule.queryUsageStats).toHaveBeenCalledWith(
        start,
        end,
        false, // excludeSelf default
        0,     // limit default
        true   // sortByUsage default
      );
    });

    it('queries daily usage for presets', async () => {
      const todayResult = await FocusControl.getDailyUsage('today');
      expect(todayResult.records).toHaveLength(2);

      const yesterdayResult = await FocusControl.getDailyUsage('yesterday');
      expect(yesterdayResult.records).toHaveLength(2);

      const weekResult = await FocusControl.getDailyUsage('week');
      expect(weekResult.records).toHaveLength(2);

      const monthResult = await FocusControl.getDailyUsage('month');
      expect(monthResult.records).toHaveLength(2);
    });
  });

  describe('Platform Info', () => {
    it('returns platform and sdk version', () => {
      const info = FocusControl.getPlatformInfo();
      expect(info).toEqual({
        platform: 'android',
        sdkVersion: 34,
      });
    });
  });
});

