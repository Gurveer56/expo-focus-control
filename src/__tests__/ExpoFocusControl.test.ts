import * as FocusControl from '../index';
import ExpoFocusControlModule from '../ExpoFocusControlModule';

// Mock the native module
jest.mock('../ExpoFocusControlModule', () => ({
  __esModule: true,
  default: {
    getPermissionStatuses: jest.fn(() => ({
      usageAccess: 'granted',
      accessibilityService: 'DISABLED',
      overlayPermission: 'denied',
      vpnPermission: 'denied',
      batteryOptimization: 'unavailable',
      exactAlarm: 'granted',
      batteryDiagnostics: {
        dozeExempt: false,
        backgroundRestricted: false,
        batterySaverEnabled: false,
        oemBatteryManagement: 'UNKNOWN',
        overallBackgroundReadiness: 'OPTIMIZED',
      },
    })),
    getUsageAccessStatus: jest.fn(() => 'granted'),
    openUsageAccessSettings: jest.fn(),
    getAccessibilityStatus: jest.fn(() => 'DISABLED'),
    openAccessibilitySettings: jest.fn(),
    getOverlayPermissionStatus: jest.fn(() => 'denied'),
    openOverlaySettings: jest.fn(),
    getBatteryOptimizationStatus: jest.fn(() => 'unavailable'),
    getBatteryDiagnostics: jest.fn(() => ({
      dozeExempt: false,
      backgroundRestricted: false,
      batterySaverEnabled: false,
      oemBatteryManagement: 'UNKNOWN',
      overallBackgroundReadiness: 'OPTIMIZED',
    })),
    openBatterySettings: jest.fn(),
    openOemBatterySettings: jest.fn(),
    getExactAlarmStatus: jest.fn(() => 'granted'),
    openExactAlarmSettings: jest.fn(),
    getVpnStatus: jest.fn(() => 'denied'),
    requestVpnPermission: jest.fn(() => true),
    // App Blocking mocks
    setBlockedApplications: jest.fn(),
    startAppBlocking: jest.fn(),
    stopAppBlocking: jest.fn(),
    getAppBlockingStatus: jest.fn(() => ({
      isBlockingActive: true,
      blockedApplications: ['com.instagram.android'],
      overlayShowing: false,
    })),
    getInstalledApplications: jest.fn(async (_includeSystemApps: boolean) => [
      { packageName: 'com.instagram.android', appName: 'Instagram', isSystemApp: false },
      { packageName: 'com.google.android.youtube', appName: 'YouTube', isSystemApp: false },
    ]),
    // Focus Session mocks
    startFocusSession: jest.fn((durationSeconds: number, sessionName?: string, enableAppBlocking?: boolean) => ({
      isActive: true,
      isPaused: false,
      sessionName: sessionName ?? 'Focus Session',
      durationSeconds,
      remainingSeconds: durationSeconds,
      elapsedSeconds: 0,
      autoAppBlocking: enableAppBlocking ?? true,
    })),
    stopFocusSession: jest.fn(() => ({
      isActive: false,
      isPaused: false,
      sessionName: 'Focus Session',
      durationSeconds: 0,
      remainingSeconds: 0,
      elapsedSeconds: 0,
      autoAppBlocking: true,
    })),
    pauseFocusSession: jest.fn(() => ({
      isActive: true,
      isPaused: true,
      sessionName: 'Focus Session',
      durationSeconds: 1500,
      remainingSeconds: 1200,
      elapsedSeconds: 300,
      autoAppBlocking: true,
    })),
    resumeFocusSession: jest.fn(() => ({
      isActive: true,
      isPaused: false,
      sessionName: 'Focus Session',
      durationSeconds: 1500,
      remainingSeconds: 1200,
      elapsedSeconds: 300,
      autoAppBlocking: true,
    })),
    getFocusSessionStatus: jest.fn(() => ({
      isActive: true,
      isPaused: false,
      sessionName: 'Deep Work',
      durationSeconds: 1500,
      remainingSeconds: 1000,
      elapsedSeconds: 500,
      autoAppBlocking: true,
    })),
    // Website Blocking mocks
    setBlockedWebsites: jest.fn(),
    getBlockedWebsites: jest.fn(() => ['instagram.com', 'tiktok.com']),
    startWebsiteBlocking: jest.fn(() => true),
    stopWebsiteBlocking: jest.fn(),
    getWebsiteBlockingStatus: jest.fn(() => ({
      isActive: true,
      blockedWebsites: ['instagram.com', 'tiktok.com'],
      vpnServiceRunning: true,
    })),
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
    setOverlayConfig: jest.fn(),
    getOverlayConfig: jest.fn(() => ({
      title: 'Focus Mode Active',
      message: 'This app is blocked.',
      iconEmoji: '🛡️',
      cardAlignment: 'center',
    })),
    resetOverlayConfig: jest.fn(),
    setOverlayLayout: jest.fn(),
    getOverlayLayout: jest.fn(() => JSON.stringify({
      backgroundColor: '#0D1117',
      blocks: [
        { type: 'text', text: 'Custom Layout Active' },
        { type: 'button', text: 'Close', action: 'close' }
      ]
    })),
    resetOverlayLayout: jest.fn(),
    // Emergency Pass mocks
    setEmergencyPassConfig: jest.fn(),
    getEmergencyPassConfig: jest.fn(() => ({
      enabled: true,
      durationMinutes: 5,
      dailyLimit: 3,
      cooldownMinutes: 10,
      showButtonOnOverlay: true,
      buttonText: 'Emergency Access',
    })),
    resetEmergencyPassConfig: jest.fn(),
    getEmergencyPassStatus: jest.fn((pkg?: string) => ({
      enabled: true,
      dailyLimit: 3,
      remainingPasses: 2,
      usedPassesToday: 1,
      durationMinutes: 5,
      isPassActive: pkg === 'com.instagram.android',
      activePackage: pkg === 'com.instagram.android' ? 'com.instagram.android' : null,
      expiresAt: pkg === 'com.instagram.android' ? Date.now() + 300000 : null,
      remainingSeconds: pkg === 'com.instagram.android' ? 300 : 0,
      isInCooldown: false,
      cooldownUntil: null,
      cooldownRemainingSeconds: 0,
    })),
    activateEmergencyPass: jest.fn((pkg?: string, minutes?: number) => ({
      success: true,
      remainingPasses: 1,
      durationMinutes: minutes ?? 5,
      expiresAt: Date.now() + (minutes ?? 5) * 60000,
      activePackage: pkg ?? null,
    })),
    cancelEmergencyPass: jest.fn(),
    resetEmergencyPasses: jest.fn(),
    grantEmergencyPasses: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

describe('ExpoFocusControl Public API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permission Statuses', () => {
    it('returns all permission statuses as typed object without notification permission', () => {
      const statuses = FocusControl.getPermissionStatuses();
      expect(statuses).toEqual({
        usageAccess: 'granted',
        accessibilityService: 'DISABLED',
        overlayPermission: 'denied',
        vpnPermission: 'denied',
        batteryOptimization: 'unavailable',
        exactAlarm: 'granted',
        batteryDiagnostics: {
          dozeExempt: false,
          backgroundRestricted: false,
          batterySaverEnabled: false,
          oemBatteryManagement: 'UNKNOWN',
          overallBackgroundReadiness: 'OPTIMIZED',
        },
      });
      expect((statuses as any).notificationPermission).toBeUndefined();
      expect(ExpoFocusControlModule.getPermissionStatuses).toHaveBeenCalledTimes(1);
    });

    it('queries individual permission statuses', () => {
      expect(FocusControl.getUsageAccessStatus()).toBe('granted');
      expect(FocusControl.getAccessibilityStatus()).toBe('DISABLED');
      expect(FocusControl.getOverlayPermissionStatus()).toBe('denied');
      expect(FocusControl.getBatteryOptimizationStatus()).toBe('unavailable');
      expect(FocusControl.getExactAlarmStatus()).toBe('granted');
      expect(FocusControl.getVpnStatus()).toBe('denied');
    });

    it('queries battery diagnostics', () => {
      const diagnostics = FocusControl.getBatteryDiagnostics();
      expect(diagnostics).toEqual({
        dozeExempt: false,
        backgroundRestricted: false,
        batterySaverEnabled: false,
        oemBatteryManagement: 'UNKNOWN',
        overallBackgroundReadiness: 'OPTIMIZED',
      });
      expect(ExpoFocusControlModule.getBatteryDiagnostics).toHaveBeenCalledTimes(1);
    });

    it('calls open settings methods on the native module', () => {
      FocusControl.openUsageAccessSettings();
      expect(ExpoFocusControlModule.openUsageAccessSettings).toHaveBeenCalledTimes(1);

      FocusControl.openAccessibilitySettings();
      expect(ExpoFocusControlModule.openAccessibilitySettings).toHaveBeenCalledTimes(1);

      FocusControl.openOverlaySettings();
      expect(ExpoFocusControlModule.openOverlaySettings).toHaveBeenCalledTimes(1);

      FocusControl.openBatterySettings();
      expect(ExpoFocusControlModule.openBatterySettings).toHaveBeenCalledTimes(1);

      FocusControl.openOemBatterySettings();
      expect(ExpoFocusControlModule.openOemBatterySettings).toHaveBeenCalledTimes(1);

      FocusControl.openExactAlarmSettings();
      expect(ExpoFocusControlModule.openExactAlarmSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('App Blocking API', () => {
    it('configures blocked applications', () => {
      const packages = ['com.instagram.android', 'com.google.android.youtube'];
      FocusControl.setBlockedApplications(packages);
      expect(ExpoFocusControlModule.setBlockedApplications).toHaveBeenCalledWith(packages);
    });

    it('starts and stops application blocking', () => {
      FocusControl.startAppBlocking();
      expect(ExpoFocusControlModule.startAppBlocking).toHaveBeenCalledTimes(1);

      FocusControl.stopAppBlocking();
      expect(ExpoFocusControlModule.stopAppBlocking).toHaveBeenCalledTimes(1);
    });

    it('retrieves app blocking status', () => {
      const status = FocusControl.getAppBlockingStatus();
      expect(status).toEqual({
        isBlockingActive: true,
        blockedApplications: ['com.instagram.android'],
        overlayShowing: false,
      });
      expect(ExpoFocusControlModule.getAppBlockingStatus).toHaveBeenCalledTimes(1);
    });

    it('retrieves installed applications', async () => {
      const apps = await FocusControl.getInstalledApplications();
      expect(ExpoFocusControlModule.getInstalledApplications).toHaveBeenCalledWith(false);
      expect(apps).toHaveLength(2);
      expect(apps[0].appName).toBe('Instagram');

      await FocusControl.getInstalledApplications({ includeSystemApps: true });
      expect(ExpoFocusControlModule.getInstalledApplications).toHaveBeenCalledWith(true);
    });
  });

  describe('Focus Session API', () => {
    it('starts a focus session with custom options', () => {
      const session = FocusControl.startFocusSession(1500, {
        sessionName: 'Pomodoro',
        enableAppBlocking: true,
      });

      expect(ExpoFocusControlModule.startFocusSession).toHaveBeenCalledWith(1500, 'Pomodoro', true);
      expect(session.isActive).toBe(true);
      expect(session.sessionName).toBe('Pomodoro');
      expect(session.durationSeconds).toBe(1500);
    });

    it('pauses, resumes, and stops a focus session', () => {
      const paused = FocusControl.pauseFocusSession();
      expect(ExpoFocusControlModule.pauseFocusSession).toHaveBeenCalled();
      expect(paused.isPaused).toBe(true);

      const resumed = FocusControl.resumeFocusSession();
      expect(ExpoFocusControlModule.resumeFocusSession).toHaveBeenCalled();
      expect(resumed.isPaused).toBe(false);

      const stopped = FocusControl.stopFocusSession();
      expect(ExpoFocusControlModule.stopFocusSession).toHaveBeenCalled();
      expect(stopped.isActive).toBe(false);
    });

    it('gets live focus session status', () => {
      const status = FocusControl.getFocusSessionStatus();
      expect(ExpoFocusControlModule.getFocusSessionStatus).toHaveBeenCalled();
      expect(status.isActive).toBe(true);
      expect(status.sessionName).toBe('Deep Work');
      expect(status.remainingSeconds).toBe(1000);
    });
  });

  describe('Website Blocking API', () => {
    it('configures and gets blocked websites', () => {
      FocusControl.setBlockedWebsites(['instagram.com', 'tiktok.com']);
      expect(ExpoFocusControlModule.setBlockedWebsites).toHaveBeenCalledWith(['instagram.com', 'tiktok.com']);

      const sites = FocusControl.getBlockedWebsites();
      expect(ExpoFocusControlModule.getBlockedWebsites).toHaveBeenCalled();
      expect(sites).toEqual(['instagram.com', 'tiktok.com']);
    });

    it('starts and stops website blocking', () => {
      const started = FocusControl.startWebsiteBlocking();
      expect(ExpoFocusControlModule.startWebsiteBlocking).toHaveBeenCalled();
      expect(started).toBe(true);

      FocusControl.stopWebsiteBlocking();
      expect(ExpoFocusControlModule.stopWebsiteBlocking).toHaveBeenCalled();
    });

    it('gets website blocking status and requests VPN permission', () => {
      const status = FocusControl.getWebsiteBlockingStatus();
      expect(ExpoFocusControlModule.getWebsiteBlockingStatus).toHaveBeenCalled();
      expect(status.isActive).toBe(true);
      expect(status.vpnServiceRunning).toBe(true);

      const granted = FocusControl.requestVpnPermission();
      expect(ExpoFocusControlModule.requestVpnPermission).toHaveBeenCalled();
      expect(granted).toBe(true);
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

  describe('Overlay UI Customization', () => {
    it('sets overlay configuration', () => {
      const customConfig: FocusControl.OverlayConfig = {
        title: 'Deep Work In Progress',
        message: 'Stay focused on your goals!',
        iconEmoji: '🚀',
        customIconUri: 'file:///path/to/custom_icon.png',
        titleColor: '#FF5722',
        titleSize: 26,
        cardAlignment: 'center',
        primaryButtonText: 'Return to Work',
        showSecondaryButton: false,
      };

      FocusControl.setOverlayConfig(customConfig);
      expect(ExpoFocusControlModule.setOverlayConfig).toHaveBeenCalledWith(customConfig);
    });

    it('gets current overlay configuration', () => {
      const config = FocusControl.getOverlayConfig();
      expect(ExpoFocusControlModule.getOverlayConfig).toHaveBeenCalled();
      expect(config.title).toBe('Focus Mode Active');
      expect(config.iconEmoji).toBe('🛡️');
      expect(config.cardAlignment).toBe('center');
    });

    it('resets overlay configuration', () => {
      FocusControl.resetOverlayConfig();
      expect(ExpoFocusControlModule.resetOverlayConfig).toHaveBeenCalled();
    });
  });

  describe('Block-Based Overlay Layout API', () => {
    it('sets block-based overlay layout object', () => {
      const layout: FocusControl.OverlayLayoutConfig = {
        backgroundColor: '#0D1117',
        blocks: [
          { type: 'icon', emoji: '⏳', containerSize: 96, containerColor: '#3B1824' },
          { type: 'text', text: 'You’ve hit your limit', fontSize: 24, fontWeight: 'bold' },
          { type: 'text', text: "You've used {appName} for 30 minutes.", color: '#94A3B8' },
          { type: 'spacer', flex: 1 },
          { type: 'button', text: 'Close app', action: 'close', backgroundColor: '#D4FF32', textColor: '#000000' },
          { type: 'button', text: 'Emergency use ({durationMinutes}m)', action: 'emergency' },
          { type: 'text', text: '{remainingPasses} left today', fontSize: 12 },
        ],
      };

      FocusControl.setOverlayLayout(layout);
      expect(ExpoFocusControlModule.setOverlayLayout).toHaveBeenCalledWith(JSON.stringify(layout));
    });

    it('sets block-based overlay layout from raw JSON string', () => {
      const jsonStr = '{"backgroundColor":"#000000","blocks":[]}';
      FocusControl.setOverlayLayout(jsonStr);
      expect(ExpoFocusControlModule.setOverlayLayout).toHaveBeenCalledWith(jsonStr);
    });

    it('gets current block-based overlay layout', () => {
      const layout = FocusControl.getOverlayLayout();
      expect(ExpoFocusControlModule.getOverlayLayout).toHaveBeenCalled();
      expect(layout).not.toBeNull();
      expect(layout?.backgroundColor).toBe('#0D1117');
      expect(layout?.blocks).toHaveLength(2);
    });

    it('resets block-based overlay layout', () => {
      FocusControl.resetOverlayLayout();
      expect(ExpoFocusControlModule.resetOverlayLayout).toHaveBeenCalled();
    });
  });

  describe('Emergency Pass API', () => {
    it('sets emergency pass configuration', () => {
      const config: FocusControl.EmergencyPassConfig = {
        enabled: true,
        durationMinutes: 10,
        dailyLimit: 5,
        cooldownMinutes: 15,
        showButtonOnOverlay: true,
        buttonText: 'Emergency Unlock',
      };

      FocusControl.setEmergencyPassConfig(config);
      expect(ExpoFocusControlModule.setEmergencyPassConfig).toHaveBeenCalledWith(config);
    });

    it('gets current emergency pass configuration', () => {
      const config = FocusControl.getEmergencyPassConfig();
      expect(ExpoFocusControlModule.getEmergencyPassConfig).toHaveBeenCalled();
      expect(config.enabled).toBe(true);
      expect(config.durationMinutes).toBe(5);
      expect(config.dailyLimit).toBe(3);
    });

    it('resets emergency pass configuration', () => {
      FocusControl.resetEmergencyPassConfig();
      expect(ExpoFocusControlModule.resetEmergencyPassConfig).toHaveBeenCalled();
    });

    it('queries emergency pass status', () => {
      const status = FocusControl.getEmergencyPassStatus('com.instagram.android');
      expect(ExpoFocusControlModule.getEmergencyPassStatus).toHaveBeenCalledWith('com.instagram.android');
      expect(status.enabled).toBe(true);
      expect(status.remainingPasses).toBe(2);
      expect(status.isPassActive).toBe(true);
      expect(status.activePackage).toBe('com.instagram.android');
    });

    it('activates emergency pass programmatically', () => {
      const result = FocusControl.activateEmergencyPass('com.instagram.android', 8);
      expect(ExpoFocusControlModule.activateEmergencyPass).toHaveBeenCalledWith('com.instagram.android', 8);
      expect(result.success).toBe(true);
      expect(result.remainingPasses).toBe(1);
      expect(result.durationMinutes).toBe(8);
    });

    it('cancels emergency pass early', () => {
      FocusControl.cancelEmergencyPass();
      expect(ExpoFocusControlModule.cancelEmergencyPass).toHaveBeenCalled();
    });

    it('resets emergency passes to daily limit', () => {
      FocusControl.resetEmergencyPasses();
      expect(ExpoFocusControlModule.resetEmergencyPasses).toHaveBeenCalled();
    });

    it('grants bonus emergency passes', () => {
      FocusControl.grantEmergencyPasses(2);
      expect(ExpoFocusControlModule.grantEmergencyPasses).toHaveBeenCalledWith(2);
    });
  });
});
