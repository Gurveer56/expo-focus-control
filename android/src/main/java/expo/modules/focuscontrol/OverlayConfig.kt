package expo.modules.focuscontrol

import android.content.Context
import android.content.SharedPreferences
import android.graphics.Color
import android.util.Log
import org.json.JSONObject

/**
 * Data model and persistence for user-customizable blocking overlay UI.
 */
data class OverlayConfig(
  // Text content
  val title: String = "Focus Mode Active",
  val message: String = "Stay committed to your focus session. This app will be unblocked once your session ends.",
  val iconEmoji: String = "🛡️",
  val customIconUri: String = "",
  val showAppIcon: Boolean = true,
  val showBlockedAppName: Boolean = true,
  val blockedAppFormat: String = "{appName} is blocked",

  // Primary Button
  val showPrimaryButton: Boolean = true,
  val primaryButtonText: String = "Return to Focus",
  val primaryButtonColor: String = "#2563EB",
  val primaryButtonTextColor: String = "#FFFFFF",

  // Secondary Button
  val showSecondaryButton: Boolean = true,
  val secondaryButtonText: String = "Exit to Home Screen",
  val secondaryButtonTextColor: String = "#94A3B8",

  // Card & Background Styling
  val backgroundColor: String = "#EE0F172A",
  val cardBackgroundColor: String = "#1E293B",
  val cardBorderColor: String = "#334155",
  val cardBorderWidth: Int = 1,
  val cardCornerRadius: Int = 20,
  val cardMaxWidth: Int = 320,

  // Text Styling
  val titleColor: String = "#F8FAFC",
  val titleSize: Float = 22f,
  val messageColor: String = "#94A3B8",
  val messageSize: Float = 13f,
  val iconSize: Float = 44f,
  val badgeTextColor: String = "#F87171",
  val badgeTextSize: Float = 15f,

  // Layout & Alignment
  val cardAlignment: String = "center" // "center" | "top" | "bottom"
) {
  companion object {
    private const val TAG = "OverlayConfig"
    private const val PREFS_NAME = "expo_focus_control_overlay_prefs"
    private const val KEY_CONFIG_JSON = "overlay_config_json"

    fun load(context: Context): OverlayConfig {
      val prefs = getPrefs(context)
      val jsonStr = prefs.getString(KEY_CONFIG_JSON, null) ?: return OverlayConfig()
      return try {
        val json = JSONObject(jsonStr)
        OverlayConfig(
          title = json.optString("title", "Focus Mode Active"),
          message = json.optString("message", "Stay committed to your focus session. This app will be unblocked once your session ends."),
          iconEmoji = json.optString("iconEmoji", "🛡️"),
          customIconUri = json.optString("customIconUri", ""),
          showAppIcon = json.optBoolean("showAppIcon", true),
          showBlockedAppName = json.optBoolean("showBlockedAppName", true),
          blockedAppFormat = json.optString("blockedAppFormat", "{appName} is blocked"),
          showPrimaryButton = json.optBoolean("showPrimaryButton", true),
          primaryButtonText = json.optString("primaryButtonText", "Return to Focus"),
          primaryButtonColor = json.optString("primaryButtonColor", "#2563EB"),
          primaryButtonTextColor = json.optString("primaryButtonTextColor", "#FFFFFF"),
          showSecondaryButton = json.optBoolean("showSecondaryButton", true),
          secondaryButtonText = json.optString("secondaryButtonText", "Exit to Home Screen"),
          secondaryButtonTextColor = json.optString("secondaryButtonTextColor", "#94A3B8"),
          backgroundColor = json.optString("backgroundColor", "#EE0F172A"),
          cardBackgroundColor = json.optString("cardBackgroundColor", "#1E293B"),
          cardBorderColor = json.optString("cardBorderColor", "#334155"),
          cardBorderWidth = json.optInt("cardBorderWidth", 1),
          cardCornerRadius = json.optInt("cardCornerRadius", 20),
          cardMaxWidth = json.optInt("cardMaxWidth", 320),
          titleColor = json.optString("titleColor", "#F8FAFC"),
          titleSize = json.optDouble("titleSize", 22.0).toFloat(),
          messageColor = json.optString("messageColor", "#94A3B8"),
          messageSize = json.optDouble("messageSize", 13.0).toFloat(),
          iconSize = json.optDouble("iconSize", 44.0).toFloat(),
          badgeTextColor = json.optString("badgeTextColor", "#F87171"),
          badgeTextSize = json.optDouble("badgeTextSize", 15.0).toFloat(),
          cardAlignment = json.optString("cardAlignment", "center")
        )
      } catch (e: Exception) {
        Log.e(TAG, "Error parsing saved OverlayConfig: ${e.message}", e)
        OverlayConfig()
      }
    }

    fun save(context: Context, map: Map<String, Any?>) {
      val json = JSONObject()
      for ((key, value) in map) {
        if (value != null) {
          json.put(key, value)
        }
      }
      getPrefs(context).edit().putString(KEY_CONFIG_JSON, json.toString()).apply()
      Log.d(TAG, "Custom OverlayConfig saved: $json")
    }

    fun reset(context: Context) {
      getPrefs(context).edit().remove(KEY_CONFIG_JSON).apply()
      Log.d(TAG, "OverlayConfig reset to defaults")
    }

    private fun getPrefs(context: Context): SharedPreferences {
      return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun parseColorSafe(colorString: String, defaultColor: Int): Int {
      return try {
        Color.parseColor(colorString)
      } catch (e: Exception) {
        defaultColor
      }
    }
  }

  fun toMap(): Map<String, Any> {
    return mapOf(
      "title" to title,
      "message" to message,
      "iconEmoji" to iconEmoji,
      "customIconUri" to customIconUri,
      "showAppIcon" to showAppIcon,
      "showBlockedAppName" to showBlockedAppName,
      "blockedAppFormat" to blockedAppFormat,
      "showPrimaryButton" to showPrimaryButton,
      "primaryButtonText" to primaryButtonText,
      "primaryButtonColor" to primaryButtonColor,
      "primaryButtonTextColor" to primaryButtonTextColor,
      "showSecondaryButton" to showSecondaryButton,
      "secondaryButtonText" to secondaryButtonText,
      "secondaryButtonTextColor" to secondaryButtonTextColor,
      "backgroundColor" to backgroundColor,
      "cardBackgroundColor" to cardBackgroundColor,
      "cardBorderColor" to cardBorderColor,
      "cardBorderWidth" to cardBorderWidth,
      "cardCornerRadius" to cardCornerRadius,
      "cardMaxWidth" to cardMaxWidth,
      "titleColor" to titleColor,
      "titleSize" to titleSize,
      "messageColor" to messageColor,
      "messageSize" to messageSize,
      "iconSize" to iconSize,
      "badgeTextColor" to badgeTextColor,
      "badgeTextSize" to badgeTextSize,
      "cardAlignment" to cardAlignment
    )
  }
}

