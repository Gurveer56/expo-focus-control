package expo.modules.focuscontrol

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log

/**
 * Service scaffold for displaying system overlay blocking views (Phase 2).
 *
 * System requirements:
 * - Requires SYSTEM_ALERT_WINDOW permission
 * - Must be declared with android:exported="false"
 */
class FocusOverlayService : Service() {

  companion object {
    private const val TAG = "FocusOverlayService"

    @Volatile
    var isShowingOverlay: Boolean = false
      private set
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Log.d(TAG, "FocusOverlayService started")
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    Log.d(TAG, "FocusOverlayService destroyed")
    isShowingOverlay = false
  }
}
