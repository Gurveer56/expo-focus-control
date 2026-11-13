package expo.modules.focuscontrol

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import java.io.File

/**
 * Thread-safe singleton managing the native WindowManager blocking overlay.
 * Uses TYPE_ACCESSIBILITY_OVERLAY when called from AccessibilityService (bypassing
 * OEM background overlay locks like Xiaomi's 'Display pop-up windows in background'),
 * with TYPE_APPLICATION_OVERLAY fallback.
 *
 * Fully supports runtime UI customization via OverlayConfig.
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
        if (currentOverlayView != null && currentlyDisplayedPackage == blockedPackage) {
          Log.d(TAG, "Overlay already displayed for $blockedPackage, skipping addView")
          return@post
        }

        if (currentOverlayView != null) {
          dismissOverlayInternal("package_switch")
        }

        val wm = targetContext.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
        if (wm == null) {
          Log.e(TAG, "OVERLAY_ADD_FAILED: WindowManager unavailable on targetContext")
          return@post
        }
        activeWindowManager = wm

        // Load custom or default overlay configuration
        val config = OverlayConfig.load(targetContext)
        val overlayView = buildOverlayView(targetContext, blockedPackage, config)

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
  private fun buildOverlayView(context: Context, blockedPackage: String, config: OverlayConfig): View {
    // Check if a block-based custom layout is configured
    val customLayoutJson = OverlayLayoutConfig.load(context)
    if (!customLayoutJson.isNullOrBlank()) {
      val customView = OverlayLayoutRenderer.render(context, customLayoutJson, blockedPackage)
      if (customView != null) {
        return customView
      }
    }

    val pm = context.packageManager
    var appIconDrawable: android.graphics.drawable.Drawable? = null
    val appName = try {
      val appInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        pm.getApplicationInfo(blockedPackage, PackageManager.ApplicationInfoFlags.of(0))
      } else {
        @Suppress("DEPRECATION")
        pm.getApplicationInfo(blockedPackage, 0)
      }
      appIconDrawable = pm.getApplicationIcon(appInfo)
      pm.getApplicationLabel(appInfo).toString()
    } catch (e: Exception) {
      blockedPackage
    }

    // 1. Root Container
    val root = FrameLayout(context).apply {
      val bg = OverlayConfig.parseColorSafe(config.backgroundColor, Color.parseColor("#EE0F172A"))
      setBackgroundColor(bg)
      isClickable = true
      isFocusable = true
    }

    // 2. Centered Content Card
    val content = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(dpToPx(context, 26), dpToPx(context, 32), dpToPx(context, 26), dpToPx(context, 32))

      val cardBg = OverlayConfig.parseColorSafe(config.cardBackgroundColor, Color.parseColor("#1E293B"))
      val cardBorder = OverlayConfig.parseColorSafe(config.cardBorderColor, Color.parseColor("#334155"))

      background = GradientDrawable().apply {
        setColor(cardBg)
        cornerRadius = dpToPx(context, config.cardCornerRadius).toFloat()
        setStroke(dpToPx(context, config.cardBorderWidth), cardBorder)
      }
    }

    val verticalGravity = when (config.cardAlignment.lowercase()) {
      "top" -> Gravity.TOP
      "bottom" -> Gravity.BOTTOM
      else -> Gravity.CENTER_VERTICAL
    }

    val cardParams = FrameLayout.LayoutParams(
      dpToPx(context, config.cardMaxWidth),
      FrameLayout.LayoutParams.WRAP_CONTENT
    ).apply {
      gravity = Gravity.CENTER_HORIZONTAL or verticalGravity
      if (verticalGravity == Gravity.TOP) {
        topMargin = dpToPx(context, 80)
      } else if (verticalGravity == Gravity.BOTTOM) {
        bottomMargin = dpToPx(context, 60)
      }
    }

    // 3. Custom Image Icon (PNG / JPEG / WebP / Base64), Real App Icon, or Emoji
    var customBitmap: Bitmap? = null
    if (config.customIconUri.isNotBlank()) {
      try {
        val uriStr = config.customIconUri.trim()
        if (uriStr.startsWith("data:image") && uriStr.contains("base64,")) {
          val base64Data = uriStr.substringAfter("base64,")
          val bytes = Base64.decode(base64Data, Base64.DEFAULT)
          customBitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        } else if (uriStr.startsWith("content://") || uriStr.startsWith("file://")) {
          val uri = Uri.parse(uriStr)
          context.contentResolver.openInputStream(uri)?.use { stream ->
            customBitmap = BitmapFactory.decodeStream(stream)
          }
        } else {
          val file = File(uriStr)
          if (file.exists()) {
            customBitmap = BitmapFactory.decodeFile(file.absolutePath)
          }
        }
      } catch (e: Exception) {
        Log.w(TAG, "Failed to load customIconUri: ${e.message}")
      }
    }

    if (customBitmap != null) {
      val iconPx = dpToPx(context, config.iconSize.toInt().coerceAtLeast(32))
      val iconView = ImageView(context).apply {
        setImageBitmap(customBitmap)
        scaleType = ImageView.ScaleType.FIT_CENTER
        layoutParams = LinearLayout.LayoutParams(iconPx, iconPx).apply {
          gravity = Gravity.CENTER_HORIZONTAL
          bottomMargin = dpToPx(context, 12)
        }
      }
      content.addView(iconView)
    } else if (config.showAppIcon && appIconDrawable != null) {
      val iconView = ImageView(context).apply {
        setImageDrawable(appIconDrawable)
        val iconPx = dpToPx(context, 56)
        layoutParams = LinearLayout.LayoutParams(iconPx, iconPx).apply {
          gravity = Gravity.CENTER_HORIZONTAL
          bottomMargin = dpToPx(context, 12)
        }
      }
      content.addView(iconView)
    } else if (config.iconEmoji.isNotBlank()) {
      // 3b. Emoji Icon
      val emojiView = TextView(context).apply {
        text = config.iconEmoji
        textSize = config.iconSize
        gravity = Gravity.CENTER
        setPadding(0, 0, 0, dpToPx(context, 10))
      }
      content.addView(emojiView)
    }

    // 4. Custom Title
    if (config.title.isNotBlank()) {
      val titleView = TextView(context).apply {
        text = config.title
        textSize = config.titleSize
        typeface = Typeface.DEFAULT_BOLD
        setTextColor(OverlayConfig.parseColorSafe(config.titleColor, Color.parseColor("#F8FAFC")))
        gravity = Gravity.CENTER
      }
      content.addView(titleView)
    }

    // 5. Blocked App Name Badge
    if (config.showBlockedAppName) {
      val badgeText = config.blockedAppFormat.replace("{appName}", appName)
      val appBadge = TextView(context).apply {
        text = badgeText
        textSize = config.badgeTextSize
        typeface = Typeface.DEFAULT_BOLD
        setTextColor(OverlayConfig.parseColorSafe(config.badgeTextColor, Color.parseColor("#F87171")))
        gravity = Gravity.CENTER
        setPadding(0, dpToPx(context, 6), 0, dpToPx(context, 6))
      }
      content.addView(appBadge)
    }

    // 6. Custom Description / Message
    if (config.message.isNotBlank()) {
      val descView = TextView(context).apply {
        text = config.message
        textSize = config.messageSize
        setTextColor(OverlayConfig.parseColorSafe(config.messageColor, Color.parseColor("#94A3B8")))
        gravity = Gravity.CENTER
        setLineSpacing(dpToPx(context, 2).toFloat(), 1.15f)
        setPadding(0, dpToPx(context, 4), 0, dpToPx(context, 20))
      }
      content.addView(descView)
    }

    // 7. Primary Action Button (Return to Focus)
    if (config.showPrimaryButton) {
      val primaryBtn = Button(context).apply {
        text = config.primaryButtonText
        textSize = 14f
        typeface = Typeface.DEFAULT_BOLD
        setTextColor(OverlayConfig.parseColorSafe(config.primaryButtonTextColor, Color.WHITE))

        val btnColor = OverlayConfig.parseColorSafe(config.primaryButtonColor, Color.parseColor("#2563EB"))
        background = GradientDrawable().apply {
          setColor(btnColor)
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
          dismissOverlayInternal("primary_action_clicked")
        }
      }
      content.addView(primaryBtn, LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        dpToPx(context, 48)
      ))
    }

    // 8. Emergency Pass Button (if enabled)
    val emergencyConfig = EmergencyPassConfig.load(context)
    if (emergencyConfig.enabled && emergencyConfig.showButtonOnOverlay) {
      val status = EmergencyPassManager.getStatus(context, blockedPackage)
      val remaining = status["remainingPasses"] as? Int ?: 0
      val isInCooldown = status["isInCooldown"] as? Boolean ?: false
      val cooldownRemainingSeconds = status["cooldownRemainingSeconds"] as? Long ?: 0L

      if (isInCooldown) {
        val cooldownMins = (cooldownRemainingSeconds / 60) + 1
        val cooldownBadge = TextView(context).apply {
          text = "Emergency pass cooldown: ${cooldownMins}m remaining"
          textSize = 12f
          setTextColor(Color.parseColor("#94A3B8"))
          gravity = Gravity.CENTER
          setPadding(0, dpToPx(context, 8), 0, dpToPx(context, 4))
        }
        content.addView(cooldownBadge)
      } else if (remaining > 0) {
        val emergencyBtn = Button(context).apply {
          val labelBuilder = StringBuilder(emergencyConfig.buttonText)
          labelBuilder.append(" (${emergencyConfig.durationMinutes}m)")
          if (emergencyConfig.showRemainingCount) {
            labelBuilder.append(" · $remaining left")
          }
          text = labelBuilder.toString()
          textSize = 13f
          typeface = Typeface.DEFAULT_BOLD
          setTextColor(EmergencyPassConfig.parseColorSafe(emergencyConfig.buttonTextColor, Color.parseColor("#F8FAFC")))

          val btnBg = EmergencyPassConfig.parseColorSafe(emergencyConfig.buttonColor, Color.parseColor("#334155"))
          background = GradientDrawable().apply {
            setColor(btnBg)
            cornerRadius = dpToPx(context, 8).toFloat()
          }
          setPadding(dpToPx(context, 12), dpToPx(context, 8), dpToPx(context, 12), dpToPx(context, 8))

          setOnClickListener {
            EmergencyPassManager.activateEmergencyPass(context, blockedPackage)
          }
        }
        val emergencyParams = LinearLayout.LayoutParams(
          LinearLayout.LayoutParams.MATCH_PARENT,
          dpToPx(context, 42)
        ).apply {
          topMargin = dpToPx(context, 8)
        }
        content.addView(emergencyBtn, emergencyParams)
      } else {
        val exhaustedBadge = TextView(context).apply {
          text = "No emergency passes remaining today"
          textSize = 12f
          setTextColor(Color.parseColor("#EF4444"))
          gravity = Gravity.CENTER
          setPadding(0, dpToPx(context, 8), 0, dpToPx(context, 4))
        }
        content.addView(exhaustedBadge)
      }
    }

    // 9. Secondary Action Button (Exit to Home)
    if (config.showSecondaryButton) {
      val secondaryBtn = Button(context).apply {
        text = config.secondaryButtonText
        textSize = 13f
        setTextColor(OverlayConfig.parseColorSafe(config.secondaryButtonTextColor, Color.parseColor("#94A3B8")))
        setBackgroundColor(Color.TRANSPARENT)
        setOnClickListener {
          val homeIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          }
          context.startActivity(homeIntent)
          dismissOverlayInternal("secondary_action_clicked")
        }
      }
      val homeBtnParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        dpToPx(context, 40)
      ).apply {
        topMargin = dpToPx(context, 6)
      }
      content.addView(secondaryBtn, homeBtnParams)
    }

    root.addView(content, cardParams)
    return root
  }

  private fun dpToPx(context: Context, dp: Int): Int {
    val density = context.resources.displayMetrics.density
    return (dp * density).toInt()
  }
}
