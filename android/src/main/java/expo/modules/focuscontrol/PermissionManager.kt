package expo.modules.focuscontrol

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.AlarmManager
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import androidx.core.app.NotificationManagerCompat

/**
 * Centralized permission status checking and settings navigation for all
 * features in the module. Each permission uses the correct Android API
 * for its authorization mechanism.
 */
class PermissionManager(private val context: Context) {

  companion object {
    private const val STATUS_GRANTED = "granted"
    private const val STATUS_DENIED = "denied"
    private const val STATUS_UNAVAILABLE = "unavailable"
  }

  fun getAllStatuses(): Map<String, String> {
    return mapOf(
      "usageAccess" to getUsageAccessStatus(),
      "accessibilityService" to getAccessibilityStatus(),
      "overlayPermission" to getOverlayPermissionStatus(),
      "notificationPermission" to getNotificationPermissionStatus(),
      "vpnPermission" to getVpnStatus(),
      "batteryOptimization" to getBatteryOptimizationStatus(),
      "exactAlarm" to getExactAlarmStatus()
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

  // ── Accessibility Service (AccessibilityManager) ──────────────────────

  fun getAccessibilityStatus(): String {
    return try {
      val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
      val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
      val serviceComponent = ComponentName(context, FocusAccessibilityService::class.java)
      val isEnabled = enabledServices.any {
        ComponentName.unflattenFromString(it.id)?.equals(serviceComponent) == true
      }
      if (isEnabled) STATUS_GRANTED else STATUS_DENIED
    } catch (e: Exception) {
      // If the service class doesn't exist or isn't declared, report as unavailable
      STATUS_DENIED
    }
  }

  fun openAccessibilitySettings() {
    val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
  }

  // ── Overlay Permission (Settings.canDrawOverlays) ─────────────────────

  fun getOverlayPermissionStatus(): String {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      if (Settings.canDrawOverlays(context)) STATUS_GRANTED else STATUS_DENIED
    } else {
      // Pre-Marshmallow: overlay permission not required
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

  // ── Notification Permission (POST_NOTIFICATIONS on Android 13+) ──────

  fun getNotificationPermissionStatus(): String {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val nm = NotificationManagerCompat.from(context)
      if (nm.areNotificationsEnabled()) STATUS_GRANTED else STATUS_DENIED
    } else {
      // Pre-Android 13: notifications enabled by default
      val nm = NotificationManagerCompat.from(context)
      if (nm.areNotificationsEnabled()) STATUS_GRANTED else STATUS_DENIED
    }
  }

  fun openNotificationSettings() {
    val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
        putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
      }
    } else {
      Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
        data = Uri.parse("package:${context.packageName}")
      }
    }
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    context.startActivity(intent)
  }

  // ── Battery Optimization (PowerManager) ───────────────────────────────

  fun getBatteryOptimizationStatus(): String {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      if (pm.isIgnoringBatteryOptimizations(context.packageName)) STATUS_GRANTED else STATUS_DENIED
    } else {
      STATUS_UNAVAILABLE
    }
  }

  fun openBatterySettings() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }
  }

  // ── Exact Alarm (AlarmManager, Android 12+) ──────────────────────────

  fun getExactAlarmStatus(): String {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      if (alarmManager.canScheduleExactAlarms()) STATUS_GRANTED else STATUS_DENIED
    } else {
      // Pre-Android 12: exact alarms always allowed
      STATUS_GRANTED
    }
  }

  fun openExactAlarmSettings() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      try {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          data = Uri.parse("package:${context.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      } catch (e: Exception) {
        // Fallback to app settings if exact alarm settings aren't available
        val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
          data = Uri.parse("package:${context.packageName}")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(intent)
      }
    }
  }

  // ── VPN (not a runtime permission — uses VpnService.prepare()) ────────

  fun getVpnStatus(): String {
    // VPN authorization status cannot be checked without calling prepare(),
    // which shows a system dialog. We report 'denied' as the baseline;
    // actual authorization happens through requestVpnAuthorization().
    return STATUS_DENIED
  }
}
