package expo.modules.focuscontrol

import android.content.Context
import android.graphics.Color
import org.json.JSONObject

/**
 * Configuration options for the Emergency Pass / Grace Period feature.
 * Allows users to temporarily unlock a blocked app for a fixed duration,
 * with a strictly enforced daily limit and optional cooldown.
 */
data class EmergencyPassConfig(
  val enabled: Boolean = false,
  val durationMinutes: Int = 5,
  val dailyLimit: Int = 3,
  val cooldownMinutes: Int = 0,
  val showButtonOnOverlay: Boolean = true,
  val buttonText: String = "Emergency Access",
  val buttonColor: String = "#334155",
  val buttonTextColor: String = "#F8FAFC",
  val showRemainingCount: Boolean = true,
  val customMessage: String = ""
) {
  fun toMap(): Map<String, Any?> {
    return mapOf(
      "enabled" to enabled,
      "durationMinutes" to durationMinutes,
      "dailyLimit" to dailyLimit,
      "cooldownMinutes" to cooldownMinutes,
      "showButtonOnOverlay" to showButtonOnOverlay,
      "buttonText" to buttonText,
      "buttonColor" to buttonColor,
      "buttonTextColor" to buttonTextColor,
      "showRemainingCount" to showRemainingCount,
      "customMessage" to customMessage
    )
  }

  fun toJson(): String {
    val json = JSONObject()
    json.put("enabled", enabled)
    json.put("durationMinutes", durationMinutes)
    json.put("dailyLimit", dailyLimit)
    json.put("cooldownMinutes", cooldownMinutes)
    json.put("showButtonOnOverlay", showButtonOnOverlay)
    json.put("buttonText", buttonText)
    json.put("buttonColor", buttonColor)
    json.put("buttonTextColor", buttonTextColor)
    json.put("showRemainingCount", showRemainingCount)
    json.put("customMessage", customMessage)
    return json.toString()
  }

  companion object {
    private const val PREFS_NAME = "focus_control_emergency_prefs"
    private const val KEY_CONFIG = "emergency_config_json"

    fun fromJson(jsonStr: String?): EmergencyPassConfig {
      if (jsonStr.isNullOrBlank()) return EmergencyPassConfig()
      return try {
        val json = JSONObject(jsonStr)
        EmergencyPassConfig(
          enabled = json.optBoolean("enabled", false),
          durationMinutes = json.optInt("durationMinutes", 5).coerceAtLeast(1),
          dailyLimit = json.optInt("dailyLimit", 3).coerceAtLeast(0),
          cooldownMinutes = json.optInt("cooldownMinutes", 0).coerceAtLeast(0),
          showButtonOnOverlay = json.optBoolean("showButtonOnOverlay", true),
          buttonText = json.optString("buttonText", "Emergency Access"),
          buttonColor = json.optString("buttonColor", "#334155"),
          buttonTextColor = json.optString("buttonTextColor", "#F8FAFC"),
          showRemainingCount = json.optBoolean("showRemainingCount", true),
          customMessage = json.optString("customMessage", "")
        )
      } catch (e: Exception) {
        EmergencyPassConfig()
      }
    }

    fun fromMap(map: Map<String, Any?>): EmergencyPassConfig {
      val default = EmergencyPassConfig()
      return EmergencyPassConfig(
        enabled = (map["enabled"] as? Boolean) ?: default.enabled,
        durationMinutes = (map["durationMinutes"] as? Number)?.toInt()?.coerceAtLeast(1) ?: default.durationMinutes,
        dailyLimit = (map["dailyLimit"] as? Number)?.toInt()?.coerceAtLeast(0) ?: default.dailyLimit,
        cooldownMinutes = (map["cooldownMinutes"] as? Number)?.toInt()?.coerceAtLeast(0) ?: default.cooldownMinutes,
        showButtonOnOverlay = (map["showButtonOnOverlay"] as? Boolean) ?: default.showButtonOnOverlay,
        buttonText = (map["buttonText"] as? String) ?: default.buttonText,
        buttonColor = (map["buttonColor"] as? String) ?: default.buttonColor,
        buttonTextColor = (map["buttonTextColor"] as? String) ?: default.buttonTextColor,
        showRemainingCount = (map["showRemainingCount"] as? Boolean) ?: default.showRemainingCount,
        customMessage = (map["customMessage"] as? String) ?: default.customMessage
      )
    }

    fun load(context: Context): EmergencyPassConfig {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val json = prefs.getString(KEY_CONFIG, null)
      return fromJson(json)
    }

    fun save(context: Context, config: EmergencyPassConfig) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().putString(KEY_CONFIG, config.toJson()).apply()
    }

    fun save(context: Context, map: Map<String, Any?>) {
      val existing = load(context)
      val updated = EmergencyPassConfig(
        enabled = (map["enabled"] as? Boolean) ?: existing.enabled,
        durationMinutes = (map["durationMinutes"] as? Number)?.toInt()?.coerceAtLeast(1) ?: existing.durationMinutes,
        dailyLimit = (map["dailyLimit"] as? Number)?.toInt()?.coerceAtLeast(0) ?: existing.dailyLimit,
        cooldownMinutes = (map["cooldownMinutes"] as? Number)?.toInt()?.coerceAtLeast(0) ?: existing.cooldownMinutes,
        showButtonOnOverlay = (map["showButtonOnOverlay"] as? Boolean) ?: existing.showButtonOnOverlay,
        buttonText = (map["buttonText"] as? String) ?: existing.buttonText,
        buttonColor = (map["buttonColor"] as? String) ?: existing.buttonColor,
        buttonTextColor = (map["buttonTextColor"] as? String) ?: existing.buttonTextColor,
        showRemainingCount = (map["showRemainingCount"] as? Boolean) ?: existing.showRemainingCount,
        customMessage = (map["customMessage"] as? String) ?: existing.customMessage
      )
      save(context, updated)
    }

    fun reset(context: Context) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().remove(KEY_CONFIG).apply()
    }

    fun parseColorSafe(colorStr: String?, defaultColor: Int): Int {
      if (colorStr.isNullOrBlank()) return defaultColor
      return try {
        Color.parseColor(colorStr.trim())
      } catch (e: Exception) {
        defaultColor
      }
    }
  }
}

