package expo.modules.focuscontrol

import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build

/**
 * Wraps the Android UsageStatsManager API to query app usage statistics.
 * Requires PACKAGE_USAGE_STATS permission granted through system settings.
 */
class UsageStatsManagerHelper(private val context: Context) {

  private val usageStatsManager: UsageStatsManager?
    get() = context.getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager

  /**
   * Queries usage stats for a time range and returns a serializable map.
   *
   * @param startTime Start of range in Unix ms
   * @param endTime End of range in Unix ms
   * @param excludeSelf Whether to exclude this app from results
   * @param limit Max number of results (0 = no limit)
   * @param sortByUsage Whether to sort by foreground time descending
   */
  fun queryUsageStats(
    startTime: Long,
    endTime: Long,
    excludeSelf: Boolean,
    limit: Int,
    sortByUsage: Boolean
  ): Map<String, Any> {
    val manager = usageStatsManager
      ?: return mapOf(
        "records" to emptyList<Map<String, Any>>(),
        "startTime" to startTime,
        "endTime" to endTime
      )

    val stats: List<UsageStats> = try {
      manager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime)
        ?: emptyList()
    } catch (e: SecurityException) {
      // Usage access not granted
      return mapOf(
        "records" to emptyList<Map<String, Any>>(),
        "startTime" to startTime,
        "endTime" to endTime
      )
    }

    // Aggregate by package name (queryUsageStats may return multiple entries
    // per package for the INTERVAL_DAILY bucket when spanning multiple days)
    val aggregated = mutableMapOf<String, AggregatedUsage>()
    for (stat in stats) {
      val pkg = stat.packageName ?: continue
      val foreground = getTotalForegroundTime(stat)
      if (foreground <= 0) continue

      val existing = aggregated[pkg]
      if (existing != null) {
        existing.totalTimeInForeground += foreground
        if (stat.lastTimeUsed > existing.lastTimeUsed) {
          existing.lastTimeUsed = stat.lastTimeUsed
        }
      } else {
        aggregated[pkg] = AggregatedUsage(
          packageName = pkg,
          totalTimeInForeground = foreground,
          lastTimeUsed = stat.lastTimeUsed
        )
      }
    }

    var records = aggregated.values.toList()

    // Filter out self if requested
    if (excludeSelf) {
      val selfPackage = context.packageName
      records = records.filter { it.packageName != selfPackage }
    }

    // Sort by foreground time descending
    if (sortByUsage) {
      records = records.sortedByDescending { it.totalTimeInForeground }
    }

    // Apply limit
    if (limit > 0 && records.size > limit) {
      records = records.take(limit)
    }

    // Resolve app names and build result
    val pm = context.packageManager
    val resultRecords = records.map { usage ->
      mapOf(
        "packageName" to usage.packageName,
        "totalTimeInForeground" to usage.totalTimeInForeground,
        "lastTimeUsed" to usage.lastTimeUsed,
        "appName" to getAppLabel(pm, usage.packageName)
      )
    }

    return mapOf(
      "records" to resultRecords,
      "startTime" to startTime,
      "endTime" to endTime
    )
  }

  private fun getTotalForegroundTime(stats: UsageStats): Long {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      stats.totalTimeVisible
    } else {
      stats.totalTimeInForeground
    }
  }

  private fun getAppLabel(pm: PackageManager, packageName: String): String {
    return try {
      val appInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        pm.getApplicationInfo(packageName, PackageManager.ApplicationInfoFlags.of(0))
      } else {
        @Suppress("DEPRECATION")
        pm.getApplicationInfo(packageName, 0)
      }
      pm.getApplicationLabel(appInfo).toString()
    } catch (e: PackageManager.NameNotFoundException) {
      packageName
    }
  }

  private data class AggregatedUsage(
    val packageName: String,
    var totalTimeInForeground: Long,
    var lastTimeUsed: Long
  )
}
