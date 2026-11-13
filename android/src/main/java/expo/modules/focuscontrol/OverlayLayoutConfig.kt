package expo.modules.focuscontrol

import android.content.Context
import android.content.SharedPreferences
import android.util.Log

/**
 * Persistence manager for block-based custom blocking overlay layout.
 * Stores and retrieves the JSON string defining the layout hierarchy.
 */
object OverlayLayoutConfig {
  private const val TAG = "OverlayLayoutConfig"
  private const val PREFS_NAME = "expo_focus_control_overlay_prefs"
  private const val KEY_LAYOUT_JSON = "overlay_layout_json"

  fun load(context: Context): String? {
    val prefs = getPrefs(context)
    val jsonStr = prefs.getString(KEY_LAYOUT_JSON, null)
    return if (jsonStr.isNullOrBlank()) null else jsonStr
  }

  fun save(context: Context, layoutJson: String) {
    getPrefs(context).edit().putString(KEY_LAYOUT_JSON, layoutJson).apply()
    Log.d(TAG, "Custom overlay layout saved (len=${layoutJson.length})")
  }

  fun reset(context: Context) {
    getPrefs(context).edit().remove(KEY_LAYOUT_JSON).apply()
    Log.d(TAG, "Custom overlay layout reset (removed from SharedPreferences)")
  }

  fun hasCustomLayout(context: Context): Boolean {
    return !load(context).isNullOrBlank()
  }

  private fun getPrefs(context: Context): SharedPreferences {
    return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }
}

