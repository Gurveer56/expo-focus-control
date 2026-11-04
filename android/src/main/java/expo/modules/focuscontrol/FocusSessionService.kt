package expo.modules.focuscontrol

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log

/**
 * Foreground service scaffold for ongoing user-requested focus sessions (Phase 3).
 *
 * System requirements:
 * - Must be declared with android:exported="false"
 * - Must declare android:foregroundServiceType="specialUse" on Android 14+
 * - Must specify android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE property in manifest
 */
class FocusSessionService : Service() {

  companion object {
    private const val TAG = "FocusSessionService"

    @Volatile
    var isRunning: Boolean = false
      private set
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Log.d(TAG, "FocusSessionService started")
    isRunning = true
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    Log.d(TAG, "FocusSessionService destroyed")
    isRunning = false
  }
}
