package expo.modules.focuscontrol

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.ActivityManager
import android.app.AlarmManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.net.VpnService
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.view.accessibility.AccessibilityManager

/**
 * Centralized permission status checking, battery diagnostics, and settings
 * navigation for all features in the module. Each permission uses the correct
 * Android API for its authorization mechanism.
 *
 * NOTE: Application notification permissions are managed independently by the
 * consuming app via expo-notifications and are NOT handled by this module.
 */
class PermissionManager(private val context: Context) {

  companion object {
    private const val STATUS_GRANTED = "granted"
    private const val STATUS_DENIED = "denied"
    private const val STATUS_UNAVAILABLE = "unavailable"
  }

  fun getAllStatuses(): Map<String, Any> {
    return mapOf(
      "usageAccess" to getUsageAccessStatus(),
      "accessibilityService" to getAccessibilityStatus(),
      "overlayPermission" to getOverlayPermissionStatus(),
      "vpnPermission" to getVpnStatus(),
      "batteryOptimization" to getBatteryOptimizationStatus(),
      "exactAlarm" to getExactAlarmStatus(),
      "batteryDiagnostics" to getBatteryDiagnostics()
    )
  }

  // ── Usage Access (AppOpsManager) ──────────────────────────────────────

  fun getUsageAccessStatus(): String {
    return try {
      val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        @Suppress("DEPRECATION")
        appOps.unsafeCheckOpNoThrow(
          android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          context.packageName
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          context.packageName
        )
      }
      if (mode == android.app.AppOpsManager.MODE_ALLOWED) STATUS_GRANTED else STATUS_DENIED
    } catch (e: Exception) {
      STATUS_UNAVAILABLE
    }
  }

  fun openUsageAccessSettings() {
    val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
  }

  // ── Accessibility Service (AccessibilityManager & Lifecycle) ──────────

  /**
   * Evaluates accessibility status across 5 distinct states:
   * - NOT_DECLARED: The service is not declared in the Android manifest.
   * - DISABLED: Declared in manifest, but user has not toggled it on in Settings.
   * - ENABLED: Enabled in system settings, but not yet connected or bound.
   * - CONNECTED: The service is actively bound and onServiceConnected() has fired.
   * - UNAVAILABLE: System error or API failure.
   */
  fun getAccessibilityStatus(): String {
    return try {
      val serviceComponent = ComponentName(context, FocusAccessibilityService::class.java)

      // Step 1: Check if the service is declared in the app's package
      val isDeclared = try {
        val serviceInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          context.packageManager.getServiceInfo(
            serviceComponent,
            PackageManager.ComponentInfoFlags.of(PackageManager.GET_META_DATA.toLong())
          )
        } else {
          @Suppress("DEPRECATION")
          context.packageManager.getServiceInfo(serviceComponent, PackageManager.GET_META_DATA)
        }
        serviceInfo != null
      } catch (e: PackageManager.NameNotFoundException) {
        false
      }

      if (!isDeclared) {
        return "NOT_DECLARED"
      }

      // Step 2: Check live active connection (service process bound and alive)
      if (FocusAccessibilityService.isConnected) {
        return "CONNECTED"
      }

      // Step 3: Check if enabled in AccessibilityManager settings
      val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
      if (am == null) {
        return STATUS_UNAVAILABLE
      }

      val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
      val isEnabledInSettings = enabledServices.any {
        it.id.startsWith("${context.packageName}/") && it.id.contains("FocusAccessibilityService")
      }

      if (isEnabledInSettings) {
        "ENABLED"
      } else {
        "DISABLED"
      }
    } catch (e: Exception) {
      STATUS_UNAVAILABLE
    }
  }

  fun openAccessibilitySettings() {
    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
  }

  // ── Overlay Permission (SYSTEM_ALERT_WINDOW) ──────────────────────────

  fun getOverlayPermissionStatus(): String {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      if (Settings.canDrawOverlays(context)) STATUS_GRANTED else STATUS_DENIED
    } else {
      STATUS_GRANTED
    }
  }

  fun openOverlaySettings() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${context.packageName}")
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }
  }

  // ── Battery Diagnostics & Optimization ────────────────────────────────

  /**
   * Diagnostic report separating Doze exemption, background restrictions,
   * and battery saver status without inferring "Unrestricted" mode.
   */
  fun getBatteryDiagnostics(): Map<String, Any> {
    val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
    val dozeExempt = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && pm != null) {
      pm.isIgnoringBatteryOptimizations(context.packageName)
    } else {
      false
    }

    val backgroundRestricted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
      val am = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
      am?.isBackgroundRestricted ?: false
    } else {
      false
    }

    val batterySaverEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && pm != null) {
      pm.isPowerSaveMode
    } else {
      false
    }

    val overallReadiness = when {
      backgroundRestricted -> "RESTRICTED"
      batterySaverEnabled && !dozeExempt -> "DEGRADED"
      dozeExempt -> "READY"
      else -> "OPTIMIZED"
    }

    return mapOf(
      "dozeExempt" to dozeExempt,
      "backgroundRestricted" to backgroundRestricted,
      "batterySaverEnabled" to batterySaverEnabled,
      "oemBatteryManagement" to "UNKNOWN",
      "overallBackgroundReadiness" to overallReadiness
    )
  }

  fun getBatteryOptimizationStatus(): String {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
      if (pm?.isIgnoringBatteryOptimizations(context.packageName) == true) STATUS_GRANTED else STATUS_DENIED
    } else {
      STATUS_UNAVAILABLE
    }
  }

  /**
   * Universal navigation fallback to the app's App Info page.
   * Gives direct access to Battery details and Android 13+ Restricted Settings.
   */
  fun openBatterySettings() {
    val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
      data = Uri.parse("package:${context.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
  }

  /**
   * Best-effort OEM autostart navigation with safe standard fallback.
   */
  fun openOemBatterySettings() {
    val oemIntents = listOf(
      // Xiaomi / HyperOS / MIUI
      Intent().setComponent(ComponentName("com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity")),
      // Huawei / Honor
      Intent().setComponent(ComponentName("com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity")),
      // Oppo / Realme
      Intent().setComponent(ComponentName("com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity")),
      // Vivo
      Intent().setComponent(ComponentName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.PurviewTabActivity")),
      // Samsung
      Intent().setComponent(ComponentName("com.samsung.android.lool", "com.samsung.android.sm.battery.ui.BatteryActivity"))
    )

    for (intent in oemIntents) {
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      if (intent.resolveActivity(context.packageManager) != null) {
        try {
          context.startActivity(intent)
          return
        } catch (e: Exception) {
          // Fall through to next intent
        }
      }
    }

    // Universal fallback
    openBatterySettings()
  }

  // ── Exact Alarms (AlarmManager) ───────────────────────────────────────

  fun getExactAlarmStatus(): String {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      if (alarmManager.canScheduleExactAlarms()) STATUS_GRANTED else STATUS_DENIED
    } else {
      STATUS_GRANTED
    }
  }

  fun openExactAlarmSettings() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val intent = Intent(
        Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
        Uri.parse("package:${context.packageName}")
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }
  }

  // ── VPN Permission (VpnService) ───────────────────────────────────────

  fun getVpnStatus(): String {
    return try {
      if (VpnService.prepare(context) == null) {
        STATUS_GRANTED
      } else {
        STATUS_DENIED
      }
    } catch (e: Exception) {
      STATUS_UNAVAILABLE
    }
  }

  fun requestVpnPermission(): Boolean {
    val prepareIntent = VpnService.prepare(context)
    if (prepareIntent != null) {
      prepareIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(prepareIntent)
      return false
    }
    return true
  }
}
