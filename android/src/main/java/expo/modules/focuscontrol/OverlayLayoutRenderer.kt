package expo.modules.focuscontrol

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Outline
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.util.Base64
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.widget.Button
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/**
 * Native Android View hierarchy renderer for block-based blocking overlay layouts.
 * Converts a JSON configuration into native Android Views with full styling,
 * template substitution ({appName}, {remainingPasses}, {durationMinutes}),
 * interactive button actions, and custom image rendering.
 */
object OverlayLayoutRenderer {
  private const val TAG = "OverlayLayoutRenderer"

  /**
   * Render the layout JSON into a full-screen root View.
   * Returns null if parsing fails.
   */
  fun render(context: Context, layoutJson: String, blockedPackage: String): View? {
    return try {
      val rootJson = JSONObject(layoutJson)
      buildRootView(context, rootJson, blockedPackage)
    } catch (e: Exception) {
      Log.e(TAG, "Failed to render custom overlay layout: ${e.message}", e)
      null
    }
  }

  @SuppressLint("SetTextI18n")
  private fun buildRootView(context: Context, rootJson: JSONObject, blockedPackage: String): View {
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

    val emergencyStatus = try {
      EmergencyPassManager.getStatus(context, blockedPackage)
    } catch (e: Exception) {
      emptyMap<String, Any?>()
    }
    val remainingPasses = (emergencyStatus["remainingPasses"] as? Int ?: 0).toString()
    val durationMinutes = (emergencyStatus["durationMinutes"] as? Int ?: 5).toString()

    val templateVars = mapOf(
      "{appName}" to appName,
      "{remainingPasses}" to remainingPasses,
      "{durationMinutes}" to durationMinutes
    )

    // Full screen outer container
    val rootContainer = FrameLayout(context).apply {
      val bgColor = parseColorSafe(rootJson.optString("backgroundColor"), Color.parseColor("#EE0D1117"))
      setBackgroundColor(bgColor)
      isClickable = true
      isFocusable = true
    }

    val pt = dpToPx(context, rootJson.optInt("paddingTop", rootJson.optInt("paddingVertical", 48)))
    val pb = dpToPx(context, rootJson.optInt("paddingBottom", rootJson.optInt("paddingVertical", 32)))
    val pl = dpToPx(context, rootJson.optInt("paddingLeft", rootJson.optInt("paddingHorizontal", 24)))
    val pr = dpToPx(context, rootJson.optInt("paddingRight", rootJson.optInt("paddingHorizontal", 24)))

    // Main vertical content column
    val mainCol = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      setPadding(pl, pt, pr, pb)
    }

    val maxWidth = rootJson.optInt("cardMaxWidth", 0)
    val colParams = FrameLayout.LayoutParams(
      if (maxWidth > 0) dpToPx(context, maxWidth) else FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT
    ).apply {
      gravity = Gravity.CENTER_HORIZONTAL
    }

    val blocksArray = rootJson.optJSONArray("blocks") ?: JSONArray()
    for (i in 0 until blocksArray.length()) {
      val blockObj = blocksArray.optJSONObject(i) ?: continue
      val childView = renderBlock(context, blockObj, blockedPackage, templateVars)
      if (childView != null) {
        mainCol.addView(childView)
      }
    }

    rootContainer.addView(mainCol, colParams)
    return rootContainer
  }

  private fun renderBlock(
    context: Context,
    block: JSONObject,
    blockedPackage: String,
    templateVars: Map<String, String>
  ): View? {
    val type = block.optString("type", "").lowercase().trim()
    return when (type) {
      "text" -> renderTextBlock(context, block, templateVars)
      "button" -> renderButtonBlock(context, block, blockedPackage, templateVars)
      "icon" -> renderIconBlock(context, block, blockedPackage)
      "image" -> renderImageBlock(context, block)
      "badge" -> renderBadgeBlock(context, block, templateVars)
      "spacer" -> renderSpacerBlock(context, block)
      "divider" -> renderDividerBlock(context, block)
      "card" -> renderCardBlock(context, block, blockedPackage, templateVars)
      "row" -> renderRowBlock(context, block, blockedPackage, templateVars)
      else -> {
        Log.w(TAG, "Unknown block type: $type")
        null
      }
    }
  }

  // ── Text Block ──────────────────────────────────────────────────────────

  private fun renderTextBlock(
    context: Context,
    block: JSONObject,
    templateVars: Map<String, String>
  ): View {
    val rawText = block.optString("text", "")
    val text = substituteVariables(rawText, templateVars)
    val color = parseColorSafe(block.optString("color", "#FFFFFF"), Color.WHITE)
    val sizeSp = block.optDouble("fontSize", 16.0).toFloat()
    val isBold = block.optString("fontWeight", "normal").equals("bold", ignoreCase = true)
    val alignStr = block.optString("textAlign", "center").lowercase()

    val textView = TextView(context).apply {
      this.text = text
      textSize = sizeSp
      setTextColor(color)
      typeface = if (isBold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
      gravity = when (alignStr) {
        "left", "start" -> Gravity.START
        "right", "end" -> Gravity.END
        else -> Gravity.CENTER_HORIZONTAL
      }
      val lineHeightDp = block.optInt("lineHeight", 0)
      if (lineHeightDp > 0) {
        setLineSpacing(dpToPx(context, lineHeightDp).toFloat() - textSize, 1f)
      }
    }

    val lp = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT
    )
    applyCommonBoxProps(context, block, textView, lp)
    textView.layoutParams = lp
    return textView
  }

  // ── Button Block ────────────────────────────────────────────────────────

  private fun renderButtonBlock(
    context: Context,
    block: JSONObject,
    blockedPackage: String,
    templateVars: Map<String, String>
  ): View {
    val rawText = block.optString("text", "Continue")
    val text = substituteVariables(rawText, templateVars)
    val action = block.optString("action", "close").lowercase()
    val bgColor = parseColorSafe(block.optString("backgroundColor", "#2563EB"), Color.parseColor("#2563EB"))
    val textColor = parseColorSafe(
      block.optString("textColor", block.optString("color", "#FFFFFF")),
      Color.WHITE
    )
    val borderRadius = block.optInt("borderRadius", 12)
    val borderWidth = block.optInt("borderWidth", 0)
    val borderColor = parseColorSafe(block.optString("borderColor", "#00000000"), Color.TRANSPARENT)
    val sizeSp = block.optDouble("fontSize", 15.0).toFloat()
    val isBold = !block.optString("fontWeight", "bold").equals("normal", ignoreCase = true)
    val heightDp = block.optInt("height", 50)

    val button = Button(context).apply {
      this.text = text
      textSize = sizeSp
      setTextColor(textColor)
      typeface = if (isBold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
      transformationMethod = null // Prevent automatic all-caps

      background = GradientDrawable().apply {
        setColor(bgColor)
        cornerRadius = dpToPx(context, borderRadius).toFloat()
        if (borderWidth > 0) {
          setStroke(dpToPx(context, borderWidth), borderColor)
        }
      }

      setOnClickListener {
        handleButtonAction(context, action, blockedPackage)
      }
    }

    val lp = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      dpToPx(context, heightDp)
    )
    applyCommonBoxProps(context, block, button, lp)
    button.layoutParams = lp
    return button
  }

  private fun handleButtonAction(context: Context, action: String, blockedPackage: String) {
    Log.d(TAG, "Overlay button action clicked: $action (target=$blockedPackage)")
    when (action) {
      "emergency" -> {
        EmergencyPassManager.activateEmergencyPass(context, blockedPackage)
      }
      "gohome", "home" -> {
        val homeIntent = Intent(Intent.ACTION_MAIN).apply {
          addCategory(Intent.CATEGORY_HOME)
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(homeIntent)
        FocusOverlayManager.dismissOverlay("button_action_go_home")
      }
      "close", "dismiss" -> {
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
        FocusOverlayManager.dismissOverlay("button_action_close")
      }
      else -> {
        Log.w(TAG, "Unrecognized button action: $action, defaulting to dismiss")
        FocusOverlayManager.dismissOverlay("button_action_default")
      }
    }
  }

  // ── Icon Block (Circular Container with Image or Emoji + Badge) ─────────

  private fun renderIconBlock(
    context: Context,
    block: JSONObject,
    blockedPackage: String
  ): View {
    val containerSizeDp = block.optInt("containerSize", 88)
    val containerSizePx = dpToPx(context, containerSizeDp)
    val containerColor = parseColorSafe(block.optString("containerColor", "#3B1824"), Color.parseColor("#3B1824"))
    val containerBorderColor = parseColorSafe(block.optString("containerBorderColor", "#EF4444"), Color.parseColor("#EF4444"))
    val containerBorderWidth = block.optInt("containerBorderWidth", 1)

    val imageUri = block.optString("imageUri", block.optString("uri", "")).trim()
    val emoji = block.optString("emoji", "⏳")
    val iconSizeSp = block.optDouble("iconSize", 40.0).toFloat()

    // Outer container for circle + overlapping badge
    val rootWrapper = FrameLayout(context).apply {
      clipChildren = false
      clipToPadding = false
    }

    // Circular background container
    val circleContainer = FrameLayout(context).apply {
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(containerColor)
        if (containerBorderWidth > 0) {
          setStroke(dpToPx(context, containerBorderWidth), containerBorderColor)
        }
      }
    }

    val circleParams = FrameLayout.LayoutParams(containerSizePx, containerSizePx).apply {
      gravity = Gravity.CENTER
    }

    // Load custom image if provided, else emoji
    var customBitmap: Bitmap? = null
    if (imageUri.isNotBlank()) {
      customBitmap = loadBitmapFromUri(context, imageUri)
    }

    if (customBitmap != null) {
      val iconSizePx = dpToPx(context, iconSizeSp.toInt())
      val imageView = ImageView(context).apply {
        setImageBitmap(customBitmap)
        scaleType = ImageView.ScaleType.FIT_CENTER
      }
      val imgParams = FrameLayout.LayoutParams(iconSizePx, iconSizePx).apply {
        gravity = Gravity.CENTER
      }
      circleContainer.addView(imageView, imgParams)
    } else {
      val emojiView = TextView(context).apply {
        text = emoji
        textSize = iconSizeSp
        gravity = Gravity.CENTER
      }
      val textParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.WRAP_CONTENT,
        FrameLayout.LayoutParams.WRAP_CONTENT
      ).apply {
        gravity = Gravity.CENTER
      }
      circleContainer.addView(emojiView, textParams)
    }

    rootWrapper.addView(circleContainer, circleParams)

    // Optional overlapping app badge at bottom
    val badgeEmoji = block.optString("badgeEmoji", "")
    val badgeImageUri = block.optString("badgeImageUri", "")
    val showAppBadge = block.optBoolean("showAppBadge", false)
    val badgeSizeDp = block.optInt("badgeSize", 28)
    val badgeSizePx = dpToPx(context, badgeSizeDp)
    val badgeBgColor = parseColorSafe(block.optString("badgeBackgroundColor", "#1F2937"), Color.parseColor("#1F2937"))

    if (badgeEmoji.isNotBlank() || badgeImageUri.isNotBlank() || showAppBadge) {
      val badgeContainer = FrameLayout(context).apply {
        background = GradientDrawable().apply {
          shape = GradientDrawable.RECTANGLE
          cornerRadius = dpToPx(context, 8).toFloat()
          setColor(badgeBgColor)
          setStroke(dpToPx(context, 1), Color.parseColor("#374151"))
        }
      }

      if (badgeImageUri.isNotBlank()) {
        val badgeBitmap = loadBitmapFromUri(context, badgeImageUri)
        if (badgeBitmap != null) {
          val badgeImg = ImageView(context).apply {
            setImageBitmap(badgeBitmap)
            scaleType = ImageView.ScaleType.FIT_CENTER
          }
          badgeContainer.addView(badgeImg, FrameLayout.LayoutParams(
            dpToPx(context, (badgeSizeDp * 0.7).toInt()),
            dpToPx(context, (badgeSizeDp * 0.7).toInt())
          ).apply { gravity = Gravity.CENTER })
        }
      } else if (showAppBadge) {
        val appIcon = try {
          context.packageManager.getApplicationIcon(blockedPackage)
        } catch (e: Exception) {
          null
        }
        if (appIcon != null) {
          val badgeImg = ImageView(context).apply {
            setImageDrawable(appIcon)
            scaleType = ImageView.ScaleType.FIT_CENTER
          }
          badgeContainer.addView(badgeImg, FrameLayout.LayoutParams(
            dpToPx(context, (badgeSizeDp * 0.75).toInt()),
            dpToPx(context, (badgeSizeDp * 0.75).toInt())
          ).apply { gravity = Gravity.CENTER })
        }
      } else if (badgeEmoji.isNotBlank()) {
        val badgeText = TextView(context).apply {
          text = badgeEmoji
          textSize = (badgeSizeDp * 0.5f)
          gravity = Gravity.CENTER
        }
        badgeContainer.addView(badgeText, FrameLayout.LayoutParams(
          FrameLayout.LayoutParams.WRAP_CONTENT,
          FrameLayout.LayoutParams.WRAP_CONTENT
        ).apply { gravity = Gravity.CENTER })
      }

      val badgeParams = FrameLayout.LayoutParams(badgeSizePx, badgeSizePx).apply {
        gravity = Gravity.CENTER_HORIZONTAL or Gravity.BOTTOM
        bottomMargin = dpToPx(context, 2)
      }
      rootWrapper.addView(badgeContainer, badgeParams)
    }

    val alignSelf = block.optString("alignSelf", "center").lowercase()
    val linearGravity = when (alignSelf) {
      "left", "start" -> Gravity.START
      "right", "end" -> Gravity.END
      else -> Gravity.CENTER_HORIZONTAL
    }

    val lp = LinearLayout.LayoutParams(
      containerSizePx + dpToPx(context, 16),
      containerSizePx + dpToPx(context, 16)
    ).apply {
      gravity = linearGravity
    }
    applyCommonBoxProps(context, block, rootWrapper, lp)
    rootWrapper.layoutParams = lp
    return rootWrapper
  }

  // ── Image Block ─────────────────────────────────────────────────────────

  private fun renderImageBlock(context: Context, block: JSONObject): View? {
    val uriStr = block.optString("uri", block.optString("imageUri", "")).trim()
    if (uriStr.isBlank()) return null

    val bitmap = loadBitmapFromUri(context, uriStr) ?: return null

    val widthDp = block.optInt("width", 120)
    val heightDp = block.optInt("height", 120)
    val borderRadius = block.optInt("borderRadius", 0)

    val imageView = ImageView(context).apply {
      setImageBitmap(bitmap)
      scaleType = when (block.optString("resizeMode", "fit").lowercase()) {
        "crop", "center_crop" -> ImageView.ScaleType.CENTER_CROP
        "center" -> ImageView.ScaleType.CENTER
        else -> ImageView.ScaleType.FIT_CENTER
      }
      if (borderRadius > 0 && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        clipToOutline = true
        outlineProvider = object : ViewOutlineProvider() {
          override fun getOutline(view: View, outline: Outline) {
            outline.setRoundRect(0, 0, view.width, view.height, dpToPx(context, borderRadius).toFloat())
          }
        }
      }
    }

    val alignSelf = block.optString("alignSelf", "center").lowercase()
    val lp = LinearLayout.LayoutParams(
      if (widthDp > 0) dpToPx(context, widthDp) else LinearLayout.LayoutParams.WRAP_CONTENT,
      if (heightDp > 0) dpToPx(context, heightDp) else LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply {
      gravity = when (alignSelf) {
        "left", "start" -> Gravity.START
        "right", "end" -> Gravity.END
        else -> Gravity.CENTER_HORIZONTAL
      }
    }
    applyCommonBoxProps(context, block, imageView, lp)
    imageView.layoutParams = lp
    return imageView
  }

  // ── Badge Block (Pill) ──────────────────────────────────────────────────

  private fun renderBadgeBlock(
    context: Context,
    block: JSONObject,
    templateVars: Map<String, String>
  ): View {
    val rawText = block.optString("text", "")
    val text = substituteVariables(rawText, templateVars)
    val color = parseColorSafe(
      block.optString("textColor", block.optString("color", "#22C55E")),
      Color.parseColor("#22C55E")
    )
    val bgColor = parseColorSafe(block.optString("backgroundColor", "#1E293B"), Color.parseColor("#1E293B"))
    val sizeSp = block.optDouble("fontSize", 13.0).toFloat()
    val isBold = block.optString("fontWeight", "normal").equals("bold", ignoreCase = true)
    val borderRadius = block.optInt("borderRadius", 16)
    val pv = dpToPx(context, block.optInt("paddingVertical", 6))
    val ph = dpToPx(context, block.optInt("paddingHorizontal", 14))

    val badgeView = TextView(context).apply {
      this.text = text
      textSize = sizeSp
      setTextColor(color)
      typeface = if (isBold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
      gravity = Gravity.CENTER
      setPadding(ph, pv, ph, pv)

      background = GradientDrawable().apply {
        setColor(bgColor)
        cornerRadius = dpToPx(context, borderRadius).toFloat()
        val borderWidth = block.optInt("borderWidth", 0)
        if (borderWidth > 0) {
          val borderColor = parseColorSafe(block.optString("borderColor", "#334155"), Color.parseColor("#334155"))
          setStroke(dpToPx(context, borderWidth), borderColor)
        }
      }
    }

    val alignSelf = block.optString("alignSelf", "center").lowercase()
    val lp = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.WRAP_CONTENT,
      LinearLayout.LayoutParams.WRAP_CONTENT
    ).apply {
      gravity = when (alignSelf) {
        "left", "start" -> Gravity.START
        "right", "end" -> Gravity.END
        else -> Gravity.CENTER_HORIZONTAL
      }
    }
    applyCommonBoxProps(context, block, badgeView, lp)
    badgeView.layoutParams = lp
    return badgeView
  }

  // ── Spacer Block ────────────────────────────────────────────────────────

  private fun renderSpacerBlock(context: Context, block: JSONObject): View {
    val sizeDp = block.optInt("size", 0)
    val flex = block.optDouble("flex", if (sizeDp > 0) 0.0 else 1.0).toFloat()

    val spacer = View(context)
    val lp = if (flex > 0f) {
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, flex)
    } else {
      LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dpToPx(context, sizeDp))
    }
    spacer.layoutParams = lp
    return spacer
  }

  // ── Divider Block ───────────────────────────────────────────────────────

  private fun renderDividerBlock(context: Context, block: JSONObject): View {
    val thicknessDp = block.optInt("thickness", 1)
    val color = parseColorSafe(block.optString("color", "#334155"), Color.parseColor("#334155"))

    val divider = View(context).apply {
      setBackgroundColor(color)
    }
    val lp = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      dpToPx(context, thicknessDp)
    )
    applyCommonBoxProps(context, block, divider, lp)
    divider.layoutParams = lp
    return divider
  }

  // ── Card Block (Grouped Container) ──────────────────────────────────────

  private fun renderCardBlock(
    context: Context,
    block: JSONObject,
    blockedPackage: String,
    templateVars: Map<String, String>
  ): View {
    val bgColor = parseColorSafe(block.optString("backgroundColor", "#1E293B"), Color.parseColor("#1E293B"))
    val borderColor = parseColorSafe(block.optString("borderColor", "#334155"), Color.parseColor("#334155"))
    val borderWidth = block.optInt("borderWidth", 1)
    val borderRadius = block.optInt("borderRadius", 16)

    val card = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_HORIZONTAL
      background = GradientDrawable().apply {
        setColor(bgColor)
        cornerRadius = dpToPx(context, borderRadius).toFloat()
        if (borderWidth > 0) {
          setStroke(dpToPx(context, borderWidth), borderColor)
        }
      }
    }

    val pt = dpToPx(context, block.optInt("paddingTop", block.optInt("paddingVertical", block.optInt("padding", 16))))
    val pb = dpToPx(context, block.optInt("paddingBottom", block.optInt("paddingVertical", block.optInt("padding", 16))))
    val pl = dpToPx(context, block.optInt("paddingLeft", block.optInt("paddingHorizontal", block.optInt("padding", 16))))
    val pr = dpToPx(context, block.optInt("paddingRight", block.optInt("paddingHorizontal", block.optInt("padding", 16))))
    card.setPadding(pl, pt, pr, pb)

    val children = block.optJSONArray("children") ?: JSONArray()
    for (i in 0 until children.length()) {
      val childObj = children.optJSONObject(i) ?: continue
      val childView = renderBlock(context, childObj, blockedPackage, templateVars)
      if (childView != null) {
        card.addView(childView)
      }
    }

    val maxWidth = block.optInt("maxWidth", 0)
    val lp = LinearLayout.LayoutParams(
      if (maxWidth > 0) dpToPx(context, maxWidth) else LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT
    )
    applyCommonBoxProps(context, block, card, lp)
    card.layoutParams = lp
    return card
  }

  // ── Row Block (Horizontal Flex Container) ───────────────────────────────

  private fun renderRowBlock(
    context: Context,
    block: JSONObject,
    blockedPackage: String,
    templateVars: Map<String, String>
  ): View {
    val row = LinearLayout(context).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = when (block.optString("alignItems", "center").lowercase()) {
        "flex-start", "top" -> Gravity.TOP
        "flex-end", "bottom" -> Gravity.BOTTOM
        else -> Gravity.CENTER_VERTICAL
      }
    }

    val bgColor = block.optString("backgroundColor", "")
    if (bgColor.isNotBlank()) {
      val bg = parseColorSafe(bgColor, Color.TRANSPARENT)
      val borderRadius = block.optInt("borderRadius", 0)
      val borderWidth = block.optInt("borderWidth", 0)
      val borderColor = parseColorSafe(block.optString("borderColor", "#00000000"), Color.TRANSPARENT)

      row.background = GradientDrawable().apply {
        setColor(bg)
        if (borderRadius > 0) cornerRadius = dpToPx(context, borderRadius).toFloat()
        if (borderWidth > 0) setStroke(dpToPx(context, borderWidth), borderColor)
      }
    }

    val pt = dpToPx(context, block.optInt("paddingTop", block.optInt("paddingVertical", block.optInt("padding", 0))))
    val pb = dpToPx(context, block.optInt("paddingBottom", block.optInt("paddingVertical", block.optInt("padding", 0))))
    val pl = dpToPx(context, block.optInt("paddingLeft", block.optInt("paddingHorizontal", block.optInt("padding", 0))))
    val pr = dpToPx(context, block.optInt("paddingRight", block.optInt("paddingHorizontal", block.optInt("padding", 0))))
    row.setPadding(pl, pt, pr, pb)

    val children = block.optJSONArray("children") ?: JSONArray()
    for (i in 0 until children.length()) {
      val childObj = children.optJSONObject(i) ?: continue
      val childView = renderBlock(context, childObj, blockedPackage, templateVars) ?: continue

      // In a row, support flex weight for children
      val flex = childObj.optDouble("flex", 0.0).toFloat()
      if (flex > 0f) {
        val childLp = childView.layoutParams as? LinearLayout.LayoutParams
          ?: LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT)
        childLp.width = 0
        childLp.weight = flex
        childView.layoutParams = childLp
      }
      row.addView(childView)
    }

    val lp = LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT
    )
    applyCommonBoxProps(context, block, row, lp)
    row.layoutParams = lp
    return row
  }

  // ── Helper Utilities ────────────────────────────────────────────────────

  private fun applyCommonBoxProps(
    context: Context,
    block: JSONObject,
    view: View,
    lp: LinearLayout.LayoutParams
  ) {
    val mt = block.optInt("marginTop", block.optInt("marginVertical", block.optInt("margin", 0)))
    val mb = block.optInt("marginBottom", block.optInt("marginVertical", block.optInt("margin", 0)))
    val ml = block.optInt("marginLeft", block.optInt("marginHorizontal", block.optInt("margin", 0)))
    val mr = block.optInt("marginRight", block.optInt("marginHorizontal", block.optInt("margin", 0)))

    lp.setMargins(
      dpToPx(context, ml),
      dpToPx(context, mt),
      dpToPx(context, mr),
      dpToPx(context, mb)
    )

    // Optional width/height overrides
    val widthDp = block.optInt("width", 0)
    if (widthDp > 0) {
      lp.width = dpToPx(context, widthDp)
    }
    val heightDp = block.optInt("height", 0)
    if (heightDp > 0) {
      lp.height = dpToPx(context, heightDp)
    }
  }

  private fun substituteVariables(text: String, vars: Map<String, String>): String {
    var result = text
    for ((key, value) in vars) {
      result = result.replace(key, value)
    }
    return result
  }

  fun parseColorSafe(colorString: String, defaultColor: Int): Int {
    if (colorString.isBlank()) return defaultColor
    return try {
      Color.parseColor(colorString.trim())
    } catch (e: Exception) {
      defaultColor
    }
  }

  private fun dpToPx(context: Context, dp: Int): Int {
    val density = context.resources.displayMetrics.density
    return (dp * density).toInt()
  }

  private fun loadBitmapFromUri(context: Context, uriStr: String): Bitmap? {
    return try {
      val trimmed = uriStr.trim()
      if (trimmed.startsWith("data:image") && trimmed.contains("base64,")) {
        val base64Data = trimmed.substringAfter("base64,")
        val bytes = Base64.decode(base64Data, Base64.DEFAULT)
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
      } else if (trimmed.startsWith("content://") || trimmed.startsWith("file://")) {
        val uri = Uri.parse(trimmed)
        context.contentResolver.openInputStream(uri)?.use { stream ->
          BitmapFactory.decodeStream(stream)
        }
      } else {
        val file = File(trimmed)
        if (file.exists()) {
          BitmapFactory.decodeFile(file.absolutePath)
        } else {
          null
        }
      }
    } catch (e: Exception) {
      Log.w(TAG, "Failed to load bitmap from uri ($uriStr): ${e.message}")
      null
    }
  }
}

