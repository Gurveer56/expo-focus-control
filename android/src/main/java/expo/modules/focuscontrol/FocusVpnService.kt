package expo.modules.focuscontrol

import android.content.Intent
import android.net.VpnService
import android.util.Log

/**
 * VPN service scaffold for DNS / domain level blocking in Phase 3.
 *
 * System requirements:
 * - Must be declared with android:permission="android.permission.BIND_VPN_SERVICE"
 * - Must be declared with android:exported="true" so Android VpnManager can bind
 * - Must include the android.net.VpnService intent filter
 */
class FocusVpnService : VpnService() {

  companion object {
    private const val TAG = "FocusVpnService"

    @Volatile
    var isRunning: Boolean = false
      private set
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    Log.d(TAG, "FocusVpnService started")
    isRunning = true
    return START_NOT_STICKY
  }

  override fun onRevoke() {
    super.onRevoke()
    Log.d(TAG, "FocusVpnService revoked by system or another VPN")
    isRunning = false
    stopSelf()
  }

  override fun onDestroy() {
    super.onDestroy()
    Log.d(TAG, "FocusVpnService destroyed")
    isRunning = false
  }
}
