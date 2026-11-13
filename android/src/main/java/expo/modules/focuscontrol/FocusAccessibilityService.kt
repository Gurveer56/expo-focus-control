package expo.modules.focuscontrol

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * Accessibility service for detecting foreground application changes.
 * When an active focus session is running, intercepts blocked packages
 * and triggers the native WindowManager overlay.
 *
 * Privacy Guarantees:
 * - canRetrieveWindowContent = false (never inspects text, views, or keystrokes).
 * - Minimum event scope: typeWindowStateChanged and typeWindowsChanged.
 * - Exempts Android settings, emergency dialers, system UI, and home launcher.
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
    Log.d(TAG, "ACCESSIBILITY_CONNECTED")
    instance = this
    isConnected = true

    FocusBlockingManager.init(this)

    // Configure service programmatically to guarantee no package filtering and full window change monitoring
    serviceInfo = serviceInfo?.apply {
      eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_WINDOWS_CHANGED
      feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
      notificationTimeout = 100
      packageNames = null // MUST be null to receive events from all packages!
      flags = AccessibilityServiceInfo.DEFAULT
    } ?: AccessibilityServiceInfo().apply {
      eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or AccessibilityEvent.TYPE_WINDOWS_CHANGED
      feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
      notificationTimeout = 100
      packageNames = null
      flags = AccessibilityServiceInfo.DEFAULT
    }
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return
    val eventType = event.eventType
    if (eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && eventType != AccessibilityEvent.TYPE_WINDOWS_CHANGED) {
      return
    }

    val packageName = event.packageName?.toString() ?: return
    val timestamp = event.eventTime
    val isBlockingActive = FocusBlockingManager.isAppBlockingActive(this)
    val isBlocked = FocusBlockingManager.isPackageBlocked(this, packageName)

    Log.d(TAG, "EVENT: type=$eventType, pkg=$packageName, time=$timestamp, isBlocked=$isBlocked, active=$isBlockingActive")
    Log.d(TAG, "FOREGROUND_PACKAGE_DETECTED: $packageName")
    Log.d(TAG, "BLOCKING_ACTIVE: $isBlockingActive")

    if (!isBlockingActive) {
      if (FocusOverlayManager.isOverlayShowing()) {
        FocusOverlayManager.dismissOverlay("blocking_inactive")
      }
      return
    }

    if (isBlocked) {
      val inEmergency = EmergencyPassManager.isPackageInEmergency(this, packageName)
      if (inEmergency) {
        Log.d(TAG, "EMERGENCY_PASS_ACTIVE: Allowing temporary access to $packageName")
        if (FocusOverlayManager.isOverlayShowing()) {
          FocusOverlayManager.dismissOverlay("emergency_pass_active")
        }
        return
      }

      Log.d(TAG, "BLOCKED_PACKAGE_MATCHED: $packageName")
      FocusOverlayManager.showOverlay(this, packageName)
      return
    }

    // When an overlay is currently showing, guard against feedback loops:
    if (FocusOverlayManager.isOverlayShowing()) {
      // 1. DO NOT dismiss overlay for the overlay's own package (our host app)
      if (packageName == this.packageName) {
        Log.d(TAG, "Ignoring self window event while overlay active: $packageName")
        return
      }

      // 2. DO NOT dismiss overlay for SystemUI (status bar, navigation bar, lockscreen)
      if (packageName == "com.android.systemui") {
        Log.d(TAG, "Ignoring SystemUI event while overlay active: $packageName")
        return
      }

      // 3. Check if user navigated to Home Launcher or an allowed third-party app
      val defaultLauncher = FocusBlockingManager.getDefaultLauncherPackage(this)
      val isHomeLauncher = defaultLauncher != null && defaultLauncher == packageName
      val isKnownAllowedApp = !FocusBlockingManager.isExemptPackage(this, packageName)

      if (isHomeLauncher) {
        Log.d(TAG, "User transitioned to Home Launcher: $packageName. Dismissing overlay.")
        FocusOverlayManager.dismissOverlay("home_launcher")
      } else if (isKnownAllowedApp) {
        Log.d(TAG, "User transitioned to allowed app: $packageName. Dismissing overlay.")
        FocusOverlayManager.dismissOverlay("allowed_app")
      } else {
        Log.d(TAG, "Ignoring transitional/system event: $packageName")
      }
    }
  }

  override fun onInterrupt() {
    Log.d(TAG, "FocusAccessibilityService interrupted")
  }

  override fun onUnbind(intent: Intent?): Boolean {
    Log.d(TAG, "ACCESSIBILITY_DISCONNECTED (unbound)")
    isConnected = false
    instance = null
    FocusOverlayManager.dismissOverlay("service_unbound")
    return super.onUnbind(intent)
  }

  override fun onDestroy() {
    super.onDestroy()
    Log.d(TAG, "ACCESSIBILITY_DISCONNECTED (destroyed)")
    isConnected = false
    instance = null
    FocusOverlayManager.dismissOverlay("service_destroyed")
  }
}
