package expo.modules.focuscontrol

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * Thread-safe singleton managing active timed focus sessions, state persistence,
 * notification channels, and integration with FocusSessionService.
 */
object FocusSessionManager {
  private const val TAG = "FocusSessionManager"
  private const val PREFS_NAME = "expo_focus_control_session_prefs"

  private const val KEY_IS_ACTIVE = "session_is_active"
  private const val KEY_IS_PAUSED = "session_is_paused"
  private const val KEY_SESSION_NAME = "session_name"
  private const val KEY_DURATION_SEC = "session_duration_sec"
  private const val KEY_START_TIME_MS = "session_start_time_ms"
  private const val KEY_END_TIME_MS = "session_end_time_ms"
  private const val KEY_PAUSE_TIME_MS = "session_pause_time_ms"
  private const val KEY_REMAINING_PAUSED_SEC = "session_remaining_paused_sec"
  private const val KEY_AUTO_APP_BLOCKING = "session_auto_app_blocking"

  const val CHANNEL_ID = "expo_focus_session_channel"
  const val NOTIFICATION_ID = 90210

  @Volatile
  private var isActiveCached: Boolean = false

  @Volatile
  private var isPausedCached: Boolean = false

  @Volatile
  private var sessionNameCached: String = "Focus Session"

  @Volatile
  private var durationSecCached: Long = 0

  @Volatile
  private var endTimeMsCached: Long = 0

  @Volatile
  private var remainingPausedSecCached: Long = 0

  @Volatile
  private var autoAppBlockingCached: Boolean = true

  private var initialized = false

  fun init(context: Context) {
    if (initialized) return
    synchronized(this) {
      if (initialized) return
      createNotificationChannel(context)
      val prefs = getPrefs(context)
      isActiveCached = prefs.getBoolean(KEY_IS_ACTIVE, false)
      isPausedCached = prefs.getBoolean(KEY_IS_PAUSED, false)
      sessionNameCached = prefs.getString(KEY_SESSION_NAME, "Focus Session") ?: "Focus Session"
      durationSecCached = prefs.getLong(KEY_DURATION_SEC, 0)
      endTimeMsCached = prefs.getLong(KEY_END_TIME_MS, 0)
      remainingPausedSecCached = prefs.getLong(KEY_REMAINING_PAUSED_SEC, 0)
      autoAppBlockingCached = prefs.getBoolean(KEY_AUTO_APP_BLOCKING, true)

      // Check if an active session already expired while app was dead
      if (isActiveCached && !isPausedCached && endTimeMsCached > 0) {
        val now = System.currentTimeMillis()
        if (now >= endTimeMsCached) {
          Log.d(TAG, "Expired session detected on init, completing now")
          completeSessionInternal(context)
        }
      }

      initialized = true
      Log.d(TAG, "FocusSessionManager initialized: active=$isActiveCached, paused=$isPausedCached")
    }
  }

  private fun getPrefs(context: Context): SharedPreferences {
    return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  fun createNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        ?: return
      val existing = notificationManager.getNotificationChannel(CHANNEL_ID)
      if (existing == null) {
        val channel = NotificationChannel(
          CHANNEL_ID,
          "Focus Sessions",
          NotificationManager.IMPORTANCE_LOW
        ).apply {
          description = "Displays ongoing countdown timer for active focus sessions"
          setShowBadge(false)
          enableVibration(false)
          enableLights(false)
        }
        notificationManager.createNotificationChannel(channel)
        Log.d(TAG, "Focus session notification channel created")
      }
    }
  }

  fun startFocusSession(
    context: Context,
    durationSeconds: Long,
    sessionName: String? = null,
    enableAppBlocking: Boolean = true
  ): Map<String, Any> {
    init(context)
    synchronized(this) {
      val name = if (!sessionName.isNullOrBlank()) sessionName.trim() else "Focus Session"
      val now = System.currentTimeMillis()
      val end = if (durationSeconds > 0) now + (durationSeconds * 1000L) else 0L

      isActiveCached = true
      isPausedCached = false
      sessionNameCached = name
      durationSecCached = durationSeconds
      endTimeMsCached = end
      remainingPausedSecCached = durationSeconds
      autoAppBlockingCached = enableAppBlocking

      getPrefs(context).edit()
        .putBoolean(KEY_IS_ACTIVE, true)
        .putBoolean(KEY_IS_PAUSED, false)
        .putString(KEY_SESSION_NAME, name)
        .putLong(KEY_DURATION_SEC, durationSeconds)
        .putLong(KEY_START_TIME_MS, now)
        .putLong(KEY_END_TIME_MS, end)
        .putLong(KEY_REMAINING_PAUSED_SEC, durationSeconds)
        .putBoolean(KEY_AUTO_APP_BLOCKING, enableAppBlocking)
        .commit()

      if (enableAppBlocking) {
        FocusBlockingManager.startAppBlocking(context)
      }

      // Start foreground service
      val serviceIntent = Intent(context, FocusSessionService::class.java).apply {
        action = FocusSessionService.ACTION_START_SESSION
        putExtra(FocusSessionService.EXTRA_SESSION_NAME, name)
        putExtra(FocusSessionService.EXTRA_DURATION_SEC, durationSeconds)
        putExtra(FocusSessionService.EXTRA_END_TIME_MS, end)
      }
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(serviceIntent)
        } else {
          context.startService(serviceIntent)
        }
      } catch (e: Exception) {
        Log.e(TAG, "Failed to start FocusSessionService: ${e.message}", e)
      }

      Log.d(TAG, "START_FOCUS_SESSION: name=$name, durationSec=$durationSeconds, blocking=$enableAppBlocking")
      return getFocusSessionStatus(context)
    }
  }

  fun stopFocusSession(context: Context): Map<String, Any> {
    init(context)
    synchronized(this) {
      completeSessionInternal(context)
      Log.d(TAG, "STOP_FOCUS_SESSION: session manually stopped")
      return getFocusSessionStatus(context)
    }
  }

  fun pauseFocusSession(context: Context): Map<String, Any> {
    init(context)
    synchronized(this) {
      if (!isActiveCached || isPausedCached) return getFocusSessionStatus(context)

      val remaining = getRemainingSeconds(context)
      isPausedCached = true
      remainingPausedSecCached = remaining

      getPrefs(context).edit()
        .putBoolean(KEY_IS_PAUSED, true)
        .putLong(KEY_PAUSE_TIME_MS, System.currentTimeMillis())
        .putLong(KEY_REMAINING_PAUSED_SEC, remaining)
        .commit()

      // Notify service to pause notification timer
      val serviceIntent = Intent(context, FocusSessionService::class.java).apply {
        action = FocusSessionService.ACTION_PAUSE_SESSION
        putExtra(FocusSessionService.EXTRA_REMAINING_SEC, remaining)
      }
      try {
        context.startService(serviceIntent)
      } catch (e: Exception) {
        Log.e(TAG, "Failed to notify service of pause: ${e.message}")
      }

      Log.d(TAG, "PAUSE_FOCUS_SESSION: remainingSec=$remaining")
      return getFocusSessionStatus(context)
    }
  }

  fun resumeFocusSession(context: Context): Map<String, Any> {
    init(context)
    synchronized(this) {
      if (!isActiveCached || !isPausedCached) return getFocusSessionStatus(context)

      val remaining = remainingPausedSecCached
      val now = System.currentTimeMillis()
      val newEnd = if (remaining > 0) now + (remaining * 1000L) else 0L

      isPausedCached = false
      endTimeMsCached = newEnd

      getPrefs(context).edit()
        .putBoolean(KEY_IS_PAUSED, false)
        .putLong(KEY_END_TIME_MS, newEnd)
        .commit()

      val serviceIntent = Intent(context, FocusSessionService::class.java).apply {
        action = FocusSessionService.ACTION_RESUME_SESSION
        putExtra(FocusSessionService.EXTRA_END_TIME_MS, newEnd)
        putExtra(FocusSessionService.EXTRA_REMAINING_SEC, remaining)
      }
      try {
        context.startService(serviceIntent)
      } catch (e: Exception) {
        Log.e(TAG, "Failed to notify service of resume: ${e.message}")
      }

      Log.d(TAG, "RESUME_FOCUS_SESSION: newEnd=$newEnd, remainingSec=$remaining")
      return getFocusSessionStatus(context)
    }
  }

  fun getFocusSessionStatus(context: Context): Map<String, Any> {
    init(context)
    synchronized(this) {
      val remaining = getRemainingSeconds(context)
      val elapsed = if (durationSecCached > 0) {
        (durationSecCached - remaining).coerceAtLeast(0)
      } else 0L

      return mapOf(
        "isActive" to isActiveCached,
        "isPaused" to isPausedCached,
        "sessionName" to sessionNameCached,
        "durationSeconds" to durationSecCached,
        "remainingSeconds" to remaining,
        "elapsedSeconds" to elapsed,
        "autoAppBlocking" to autoAppBlockingCached
      )
    }
  }

  fun getRemainingSeconds(context: Context): Long {
    if (!isActiveCached) return 0L
    if (durationSecCached == 0L) return 0L // Untimed session
    if (isPausedCached) return remainingPausedSecCached

    val now = System.currentTimeMillis()
    val diff = endTimeMsCached - now
    return if (diff > 0) diff / 1000L else 0L
  }

  fun onTimerExpired(context: Context) {
    synchronized(this) {
      Log.d(TAG, "Focus session timer expired naturally")
      completeSessionInternal(context)
    }
  }

  private fun completeSessionInternal(context: Context) {
    isActiveCached = false
    isPausedCached = false
    durationSecCached = 0
    endTimeMsCached = 0
    remainingPausedSecCached = 0

    getPrefs(context).edit()
      .putBoolean(KEY_IS_ACTIVE, false)
      .putBoolean(KEY_IS_PAUSED, false)
      .putLong(KEY_DURATION_SEC, 0)
      .putLong(KEY_END_TIME_MS, 0)
      .putLong(KEY_REMAINING_PAUSED_SEC, 0)
      .commit()

    if (autoAppBlockingCached) {
      FocusBlockingManager.stopAppBlocking(context)
    }

    // Stop foreground service
    val serviceIntent = Intent(context, FocusSessionService::class.java).apply {
      action = FocusSessionService.ACTION_STOP_SESSION
    }
    try {
      context.stopService(serviceIntent)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to stop FocusSessionService: ${e.message}")
    }
  }

  fun restoreOnBoot(context: Context) {
    init(context)
    synchronized(this) {
      if (!isActiveCached) {
        Log.d(TAG, "restoreOnBoot: No active session to restore")
        return
      }

      val now = System.currentTimeMillis()
      if (!isPausedCached && durationSecCached > 0 && now >= endTimeMsCached) {
        Log.d(TAG, "restoreOnBoot: Session expired during reboot")
        completeSessionInternal(context)
        return
      }

      val remaining = getRemainingSeconds(context)
      Log.d(TAG, "restoreOnBoot: Restoring session '$sessionNameCached', remaining=$remaining sec")

      if (autoAppBlockingCached) {
        FocusBlockingManager.startAppBlocking(context)
      }

      val serviceIntent = Intent(context, FocusSessionService::class.java).apply {
        action = FocusSessionService.ACTION_START_SESSION
        putExtra(FocusSessionService.EXTRA_SESSION_NAME, sessionNameCached)
        putExtra(FocusSessionService.EXTRA_DURATION_SEC, durationSecCached)
        putExtra(FocusSessionService.EXTRA_END_TIME_MS, endTimeMsCached)
      }
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          context.startForegroundService(serviceIntent)
        } else {
          context.startService(serviceIntent)
        }
      } catch (e: Exception) {
        Log.e(TAG, "restoreOnBoot: Failed to start FocusSessionService: ${e.message}")
      }
    }
  }
}

