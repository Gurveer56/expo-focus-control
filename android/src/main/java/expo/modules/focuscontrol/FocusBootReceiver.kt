package expo.modules.focuscontrol

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BroadcastReceiver scaffold for restoring user focus schedules upon device boot (Phase 3).
 *
 * System requirements:
 * - Must be declared with android:exported="false"
 * - Listens for android.intent.action.BOOT_COMPLETED
 * - Must NOT launch background services directly on Android 8+ (API 26+)
 */
class FocusBootReceiver : BroadcastReceiver() {

  companion object {
    private const val TAG = "FocusBootReceiver"
  }

  override fun onReceive(context: Context?, intent: Intent?) {
    if (intent?.action == Intent.ACTION_BOOT_COMPLETED) {
      Log.d(TAG, "BOOT_COMPLETED received; schedules will be restored via WorkManager in Phase 3")
    }
  }
}
