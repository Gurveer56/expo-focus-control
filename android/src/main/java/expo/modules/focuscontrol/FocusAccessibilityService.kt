package expo.modules.focuscontrol

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * Accessibility service for detecting foreground application changes.
 * Used to implement app blocking when a focus session is active.
 *
 * IMPORTANT: This service is only declared in AndroidManifest.xml when
 * accessibilityBlocking is enabled in the plugin config. It must never
 * be activated without explicit user action in system settings.
 *
 * Google Play Policy: This service is used for productivity/focus features,
 * NOT as a disability assistance tool. Do not set isAccessibilityTool=true.
 */
class FocusAccessibilityService : AccessibilityService() {

  companion object {
    private const val TAG = "FocusAccessibility"

    @Volatile
    var isConnected: Boolean = false
      private set

    @Volatile
    var instance: FocusAccessibilityService? = null
      private set
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    Log.d(TAG, "FocusAccessibilityService connected")
    instance = this
    isConnected = true

    serviceInfo = serviceInfo?.apply {
      eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
      feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
      flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS.inv() and flags
      notificationTimeout = 300
    } ?: AccessibilityServiceInfo().apply {
      eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
      feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
      notificationTimeout = 300
    }
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
      return
    }

    val packageName = event.packageName?.toString() ?: return
    // Phase 2 will implement active rule checking and overlay trigger.
    Log.d(TAG, "Foreground package changed: $packageName")
  }

  override fun onInterrupt() {
    Log.d(TAG, "FocusAccessibilityService interrupted")
  }

  override fun onUnbind(intent: Intent?): Boolean {
    Log.d(TAG, "FocusAccessibilityService unbound")
    isConnected = false
    instance = null
    return super.onUnbind(intent)
  }

  override fun onDestroy() {
    super.onDestroy()
    Log.d(TAG, "FocusAccessibilityService destroyed")
    isConnected = false
    instance = null
  }
}
