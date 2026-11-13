import ExpoModulesCore

/**
 * iOS native module for expo-focus-control.
 *
 * Provides platform info and permission status reporting.
 * Apple Screen Time Framework integration (FamilyControls, ManagedSettings, DeviceActivity)
 * is coming soon.
 *
 * NOTE: Full Screen Time features require:
 * - Family Controls entitlement (approved by Apple)
 * - App extension targets (DeviceActivityMonitor, ShieldConfiguration, etc.)
 * - These extensions cannot be bundled in this module and must be added
 *   to the consuming app's Xcode project.
 */
public class ExpoFocusControlModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoFocusControl")

    Events(
      "onPermissionChanged",
      "onUsageUpdated",
      "onBlockedAppDetected",
      "onFocusSessionStarted",
      "onFocusSessionCompleted",
      "onProtectionStatusChanged",
      "onVpnStatusChanged"
    )

    // ── Permission Functions ────────────────────────────────────────────

    Function("getPermissionStatuses") { () -> [String: String] in
      return [
        "usageAccess": "unavailable",
        "accessibilityService": "unavailable",
        "overlayPermission": "unavailable",
        "notificationPermission": self.getNotificationStatus(),
        "vpnPermission": "unavailable",
        "batteryOptimization": "unavailable",
        "exactAlarm": "unavailable"
      ]
    }

    Function("getUsageAccessStatus") { () -> String in
      // iOS uses Screen Time APIs, not UsageStatsManager
      return "unavailable"
    }

    Function("openUsageAccessSettings") { () in
      self.openSettings()
    }

    Function("getAccessibilityStatus") { () -> String in
      return "unavailable"
    }

    Function("openAccessibilitySettings") { () in
      self.openSettings()
    }

    Function("getOverlayPermissionStatus") { () -> String in
      return "unavailable"
    }

    Function("openOverlaySettings") { () in
      self.openSettings()
    }

    Function("getNotificationPermissionStatus") { () -> String in
      return self.getNotificationStatus()
    }

    Function("openNotificationSettings") { () in
      self.openSettings()
    }

    Function("getBatteryOptimizationStatus") { () -> String in
      return "unavailable"
    }

    Function("openBatterySettings") { () in
      self.openSettings()
    }

    Function("getExactAlarmStatus") { () -> String in
      return "unavailable"
    }

    Function("openExactAlarmSettings") { () in
      self.openSettings()
    }

    Function("getVpnStatus") { () -> String in
      return "unavailable"
    }

    Function("requestVpnPermission") { () -> Bool in
      return false
    }

    // ── Focus Session APIs ──────────────────────────────────────────────

    Function("startFocusSession") { (durationSeconds: Double, sessionName: String?, enableAppBlocking: Bool?) -> [String: Any] in
      return [
        "isActive": false,
        "isPaused": false,
        "sessionName": sessionName ?? "Focus Session",
        "durationSeconds": durationSeconds,
        "remainingSeconds": durationSeconds,
        "elapsedSeconds": 0,
        "autoAppBlocking": enableAppBlocking ?? true
      ]
    }

    Function("stopFocusSession") { () -> [String: Any] in
      return [
        "isActive": false,
        "isPaused": false,
        "sessionName": "Focus Session",
        "durationSeconds": 0,
        "remainingSeconds": 0,
        "elapsedSeconds": 0,
        "autoAppBlocking": true
      ]
    }

    Function("pauseFocusSession") { () -> [String: Any] in
      return [
        "isActive": false,
        "isPaused": false,
        "sessionName": "Focus Session",
        "durationSeconds": 0,
        "remainingSeconds": 0,
        "elapsedSeconds": 0,
        "autoAppBlocking": true
      ]
    }

    Function("resumeFocusSession") { () -> [String: Any] in
      return [
        "isActive": false,
        "isPaused": false,
        "sessionName": "Focus Session",
        "durationSeconds": 0,
        "remainingSeconds": 0,
        "elapsedSeconds": 0,
        "autoAppBlocking": true
      ]
    }

    Function("getFocusSessionStatus") { () -> [String: Any] in
      return [
        "isActive": false,
        "isPaused": false,
        "sessionName": "Focus Session",
        "durationSeconds": 0,
        "remainingSeconds": 0,
        "elapsedSeconds": 0,
        "autoAppBlocking": true
      ]
    }

    // ── Website Blocking APIs ───────────────────────────────────────────

    Function("setBlockedWebsites") { (domains: [String]) in
    }

    Function("getBlockedWebsites") { () -> [String] in
      return []
    }

    Function("startWebsiteBlocking") { () -> Bool in
      return false
    }

    Function("stopWebsiteBlocking") { () in
    }

    Function("getWebsiteBlockingStatus") { () -> [String: Any] in
      return [
        "isActive": false,
        "blockedWebsites": [] as [String],
        "vpnServiceRunning": false
      ]
    }

    // ── Usage Stats ─────────────────────────────────────────────────────

    AsyncFunction("queryUsageStats") { (startTime: Double, endTime: Double, excludeSelf: Bool, limit: Int, sortByUsage: Bool) -> [String: Any] in
      // iOS does not expose UsageStatsManager-equivalent data.
      // Screen Time APIs (DeviceActivityReport) are coming soon.
      return [
        "records": [] as [[String: Any]],
        "startTime": startTime,
        "endTime": endTime
      ]
    }

    AsyncFunction("getInstalledApplications") { (includeSystemApps: Bool) -> [[String: Any]] in
      // iOS sandboxing prevents querying other third-party installed apps.
      // Screen Time FamilyActivityPicker support is coming soon.
      return []
    }

    // ── Platform Info ───────────────────────────────────────────────────

    Function("getPlatformInfo") { () -> [String: Any] in
      let version = ProcessInfo.processInfo.operatingSystemVersion
      return [
        "platform": "ios",
        "sdkVersion": version.majorVersion
      ]
    }
  }

  // MARK: - Private Helpers

  private func getNotificationStatus() -> String {
    return "denied"
  }

  private func openSettings() {
    DispatchQueue.main.async {
      if let url = URL(string: UIApplication.openSettingsURLString) {
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
      }
    }
  }
}
