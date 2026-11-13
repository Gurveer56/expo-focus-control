---
name: android-accessibility-app-blocking
description: Teaches how to implement, configure, and maintain the Android AccessibilityService and WindowManager blocking overlay in expo-focus-control with strict privacy rules and Google Play compliance.
---

# Android Accessibility & Application Blocking Overlay

## Purpose
This skill teaches agents how `expo-focus-control` uses Android's `AccessibilityService` to monitor foreground application changes and displays a system-level overlay (`TYPE_APPLICATION_OVERLAY`) to block distracting apps during an active focus session.

## When to Use
Use this skill when:
- Modifying `FocusAccessibilityService.kt` or `FocusOverlayService.kt`.
- Configuring `focus_accessibility_service.xml`.
- Implementing package filtering, blocking lists, or session activation rules.
- Handling `WindowManager` layout parameters and overlay touch handling.
- Ensuring compliance with Google Play Accessibility and User Data policies.

## Google Play Accessibility Policy & Privacy Rules

Android AccessibilityService is an apex permission. Misuse leads to immediate Google Play rejection or removal.
Adhere to these non-negotiable rules:

1. **NO Content Inspection**:
   - In `res/xml/focus_accessibility_service.xml`, ensure:
     ```xml
     android:canRetrieveWindowContent="false"
     ```
   - Never inspect text nodes, keystrokes, password fields, or notifications.
2. **Minimum Event Scope**:
   - Only listen to `typeWindowStateChanged` (`android:eventTypes="typeWindowStateChanged"`).
   - Only extract `event.packageName?.toString()`. Never call `event.source` or traverse view hierarchies.
3. **Never Claim to be an Accessibility Tool**:
   - Do NOT declare `android:isAccessibilityTool="true"` in the XML. That attribute is reserved strictly for apps designed for people with disabilities. Digital wellbeing apps using this tag face account termination.
4. **Emergency Controls Immunity**:
   - NEVER block or overlay:
     - `com.android.settings` (Settings app)
     - `com.android.systemui` (System UI, notifications, quick settings)
     - `com.google.android.dialer` / `com.android.phone` (Emergency calls / dialer)
     - Default launcher / home screen
     - The consuming application itself

## Architecture & Blocking Flow

```
User launches application (e.g. Instagram)
                 |
                 v
FocusAccessibilityService.onAccessibilityEvent()
                 |
                 v
Extract foreground packageName from AccessibilityEvent
                 |
                 v
Check: Is session active? (FocusBlockingManager.isBlockingActive())
                 |
        +--------+--------+
        | NO              | YES
        v                 v
   Do nothing      Check: Is packageName in blocked list?
                          |
                 +--------+--------+
                 | NO              | YES
                 v                 v
            Dismiss overlay   Display FocusOverlayService
                              (TYPE_APPLICATION_OVERLAY)
                                   |
                                   v
                              User taps "Return to Focus"
                              (launches Home or Study app)
```

## Accessibility Service Configuration

### 1. XML Metadata (`res/xml/focus_accessibility_service.xml`)
```xml
<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/accessibility_service_description"
    android:accessibilityEventTypes="typeWindowStateChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:notificationTimeout="100"
    android:canRetrieveWindowContent="false"
    android:accessibilityFlags="flagDefault" />
```

### 2. Service Declaration in `withAndroid.ts`
```xml
<service
    android:name="expo.modules.focuscontrol.FocusAccessibilityService"
    android:exported="true"
    android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE">
    <intent-filter>
        <action android:name="android.accessibilityservice.AccessibilityService" />
    </intent-filter>
    <meta-data
        android:name="android.accessibilityservice"
        android:resource="@xml/focus_accessibility_service" />
</service>
```

### 3. Lifecycle Tracking in Kotlin
```kotlin
class FocusAccessibilityService : AccessibilityService() {
  companion object {
    @Volatile
    var isConnected: Boolean = false
      private set
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    isConnected = true
  }

  override fun onUnbind(intent: Intent?): Boolean {
    isConnected = false
    return super.onUnbind(intent)
  }

  override fun onDestroy() {
    isConnected = false
    super.onDestroy()
  }
}
```

## WindowManager Blocking Overlay Implementation

### 1. WindowManager Layout Parameters
To create a native overlay that prevents interaction with the blocked app:
```kotlin
val layoutParams = WindowManager.LayoutParams(
  WindowManager.LayoutParams.MATCH_PARENT,
  WindowManager.LayoutParams.MATCH_PARENT,
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
  } else {
    @Suppress("DEPRECATION")
    WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
  },
  WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
  WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
  WindowManager.LayoutParams.FLAG_FULLSCREEN,
  PixelFormat.TRANSLUCENT
)
```

### 2. Overlay Safety & Dismissal
- Never attach duplicate views: Maintain a reference to `currentOverlayView` and only call `windowManager.addView` if `currentOverlayView == null`.
- On dismiss: Call `windowManager.removeView(view)` safely wrapped in try-catch.
- Provide a clear exit action: When user taps "Exit Blocked App", send `Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME).addFlags(FLAG_ACTIVITY_NEW_TASK)` to bring them back to their home screen or launch the study app.

## Android 13+ Sideload Restricted Settings

When testing on Android 13+ (API 33+), sideloaded APKs have accessibility disabled with a modal:
> *"Restricted setting: For your security, this setting is currently unavailable."*

**Tester Guidance**:
1. Open device **Settings ➔ Apps ➔ Manage Apps ➔ [App Name]**.
2. Tap the **Three Dots menu** in the top-right corner.
3. Tap **Allow restricted settings**.
4. Authenticate with device PIN/fingerprint.
5. Return to **Accessibility ➔ Downloaded Apps ➔ Enable Service**.

## Relevant Project Files
- `android/src/main/java/expo/modules/focuscontrol/FocusAccessibilityService.kt`
- `android/src/main/java/expo/modules/focuscontrol/FocusOverlayService.kt`
- `android/src/main/res/xml/focus_accessibility_service.xml`
- `src/ExpoFocusControl.types.ts`
- `example/App.tsx`

