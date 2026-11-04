import ExpoModulesCore

/**
 * iOS native module for expo-focus-control.
 *
 * Phase 1: Basic permission status reporting and platform info.
 * Phase 4 will add FamilyControls, ManagedSettings, and DeviceActivity integration.
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

    // ── Usage Stats ─────────────────────────────────────────────────────

    AsyncFunction("queryUsageStats") { (startTime: Double, endTime: Double, excludeSelf: Bool, limit: Int, sortByUsage: Bool) -> [String: Any] in
      // iOS does not expose UsageStatsManager-equivalent data.
      // Screen Time APIs (DeviceActivityReport) will be added in Phase 4.
      return [
        "records": [] as [[String: Any]],
        "startTime": startTime,
        "endTime": endTime
      ]
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
    // Synchronous check is not possible for UNUserNotificationCenter;
    // for Phase 1 we report "denied" and will add async check later.
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
