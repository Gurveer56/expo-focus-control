package expo.modules.focuscontrol

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
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

    Function("getBatteryOptimizationStatus") {
      permissionManager.getBatteryOptimizationStatus()
    }

    Function("getBatteryDiagnostics") {
      permissionManager.getBatteryDiagnostics()
    }

    Function("openBatterySettings") {
      permissionManager.openBatterySettings()
    }

    Function("openOemBatterySettings") {
      permissionManager.openOemBatterySettings()
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

    Function("requestVpnPermission") {
      permissionManager.requestVpnPermission()
    }

    // ── App Blocking APIs ──────────────────────────────────────────────

    Function("setBlockedApplications") { packages: List<String> ->
      FocusBlockingManager.setBlockedApplications(context, packages)
    }

    Function("startAppBlocking") {
      FocusBlockingManager.startAppBlocking(context)
    }

    Function("stopAppBlocking") {
      FocusBlockingManager.stopAppBlocking(context)
    }

    Function("getAppBlockingStatus") {
      mapOf(
        "isBlockingActive" to FocusBlockingManager.isAppBlockingActive(context),
        "blockedApplications" to FocusBlockingManager.getBlockedApplications(context),
        "overlayShowing" to FocusOverlayManager.isOverlayShowing()
      )
    }

    Function("setOverlayConfig") { config: Map<String, Any?> ->
      OverlayConfig.save(context, config)
    }

    Function("getOverlayConfig") {
      OverlayConfig.load(context).toMap()
    }

    Function("resetOverlayConfig") {
      OverlayConfig.reset(context)
    }

    Function("setOverlayLayout") { layoutJson: String ->
      OverlayLayoutConfig.save(context, layoutJson)
    }

    Function("getOverlayLayout") {
      OverlayLayoutConfig.load(context)
    }

    Function("resetOverlayLayout") {
      OverlayLayoutConfig.reset(context)
    }

    // ── Emergency Pass / Grace Period APIs ──────────────────────────────

    Function("setEmergencyPassConfig") { config: Map<String, Any?> ->
      EmergencyPassConfig.save(context, config)
    }

    Function("getEmergencyPassConfig") {
      EmergencyPassConfig.load(context).toMap()
    }

    Function("resetEmergencyPassConfig") {
      EmergencyPassConfig.reset(context)
    }

    Function("getEmergencyPassStatus") { packageName: String? ->
      EmergencyPassManager.getStatus(context, packageName)
    }

    Function("activateEmergencyPass") { packageName: String?, customMinutes: Int? ->
      EmergencyPassManager.activateEmergencyPass(context, packageName, customMinutes)
    }

    Function("cancelEmergencyPass") {
      EmergencyPassManager.cancelEmergencyPass(context)
    }

    Function("resetEmergencyPasses") {
      EmergencyPassManager.resetEmergencyPasses(context)
    }

    Function("grantEmergencyPasses") { count: Int ->
      EmergencyPassManager.grantEmergencyPasses(context, count)
    }

    // ── Focus Session & Website Blocking APIs ──────────────────────────

    Function("startFocusSession") { durationSeconds: Long, sessionName: String?, enableAppBlocking: Boolean? ->
      FocusSessionManager.startFocusSession(
        context,
        durationSeconds,
        sessionName,
        enableAppBlocking ?: true
      )
    }

    Function("stopFocusSession") {
      FocusSessionManager.stopFocusSession(context)
    }

    Function("pauseFocusSession") {
      FocusSessionManager.pauseFocusSession(context)
    }

    Function("resumeFocusSession") {
      FocusSessionManager.resumeFocusSession(context)
    }

    Function("getFocusSessionStatus") {
      FocusSessionManager.getFocusSessionStatus(context)
    }

    Function("setBlockedWebsites") { domains: List<String> ->
      FocusVpnManager.setBlockedWebsites(context, domains)
    }

    Function("getBlockedWebsites") {
      FocusVpnManager.getBlockedWebsites(context)
    }

    Function("startWebsiteBlocking") {
      FocusVpnManager.startWebsiteBlocking(context)
    }

    Function("stopWebsiteBlocking") {
      FocusVpnManager.stopWebsiteBlocking(context)
    }

    Function("getWebsiteBlockingStatus") {
      FocusVpnManager.getWebsiteBlockingStatus(context)
    }

    AsyncFunction("getInstalledApplications") { includeSystemApps: Boolean ->
      val pm = context.packageManager
      val launcherIntent = Intent(Intent.ACTION_MAIN).apply {
        addCategory(Intent.CATEGORY_LAUNCHER)
      }

      val resolveInfos = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        pm.queryIntentActivities(launcherIntent, PackageManager.ResolveInfoFlags.of(0))
      } else {
        @Suppress("DEPRECATION")
        pm.queryIntentActivities(launcherIntent, 0)
      }

      val seenPackages = mutableSetOf<String>()
      val appList = mutableListOf<Map<String, Any>>()
      val myPackageName = context.packageName

      for (resolveInfo in resolveInfos) {
        val appInfo = resolveInfo.activityInfo?.applicationInfo ?: continue
        val packageName = appInfo.packageName ?: continue

        // Skip self
        if (packageName == myPackageName) continue

        // Skip duplicates
        if (seenPackages.contains(packageName)) continue
        seenPackages.add(packageName)

        val isSystemApp = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0

        // If includeSystemApps is false, exclude system apps unless updated by user
        if (!includeSystemApps && isSystemApp) {
          val isUpdatedSystemApp = (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0
          if (!isUpdatedSystemApp) continue
        }

        val appName = try {
          pm.getApplicationLabel(appInfo).toString()
        } catch (e: Exception) {
          packageName
        }

        appList.add(
          mapOf(
            "packageName" to packageName,
            "appName" to appName,
            "isSystemApp" to isSystemApp
          )
        )
      }

      appList.sortedBy { (it["appName"] as? String)?.lowercase() ?: "" }
    }

    // ── Usage Stats Functions ───────────────────────────────────────────

    AsyncFunction("queryUsageStats") { startTime: Long, endTime: Long, excludeSelf: Boolean, limit: Int, sortByUsage: Boolean ->
      usageStatsHelper.queryUsageStats(startTime, endTime, excludeSelf, limit, sortByUsage)
    }

    // ── Platform Info ───────────────────────────────────────────────────

    Function("getPlatformInfo") {
      mapOf(
        "platform" to "android",
        "sdkVersion" to Build.VERSION.SDK_INT
      )
    }
  }
}
