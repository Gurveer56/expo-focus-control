package expo.modules.focuscontrol

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Manages daily emergency unlock passes, calendar-day resets, temporary package whitelisting,
 * cooldown enforcement, and automatic re-blocking timer execution.
 */
object EmergencyPassManager {

  private const val TAG = "EmergencyPassManager"
  private const val PREFS_NAME = "focus_control_emergency_prefs"

  private const val KEY_REMAINING_PASSES = "emergency_remaining_passes"
  private const val KEY_USED_PASSES_TODAY = "emergency_used_passes_today"
  private const val KEY_LAST_RESET_DATE = "emergency_last_reset_date"
  private const val KEY_ACTIVE_PACKAGE = "emergency_active_package"
  private const val KEY_ACTIVE_EXPIRES_AT = "emergency_active_expires_at"
  private const val KEY_LAST_PASS_ENDED_AT = "emergency_last_pass_ended_at"

  private val mainHandler = Handler(Looper.getMainLooper())
  private var activeReblockRunnable: Runnable? = null

  @Synchronized
  private fun checkAndResetDaily(context: Context, config: EmergencyPassConfig) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    val lastReset = prefs.getString(KEY_LAST_RESET_DATE, null)

    if (lastReset != today) {
      Log.d(TAG, "New calendar day detected ($today vs $lastReset). Resetting emergency passes to ${config.dailyLimit}.")
      prefs.edit()
        .putString(KEY_LAST_RESET_DATE, today)
        .putInt(KEY_REMAINING_PASSES, config.dailyLimit)
        .putInt(KEY_USED_PASSES_TODAY, 0)
        .apply()
    }
  }

  @Synchronized
  fun getStatus(context: Context, targetPackage: String? = null): Map<String, Any?> {
    val config = EmergencyPassConfig.load(context)
    checkAndResetDaily(context, config)

    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val remainingPasses = prefs.getInt(KEY_REMAINING_PASSES, config.dailyLimit)
    val usedPassesToday = prefs.getInt(KEY_USED_PASSES_TODAY, 0)
    val activePkg = prefs.getString(KEY_ACTIVE_PACKAGE, null)
    val expiresAt = prefs.getLong(KEY_ACTIVE_EXPIRES_AT, 0L)
    val lastEndedAt = prefs.getLong(KEY_LAST_PASS_ENDED_AT, 0L)

    val now = System.currentTimeMillis()
    val isExpired = now >= expiresAt
    val isMatchingPkg = activePkg.isNullOrBlank() || targetPackage.isNullOrBlank() || activePkg == targetPackage
    val isPassActive = config.enabled && !isExpired && isMatchingPkg

    val remainingSeconds = if (isPassActive && expiresAt > now) {
      (expiresAt - now) / 1000L
    } else {
      0L
    }

    val cooldownMs = config.cooldownMinutes * 60 * 1000L
    val cooldownUntil = if (cooldownMs > 0 && lastEndedAt > 0) lastEndedAt + cooldownMs else 0L
    val isInCooldown = cooldownUntil > now
    val cooldownRemainingSeconds = if (isInCooldown) (cooldownUntil - now) / 1000L else 0L

    return mapOf(
      "enabled" to config.enabled,
      "dailyLimit" to config.dailyLimit,
      "remainingPasses" to remainingPasses,
      "usedPassesToday" to usedPassesToday,
      "durationMinutes" to config.durationMinutes,
      "isPassActive" to isPassActive,
      "activePackage" to activePkg,
      "expiresAt" to if (isPassActive) expiresAt else null,
      "remainingSeconds" to remainingSeconds,
      "isInCooldown" to isInCooldown,
      "cooldownUntil" to if (isInCooldown) cooldownUntil else null,
      "cooldownRemainingSeconds" to cooldownRemainingSeconds
    )
  }

  @Synchronized
  fun isPackageInEmergency(context: Context, packageName: String): Boolean {
    val config = EmergencyPassConfig.load(context)
    if (!config.enabled) return false

    checkAndResetDaily(context, config)

    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val expiresAt = prefs.getLong(KEY_ACTIVE_EXPIRES_AT, 0L)
    val activePkg = prefs.getString(KEY_ACTIVE_PACKAGE, null)
    val now = System.currentTimeMillis()

    if (now >= expiresAt) {
      if (expiresAt > 0L) {
        // Expired; clean up state and mark last ended
        prefs.edit()
          .putLong(KEY_ACTIVE_EXPIRES_AT, 0L)
          .putString(KEY_ACTIVE_PACKAGE, null)
          .putLong(KEY_LAST_PASS_ENDED_AT, now)
          .apply()
      }
      return false
    }

    // Active pass exists and hasn't expired
    return activePkg.isNullOrBlank() || activePkg == packageName
  }

  @Synchronized
  fun activateEmergencyPass(
    context: Context,
    targetPackage: String? = null,
    customMinutes: Int? = null
  ): Map<String, Any?> {
    val config = EmergencyPassConfig.load(context)
    if (!config.enabled) {
      return mapOf(
        "success" to false,
        "error" to "EMERGENCY_PASS_DISABLED",
        "message" to "Emergency pass feature is disabled in configuration."
      )
    }

    checkAndResetDaily(context, config)

    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val remainingPasses = prefs.getInt(KEY_REMAINING_PASSES, config.dailyLimit)

    if (remainingPasses <= 0) {
      return mapOf(
        "success" to false,
        "error" to "DAILY_LIMIT_EXHAUSTED",
        "message" to "No emergency passes remaining for today.",
        "remainingPasses" to 0
      )
    }

    val now = System.currentTimeMillis()
    val lastEndedAt = prefs.getLong(KEY_LAST_PASS_ENDED_AT, 0L)
    val cooldownMs = config.cooldownMinutes * 60 * 1000L
    if (cooldownMs > 0 && lastEndedAt > 0 && (lastEndedAt + cooldownMs) > now) {
      val remainingSec = ((lastEndedAt + cooldownMs) - now) / 1000L
      return mapOf(
        "success" to false,
        "error" to "COOLDOWN_ACTIVE",
        "message" to "Emergency pass is in cooldown.",
        "cooldownRemainingSeconds" to remainingSec
      )
    }

    val durationMin = customMinutes?.coerceAtLeast(1) ?: config.durationMinutes
    val durationMs = durationMin * 60 * 1000L
    val expiresAt = now + durationMs
    val usedToday = prefs.getInt(KEY_USED_PASSES_TODAY, 0)

    prefs.edit()
      .putInt(KEY_REMAINING_PASSES, (remainingPasses - 1).coerceAtLeast(0))
      .putInt(KEY_USED_PASSES_TODAY, usedToday + 1)
      .putString(KEY_ACTIVE_PACKAGE, targetPackage)
      .putLong(KEY_ACTIVE_EXPIRES_AT, expiresAt)
      .apply()

    Log.d(TAG, "Emergency pass activated for $targetPackage for $durationMin minutes (expires at $expiresAt). Passes left: ${remainingPasses - 1}")

    // Dismiss any active overlay immediately
    FocusOverlayManager.dismissOverlay("emergency_pass_granted")

    // Schedule re-blocking timer
    scheduleReblockTimer(context.applicationContext, targetPackage, durationMs)

    return mapOf(
      "success" to true,
      "remainingPasses" to (remainingPasses - 1).coerceAtLeast(0),
      "durationMinutes" to durationMin,
      "expiresAt" to expiresAt,
      "activePackage" to targetPackage
    )
  }

  @Synchronized
  fun cancelEmergencyPass(context: Context) {
    activeReblockRunnable?.let { mainHandler.removeCallbacks(it) }
    activeReblockRunnable = null

    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val activePkg = prefs.getString(KEY_ACTIVE_PACKAGE, null)
    prefs.edit()
      .putLong(KEY_ACTIVE_EXPIRES_AT, 0L)
      .putString(KEY_ACTIVE_PACKAGE, null)
      .putLong(KEY_LAST_PASS_ENDED_AT, System.currentTimeMillis())
      .apply()

    Log.d(TAG, "Emergency pass cancelled manually.")

    // If accessibility service is active and the current foreground app is blocked, re-arm overlay immediately
    val a11y = FocusAccessibilityService.instance
    if (a11y != null && !activePkg.isNullOrBlank() && FocusBlockingManager.isPackageBlocked(a11y, activePkg)) {
      FocusOverlayManager.showOverlay(a11y, activePkg)
    }
  }

  @Synchronized
  fun resetEmergencyPasses(context: Context) {
    val config = EmergencyPassConfig.load(context)
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())

    prefs.edit()
      .putString(KEY_LAST_RESET_DATE, today)
      .putInt(KEY_REMAINING_PASSES, config.dailyLimit)
      .putInt(KEY_USED_PASSES_TODAY, 0)
      .putLong(KEY_ACTIVE_EXPIRES_AT, 0L)
      .putString(KEY_ACTIVE_PACKAGE, null)
      .putLong(KEY_LAST_PASS_ENDED_AT, 0L)
      .apply()

    Log.d(TAG, "Emergency passes reset to daily limit (${config.dailyLimit}).")
  }

  @Synchronized
  fun grantEmergencyPasses(context: Context, count: Int) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val current = prefs.getInt(KEY_REMAINING_PASSES, 0)
    val updated = (current + count).coerceAtLeast(0)
    prefs.edit().putInt(KEY_REMAINING_PASSES, updated).apply()
    Log.d(TAG, "Granted $count bonus emergency passes. Total remaining: $updated")
  }

  private fun scheduleReblockTimer(appContext: Context, targetPackage: String?, delayMs: Long) {
    activeReblockRunnable?.let { mainHandler.removeCallbacks(it) }

    val runnable = Runnable {
      Log.d(TAG, "Emergency pass duration expired for $targetPackage. Re-locking...")
      val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit()
        .putLong(KEY_ACTIVE_EXPIRES_AT, 0L)
        .putString(KEY_ACTIVE_PACKAGE, null)
        .putLong(KEY_LAST_PASS_ENDED_AT, System.currentTimeMillis())
        .apply()

      // If user is currently still in this app, show overlay immediately
      val a11y = FocusAccessibilityService.instance
      if (a11y != null && !targetPackage.isNullOrBlank()) {
        val isBlocked = FocusBlockingManager.isPackageBlocked(a11y, targetPackage)
        val isBlockingActive = FocusBlockingManager.isAppBlockingActive(a11y)
        if (isBlocked && isBlockingActive) {
          Log.d(TAG, "Re-applying overlay shield on $targetPackage after emergency pass expiration")
          FocusOverlayManager.showOverlay(a11y, targetPackage)
        }
      }
    }

    activeReblockRunnable = runnable
    mainHandler.postDelayed(runnable, delayMs)
  }
}

