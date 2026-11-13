package expo.modules.focuscontrol

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Thread-safe singleton managing the native WindowManager blocking overlay.
 * Uses TYPE_ACCESSIBILITY_OVERLAY when called from AccessibilityService (bypassing
 * OEM background overlay locks like Xiaomi's 'Display pop-up windows in background'),
 * with TYPE_APPLICATION_OVERLAY fallback.
 */
object FocusOverlayManager {
  private const val TAG = "FocusOverlayManager"
  private val mainHandler = Handler(Looper.getMainLooper())

  @Volatile
  private var currentOverlayView: View? = null

  @Volatile
  private var activeWindowManager: WindowManager? = null

  @Volatile
  private var currentlyDisplayedPackage: String? = null

  fun isOverlayShowing(): Boolean {
    return currentOverlayView != null
  }

  fun showOverlay(context: Context, blockedPackage: String) {
    val a11yInstance = FocusAccessibilityService.instance
    val targetContext = a11yInstance ?: context
    val canDrawStandard = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      Settings.canDrawOverlays(context)
    } else {
      true
    }

    Log.d(TAG, "OVERLAY_PERMISSION_GRANTED: $canDrawStandard (a11yInstanceAvailable=${a11yInstance != null})")
    Log.d(TAG, "OVERLAY_ADD_ATTEMPT: $blockedPackage")

    mainHandler.post {
      try {
        // If overlay is already attached for the same package, do nothing
        if (currentOverlayView != null && currentlyDisplayedPackage == blockedPackage) {
          Log.d(TAG, "Overlay already displayed for $blockedPackage, skipping addView")
          return@post
        }

        // If overlay is already attached for a different package, dismiss first
        if (currentOverlayView != null) {
          dismissOverlayInternal("package_switch")
        }

        val wm = targetContext.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        if (wm == null) {
          Log.e(TAG, "OVERLAY_ADD_FAILED: WindowManager unavailable on targetContext")
          return@post
        }
        activeWindowManager = wm

        val overlayView = buildOverlayView(targetContext, blockedPackage)

        // Select window type:
        // When attached through AccessibilityService, TYPE_ACCESSIBILITY_OVERLAY is granted by OS
        // and bypasses Xiaomi's background popup restriction (MIUIOP 10021).
        val windowType = if (a11yInstance != null) {
          WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
          @Suppress("DEPRECATION")
          WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
        }

        val layoutParams = WindowManager.LayoutParams(
          WindowManager.LayoutParams.MATCH_PARENT,
          WindowManager.LayoutParams.MATCH_PARENT,
          windowType,
          WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
          PixelFormat.TRANSLUCENT
        ).apply {
          gravity = Gravity.CENTER
        }

        wm.addView(overlayView, layoutParams)
        currentOverlayView = overlayView
        currentlyDisplayedPackage = blockedPackage
        Log.d(TAG, "OVERLAY_ADD_SUCCESS: $blockedPackage (windowType=$windowType)")
      } catch (e: Exception) {
        Log.e(TAG, "OVERLAY_ADD_FAILED: ${e.message}", e)
      }
    }
  }

  fun dismissOverlay(reason: String = "manual") {
    mainHandler.post {
      dismissOverlayInternal(reason)
    }
  }

  private fun dismissOverlayInternal(reason: String) {
    val view = currentOverlayView ?: return
    val wm = activeWindowManager ?: return
    try {
      if (view.isAttachedToWindow) {
        wm.removeView(view)
        Log.d(TAG, "OVERLAY_DISMISSED: $reason (package=$currentlyDisplayedPackage)")
      }
    } catch (e: Exception) {
      Log.e(TAG, "Error removing overlay view: ${e.message}", e)
    } finally {
      currentOverlayView = null
      currentlyDisplayedPackage = null
      activeWindowManager = null
    }
  }

  @SuppressLint("SetTextI18n")
  private fun buildOverlayView(context: Context, blockedPackage: String): View {
    val pm = context.packageManager
    val appName = try {
      val appInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        pm.getApplicationInfo(blockedPackage, PackageManager.ApplicationInfoFlags.of(0))
      } else {
        @Suppress("DEPRECATION")
        pm.getApplicationInfo(blockedPackage, 0)
      }
      pm.getApplicationLabel(appInfo).toString()
    } catch (e: Exception) {
      blockedPackage
    }

    // Root Container
    val root = FrameLayout(context).apply {
      setBackgroundColor(Color.parseColor("#EE0F172A")) // 93% opaque dark slate
      isClickable = true
      isFocusable = true
    }

    // Centered Content Card
    val content = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dpToPx(context, 28), dpToPx(context, 36), dpToPx(context, 28), dpToPx(context, 36))

      background = GradientDrawable().apply {
        setColor(Color.parseColor("#1E293B")) // Slate 800
        cornerRadius = dpToPx(context, 20).toFloat()
        setStroke(dpToPx(context, 1), Color.parseColor("#334155"))
      }
    }

    val cardParams = FrameLayout.LayoutParams(
      dpToPx(context, 320),
      FrameLayout.LayoutParams.WRAP_CONTENT
    ).apply {
      gravity = Gravity.CENTER
    }

    // Icon Circle / Emoji
    val iconView = TextView(context).apply {
      text = "🛡️"
      textSize = 44f
      gravity = Gravity.CENTER
      setPadding(0, 0, 0, dpToPx(context, 12))
    }
    content.addView(iconView)

    // Title
    val titleView = TextView(context).apply {
      text = "Focus Mode Active"
      textSize = 22f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.parseColor("#F8FAFC"))
      gravity = Gravity.CENTER
    }
    content.addView(titleView)

    // Blocked App Name Label
    val appBadge = TextView(context).apply {
      text = "$appName is blocked"
      textSize = 15f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.parseColor("#F87171")) // Red 400
      gravity = Gravity.CENTER
      setPadding(0, dpToPx(context, 8), 0, dpToPx(context, 8))
    }
    content.addView(appBadge)

    // Description
    val descView = TextView(context).apply {
      text = "Stay committed to your focus session. This app will be unblocked once your session ends."
      textSize = 13f
      setTextColor(Color.parseColor("#94A3B8")) // Slate 400
      gravity = Gravity.CENTER
      setLineSpacing(dpToPx(context, 2).toFloat(), 1.15f)
      setPadding(0, 0, 0, dpToPx(context, 24))
    }
    content.addView(descView)

    // Primary Action Button: "Return to Focus"
    val returnButton = Button(context).apply {
      text = "Return to Focus"
      textSize = 14f
      typeface = Typeface.DEFAULT_BOLD
      setTextColor(Color.WHITE)
      background = GradientDrawable().apply {
        setColor(Color.parseColor("#2563EB")) // Blue 600
        cornerRadius = dpToPx(context, 10).toFloat()
      }
      setPadding(dpToPx(context, 16), dpToPx(context, 12), dpToPx(context, 16), dpToPx(context, 12))

      setOnClickListener {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launchIntent != null) {
          launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
          context.startActivity(launchIntent)
        } else {
          val homeIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
          context.startActivity(homeIntent)
        }
        dismissOverlayInternal("return_to_focus_clicked")
      }
    }
    content.addView(returnButton, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      dpToPx(context, 48)
    ))

    // Secondary Action Button: "Exit to Home"
    val homeButton = Button(context).apply {
      text = "Exit to Home Screen"
      textSize = 13f
      setTextColor(Color.parseColor("#94A3B8"))
      setBackgroundColor(Color.TRANSPARENT)
      setOnClickListener {
        val homeIntent = Intent(Intent.ACTION_MAIN).apply {
          addCategory(Intent.CATEGORY_HOME)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(homeIntent)
        dismissOverlayInternal("exit_to_home_clicked")
      }
    }
    val homeBtnParams = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      dpToPx(context, 40)
    ).apply {
      topMargin = dpToPx(context, 6)
    }
    content.addView(homeButton, homeBtnParams)

    root.addView(content, cardParams)
    return root
  }

  private fun dpToPx(context: Context, dp: Int): Int {
    val density = context.resources.displayMetrics.density
    return (dp * density).toInt()
  }
}
