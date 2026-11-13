package expo.modules.focuscontrol

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.net.VpnService
import android.util.Log

/**
 * Thread-safe singleton managing active website/domain blocking rules,
 * blocked domain names, and VpnService lifecycle control.
 */
object FocusVpnManager {
  private const val TAG = "FocusVpnManager"
  private const val PREFS_NAME = "expo_focus_control_vpn_prefs"

  private const val KEY_IS_VPN_ACTIVE = "is_vpn_active"
  private const val KEY_BLOCKED_DOMAINS = "blocked_domains"

  @Volatile
  private var isVpnActiveCached: Boolean = false

  @Volatile
  private var blockedDomainsCached: MutableSet<String> = mutableSetOf()

  private var initialized = false

  fun init(context: Context) {
    if (initialized) return
    synchronized(this) {
      if (initialized) return
      val prefs = getPrefs(context)
      isVpnActiveCached = prefs.getBoolean(KEY_IS_VPN_ACTIVE, false)
      val savedSet = prefs.getStringSet(KEY_BLOCKED_DOMAINS, null)
      blockedDomainsCached = savedSet?.toMutableSet() ?: mutableSetOf()
      initialized = true
      Log.d(TAG, "FocusVpnManager initialized: active=$isVpnActiveCached, domains=$blockedDomainsCached")
    }
  }

  private fun getPrefs(context: Context): SharedPreferences {
    return context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  }

  fun setBlockedWebsites(context: Context, domains: List<String>) {
    init(context)
    synchronized(this) {
      val clean = domains.map { cleanDomain(it) }.filter { it.isNotEmpty() }.toMutableSet()
      blockedDomainsCached = clean
      getPrefs(context).edit().putStringSet(KEY_BLOCKED_DOMAINS, clean).commit()
      Log.d(TAG, "SET_BLOCKED_WEBSITES: count=${clean.size}, domains=$clean")
    }
  }

  fun getBlockedWebsites(context: Context): List<String> {
    init(context)
    return synchronized(this) {
      blockedDomainsCached.toList()
    }
  }

  fun isDomainBlocked(domain: String): Boolean {
    val clean = cleanDomain(domain)
    if (clean.isEmpty()) return false
    return synchronized(this) {
      for (blocked in blockedDomainsCached) {
        if (clean == blocked || clean.endsWith(".$blocked")) {
          return true
        }
      }
      false
    }
  }

  private fun cleanDomain(raw: String): String {
    return raw.trim().lowercase()
      .removePrefix("http://")
      .removePrefix("https://")
      .removePrefix("www.")
      .split("/")[0]
      .split(":")[0]
  }

  fun startWebsiteBlocking(context: Context): Boolean {
    init(context)
    val prepareIntent = VpnService.prepare(context)
    if (prepareIntent != null) {
      Log.w(TAG, "VPN permission not yet granted by user")
      return false
    }

    synchronized(this) {
      isVpnActiveCached = true
      getPrefs(context).edit().putBoolean(KEY_IS_VPN_ACTIVE, true).commit()

      val intent = Intent(context, FocusVpnService::class.java).apply {
        action = FocusVpnService.ACTION_START_VPN
      }
      context.startService(intent)
      Log.d(TAG, "START_WEBSITE_BLOCKING: VPN starting")
      return true
    }
  }

  fun stopWebsiteBlocking(context: Context) {
    init(context)
    synchronized(this) {
      isVpnActiveCached = false
      getPrefs(context).edit().putBoolean(KEY_IS_VPN_ACTIVE, false).commit()

      val intent = Intent(context, FocusVpnService::class.java).apply {
        action = FocusVpnService.ACTION_STOP_VPN
      }
      context.startService(intent)
      Log.d(TAG, "STOP_WEBSITE_BLOCKING: VPN stopped")
    }
  }

  fun isWebsiteBlockingActive(context: Context): Boolean {
    init(context)
    return isVpnActiveCached && FocusVpnService.isRunning
  }

  fun getWebsiteBlockingStatus(context: Context): Map<String, Any> {
    init(context)
    return mapOf(
      "isActive" to (isVpnActiveCached && FocusVpnService.isRunning),
      "blockedWebsites" to getBlockedWebsites(context),
      "vpnServiceRunning" to FocusVpnService.isRunning
    )
  }
}

