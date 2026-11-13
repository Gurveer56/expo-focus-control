package expo.modules.focuscontrol

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BroadcastReceiver for restoring active focus sessions and application blocking
 * when the device finishes rebooting.
 *
 * Safe for Android 8+ (API 26+) background execution limits: delegates session
 * restoration to FocusSessionManager which invokes startForegroundService().
 */
class FocusBootReceiver : BroadcastReceiver() {

  companion object {
    private const val TAG = "FocusBootReceiver"
  }

  override fun onReceive(context: Context?, intent: Intent?) {
    if (context == null) return
    val action = intent?.action
    Log.d(TAG, "Broadcast received: action=$action")

    if (action == Intent.ACTION_BOOT_COMPLETED || action == "android.intent.action.QUICKBOOT_POWERON") {
      Log.d(TAG, "Device boot completed, restoring focus state...")
      try {
        // Initialize managers
        FocusBlockingManager.init(context)
        FocusSessionManager.init(context)

        // Restore active focus session if one was running prior to reboot
        FocusSessionManager.restoreOnBoot(context)
      } catch (e: Exception) {
        Log.e(TAG, "Error restoring state on boot: ${e.message}", e)
      }
    }
  }
}
