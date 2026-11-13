package expo.modules.focuscontrol

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder

/**
 * Android Service for managing system overlay blocking views.
 * Delegates view rendering and window operations to FocusOverlayManager.
 */
class FocusOverlayService : Service() {

  companion object {
    const val ACTION_SHOW_OVERLAY = "expo.modules.focuscontrol.ACTION_SHOW_OVERLAY"
    const val ACTION_DISMISS_OVERLAY = "expo.modules.focuscontrol.ACTION_DISMISS_OVERLAY"
    const val EXTRA_PACKAGE_NAME = "extra_package_name"

    fun show(context: Context, blockedPackage: String) {
      FocusOverlayManager.showOverlay(context, blockedPackage)
    }

    fun dismiss() {
      FocusOverlayManager.dismissOverlay()
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_SHOW_OVERLAY -> {
        val pkg = intent.getStringExtra(EXTRA_PACKAGE_NAME)
        if (pkg != null) {
          FocusOverlayManager.showOverlay(this, pkg)
        }
      }
      ACTION_DISMISS_OVERLAY -> {
        FocusOverlayManager.dismissOverlay()
      }
    }
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    super.onDestroy()
    FocusOverlayManager.dismissOverlay()
  }
}
