package expo.modules.focuscontrol

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoFocusControlModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("React context is not available")

  private val permissionManager by lazy { PermissionManager(context) }
  private val usageStatsHelper by lazy { UsageStatsManagerHelper(context) }

  override fun definition() = ModuleDefinition {
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

    Function("getPermissionStatuses") {
      permissionManager.getAllStatuses()
    }

    Function("getUsageAccessStatus") {
      permissionManager.getUsageAccessStatus()
    }

    Function("openUsageAccessSettings") {
      permissionManager.openUsageAccessSettings()
    }

    Function("getAccessibilityStatus") {
      permissionManager.getAccessibilityStatus()
    }

    Function("openAccessibilitySettings") {
      permissionManager.openAccessibilitySettings()
    }

    Function("getOverlayPermissionStatus") {
      permissionManager.getOverlayPermissionStatus()
    }

    Function("openOverlaySettings") {
      permissionManager.openOverlaySettings()
    }

    Function("getNotificationPermissionStatus") {
      permissionManager.getNotificationPermissionStatus()
    }

    Function("openNotificationSettings") {
      permissionManager.openNotificationSettings()
    }

    Function("getBatteryOptimizationStatus") {
      permissionManager.getBatteryOptimizationStatus()
    }

    Function("openBatterySettings") {
      permissionManager.openBatterySettings()
    }

    Function("getExactAlarmStatus") {
      permissionManager.getExactAlarmStatus()
    }

    Function("openExactAlarmSettings") {
      permissionManager.openExactAlarmSettings()
    }

    Function("getVpnStatus") {
      permissionManager.getVpnStatus()
    }

    // ── Usage Stats Functions ───────────────────────────────────────────

    AsyncFunction("queryUsageStats") { startTime: Long, endTime: Long, excludeSelf: Boolean, limit: Int, sortByUsage: Boolean ->
      usageStatsHelper.queryUsageStats(startTime, endTime, excludeSelf, limit, sortByUsage)
    }

    // ── Platform Info ───────────────────────────────────────────────────

    Function("getPlatformInfo") {
      mapOf(
        "platform" to "android",
        "sdkVersion" to android.os.Build.VERSION.SDK_INT
      )
    }
  }
}
