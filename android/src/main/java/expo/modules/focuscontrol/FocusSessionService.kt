package expo.modules.focuscontrol

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground Service for running timed focus sessions with an ongoing,
 * sticky status bar notification displaying a real-time countdown.
 *
 * Conforms to Android 14+ (API 34) Foreground Service type: specialUse
 * with android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE.
 */
class FocusSessionService : Service() {

  companion object {
    private const val TAG = "FocusSessionService"

    const val ACTION_START_SESSION = "expo.modules.focuscontrol.ACTION_START_SESSION"
    const val ACTION_STOP_SESSION = "expo.modules.focuscontrol.ACTION_STOP_SESSION"
    const val ACTION_PAUSE_SESSION = "expo.modules.focuscontrol.ACTION_PAUSE_SESSION"
    const val ACTION_RESUME_SESSION = "expo.modules.focuscontrol.ACTION_RESUME_SESSION"

    const val EXTRA_SESSION_NAME = "extra_session_name"
    const val EXTRA_DURATION_SEC = "extra_duration_sec"
    const val EXTRA_END_TIME_MS = "extra_end_time_ms"
    const val EXTRA_REMAINING_SEC = "extra_remaining_sec"

    @Volatile
    var isRunning: Boolean = false
      private set
  }

  private val mainHandler = Handler(Looper.getMainLooper())
  private var sessionName: String = "Focus Session"
  private var durationSec: Long = 0
  private var endTimeMs: Long = 0
  private var isPaused: Boolean = false

  private val tickRunnable = object : Runnable {
    override fun run() {
      if (!isRunning || isPaused) return

      val now = System.currentTimeMillis()
      val diffMs = endTimeMs - now

      if (durationSec > 0 && diffMs <= 0) {
        Log.d(TAG, "Focus session finished naturally via countdown")
        updateNotification("00:00 - Session complete!")
        FocusSessionManager.onTimerExpired(this@FocusSessionService)
        stopSelf()
        return
      }

      val remainingSec = if (durationSec > 0) (diffMs / 1000L).coerceAtLeast(0) else 0L
      val formattedTime = formatTime(remainingSec)
      val contentText = if (durationSec > 0) "$formattedTime remaining" else "Deep focus active"

      updateNotification(contentText)
      mainHandler.postDelayed(this, 1000L)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    FocusSessionManager.createNotificationChannel(this)
    isRunning = true
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP_SESSION -> {
        Log.d(TAG, "ACTION_STOP_SESSION received")
        stopSelf()
        return START_NOT_STICKY
      }

      ACTION_PAUSE_SESSION -> {
        Log.d(TAG, "ACTION_PAUSE_SESSION received")
        isPaused = true
        mainHandler.removeCallbacks(tickRunnable)
        val rem = intent.getLongExtra(EXTRA_REMAINING_SEC, 0L)
        updateNotification("${formatTime(rem)} (Paused)")
        return START_STICKY
      }

      ACTION_RESUME_SESSION -> {
        Log.d(TAG, "ACTION_RESUME_SESSION received")
        isPaused = false
        endTimeMs = intent.getLongExtra(EXTRA_END_TIME_MS, System.currentTimeMillis())
        mainHandler.removeCallbacks(tickRunnable)
        mainHandler.post(tickRunnable)
        return START_STICKY
      }

      ACTION_START_SESSION, null -> {
        sessionName = intent?.getStringExtra(EXTRA_SESSION_NAME) ?: "Focus Session"
        durationSec = intent?.getLongExtra(EXTRA_DURATION_SEC, 0L) ?: 0L
        endTimeMs = intent?.getLongExtra(EXTRA_END_TIME_MS, 0L) ?: 0L
        isPaused = false

        Log.d(TAG, "Starting foreground service: name=$sessionName, duration=$durationSec")

        val initialTime = if (durationSec > 0) "${formatTime(durationSec)} remaining" else "Deep focus active"
        val notification = buildNotification(initialTime)

        try {
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
              FocusSessionManager.NOTIFICATION_ID,
              notification,
              ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
          } else {
            startForeground(FocusSessionManager.NOTIFICATION_ID, notification)
          }
        } catch (e: Exception) {
          Log.e(TAG, "Failed startForeground: ${e.message}", e)
        }

        mainHandler.removeCallbacks(tickRunnable)
        if (durationSec > 0) {
          mainHandler.postDelayed(tickRunnable, 1000L)
        }
      }
    }

    return START_STICKY
  }

  @SuppressLint("DefaultLocale")
  private fun formatTime(seconds: Long): String {
    val hrs = seconds / 3600
    val mins = (seconds % 3600) / 60
    val secs = seconds % 60
    return if (hrs > 0) {
      String.format("%02d:%02d:%02d", hrs, mins, secs)
    } else {
      String.format("%02d:%02d", mins, secs)
    }
  }

  private fun buildNotification(contentText: String): Notification {
    // Tap notification to open the app
    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    val contentPendingIntent = PendingIntent.getActivity(
      this,
      0,
      launchIntent ?: Intent(),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    // Stop button action
    val stopIntent = Intent(this, FocusSessionService::class.java).apply {
      action = ACTION_STOP_SESSION
    }
    val stopPendingIntent = PendingIntent.getService(
      this,
      1,
      stopIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    return NotificationCompat.Builder(this, FocusSessionManager.CHANNEL_ID)
      .setContentTitle(sessionName)
      .setContentText(contentText)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setContentIntent(contentPendingIntent)
      .addAction(android.R.drawable.ic_menu_close_clear_cancel, "End Session", stopPendingIntent)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_WORKOUT)
      .build()
  }

  private fun updateNotification(contentText: String) {
    try {
      val notification = buildNotification(contentText)
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      manager?.notify(FocusSessionManager.NOTIFICATION_ID, notification)
    } catch (e: Exception) {
      Log.e(TAG, "Error updating notification: ${e.message}")
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    Log.d(TAG, "FocusSessionService destroyed")
    isRunning = false
    mainHandler.removeCallbacks(tickRunnable)
    try {
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
      manager?.cancel(FocusSessionManager.NOTIFICATION_ID)
    } catch (e: Exception) {
      Log.e(TAG, "Error cancelling notification on destroy: ${e.message}")
    }
  }
}
