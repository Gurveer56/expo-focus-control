package expo.modules.focuscontrol

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.util.Log

/**
 * Thread-safe singleton managing active focus session blocking rules,
 * blocked package names, persistence, and system exemption logic.
 */
object FocusBlockingManager {
  private const val TAG = "FocusBlocking"
  private const val PREFS_NAME = "expo_focus_control_blocking_prefs"
  private const val KEY_IS_BLOCKING_ACTIVE = "is_blocking_active"
  private const val KEY_BLOCKED_PACKAGES = "blocked_packages"

  private val systemExemptPackages = setOf(
    "com.android.settings",
    "com.android.systemui",
    "com.google.android.dialer",
    "com.android.dialer",
    "com.android.phone",
    "com.android.server.telecom",
    "com.android.emergency",
    "com.miui.securitycenter",
    "com.miui.securitycore"
  )

  @Volatile
  private var isBlockingActiveCached: Boolean = false

  @Volatile
  private var blockedPackagesCached: MutableSet<String> = mutableSetOf()

  private var initialized = false

  // Retain a strong reference to avoid GC of the listener
  private val prefListener = SharedPreferences.OnSharedPreferenceChangeListener { prefs, key ->
    if (key == KEY_IS_BLOCKING_ACTIVE) {
      isBlockingActiveCached = prefs.getBoolean(KEY_IS_BLOCKING_ACTIVE, false)
      Log.d(TAG, "PREF_CHANGED: is_blocking_active=$isBlockingActiveCached")
      if (!isBlockingActiveCached) {
        FocusOverlayManager.dismissOverlay("blocking_deactivated")
      }
    } else if (key == KEY_BLOCKED_PACKAGES) {
      val savedSet = prefs.getStringSet(KEY_BLOCKED_PACKAGES, null)
      blockedPackagesCached = savedSet?.toMutableSet() ?: mutableSetOf()
      Log.d(TAG, "PREF_CHANGED: blocked_packages=$blockedPackagesCached")
    }
  }

  fun init(context: Context) {
    if (initialized) return
    synchronized(this) {
      if (initialized) return
      val prefs = getPrefs(context)
      isBlockingActiveCached = prefs.getBoolean(KEY_IS_BLOCKING_ACTIVE, false)
      val savedSet = prefs.getStringSet(KEY_BLOCKED_PACKAGES, null)
      blockedPackagesCached = savedSet?.toMutableSet() ?: mutableSetOf()
      prefs.registerOnSharedPreferenceChangeListener(prefListener)
      initialized = true
      Log.d(TAG, "FocusBlockingManager initialized: active=$isBlockingActiveCached, packages=$blockedPackagesCached")
    }
  }

  private fun getPrefs(context: Context): SharedPreferences {
    return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  fun setBlockedApplications(context: Context, packages: List<String>) {
    init(context)
    synchronized(this) {
      blockedPackagesCached = packages.map { it.trim() }.toMutableSet()
      getPrefs(context).edit().putStringSet(KEY_BLOCKED_PACKAGES, blockedPackagesCached).commit()
      Log.d(TAG, "SET_BLOCKED_APPLICATIONS: count=${blockedPackagesCached.size}, packages=$blockedPackagesCached")
    }
  }

  fun getBlockedApplications(context: Context): List<String> {
    init(context)
    return synchronized(this) {
      blockedPackagesCached.toList()
    }
  }

  fun startAppBlocking(context: Context) {
    init(context)
    synchronized(this) {
      isBlockingActiveCached = true
      getPrefs(context).edit().putBoolean(KEY_IS_BLOCKING_ACTIVE, true).commit()
      Log.d(TAG, "START_APP_BLOCKING: blocking is now ACTIVE")
    }
  }

  fun stopAppBlocking(context: Context) {
    init(context)
    synchronized(this) {
      isBlockingActiveCached = false
      getPrefs(context).edit().putBoolean(KEY_IS_BLOCKING_ACTIVE, false).commit()
      FocusOverlayManager.dismissOverlay("stop_blocking_called")
      Log.d(TAG, "STOP_APP_BLOCKING: blocking is now INACTIVE")
    }
  }

  fun isAppBlockingActive(context: Context): Boolean {
    init(context)
    return isBlockingActiveCached
  }

  fun isPackageBlocked(context: Context, packageName: String): Boolean {
    if (!isAppBlockingActive(context)) return false
    val cleanPkg = packageName.trim()
    if (isExemptPackage(context, cleanPkg)) return false
    return synchronized(this) {
      blockedPackagesCached.contains(cleanPkg)
    }
  }

  fun isExemptPackage(context: Context, packageName: String): Boolean {
    // 1. Never block the consuming application itself
    if (packageName == context.packageName) return true
    // 2. Never block critical Android system controls, emergency, or dialer
    if (systemExemptPackages.contains(packageName)) return true
    // 3. Never block default home screen launcher
    val defaultHome = getDefaultLauncherPackage(context)
    if (defaultHome != null && defaultHome == packageName) return true
    return false
  }

  fun getDefaultLauncherPackage(context: Context): String? {
    return try {
      val intent = Intent(Intent.ACTION_MAIN).apply {
        addCategory(Intent.CATEGORY_HOME)
      }
      val resolveInfo = context.packageManager.resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY)
      resolveInfo?.activityInfo?.packageName
    } catch (e: Exception) {
      null
    }
  }
}
