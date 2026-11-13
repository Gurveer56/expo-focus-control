package expo.modules.focuscontrol

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.nio.ByteBuffer
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Local DNS sinkhole VPN Service for website and domain level blocking.
 *
 * Intercepts DNS queries on port 53 UDP. If a query matches any blocked domain
 * in FocusVpnManager, returns NXDOMAIN/0.0.0.0 so the browser or webview cannot
 * resolve the website. Non-blocked DNS queries are forwarded to upstream DNS (1.1.1.1).
 *
 * Zero external servers or tracking: all filtering happens 100% locally on-device.
 */
class FocusVpnService : VpnService() {

  companion object {
    private const val TAG = "FocusVpnService"

    const val ACTION_START_VPN = "expo.modules.focuscontrol.ACTION_START_VPN"
    const val ACTION_STOP_VPN = "expo.modules.focuscontrol.ACTION_STOP_VPN"

    private const val VPN_IP = "10.254.1.1"
    private const val DNS_VIRTUAL_IP = "10.254.1.2"
    private const val UPSTREAM_DNS = "1.1.1.1"

    @Volatile
    var isRunning: Boolean = false
      private set
  }

  private var vpnInterface: ParcelFileDescriptor? = null
  private var vpnThread: Thread? = null
  private val isStopping = AtomicBoolean(false)

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_STOP_VPN -> {
        Log.d(TAG, "ACTION_STOP_VPN received")
        stopVpn()
        return START_NOT_STICKY
      }

      ACTION_START_VPN, null -> {
        Log.d(TAG, "ACTION_START_VPN received")
        startVpn()
        return START_STICKY
      }
    }
    return START_NOT_STICKY
  }

  @Synchronized
  private fun startVpn() {
    if (isRunning) {
      Log.d(TAG, "VPN already running")
      return
    }

    try {
      FocusVpnManager.init(this)
      val builder = Builder()
        .setSession("FocusControl Website Blocker")
        .addAddress(VPN_IP, 32)
        .addDnsServer(DNS_VIRTUAL_IP)
        .addRoute(DNS_VIRTUAL_IP, 32)

      vpnInterface = builder.establish()
      if (vpnInterface == null) {
        Log.e(TAG, "Failed to establish VPN interface")
        return
      }

      isStopping.set(false)
      isRunning = true

      vpnThread = Thread(::runVpnLoop, "FocusVpnThread").apply {
        priority = Thread.MAX_PRIORITY
        start()
      }

      Log.d(TAG, "FocusVpnService successfully established and running")
    } catch (e: Exception) {
      Log.e(TAG, "Error starting VPN: ${e.message}", e)
      stopVpn()
    }
  }

  private fun runVpnLoop() {
    val pfd = vpnInterface ?: return
    val inputStream = FileInputStream(pfd.fileDescriptor)
    val outputStream = FileOutputStream(pfd.fileDescriptor)
    val packet = ByteArray(4096)

    var upstreamSocket: DatagramSocket? = null
    try {
      upstreamSocket = DatagramSocket()
      protect(upstreamSocket) // Crucial: protect upstream socket so its traffic bypasses VPN loop!
      upstreamSocket.soTimeout = 2000

      val upstreamAddr = InetAddress.getByName(UPSTREAM_DNS)

      while (!isStopping.get() && !Thread.currentThread().isInterrupted) {
        val length = inputStream.read(packet)
        if (length <= 0) break

        // We only inspect IPv4 packets (first nibble == 4)
        val version = (packet[0].toInt() shr 4) and 0x0F
        if (version != 4) continue

        val protocol = packet[9].toInt() and 0xFF
        val ihl = (packet[0].toInt() and 0x0F) * 4

        // Protocol 17 = UDP
        if (protocol != 17 || length < ihl + 8) continue

        val srcPort = ((packet[ihl].toInt() and 0xFF) shl 8) or (packet[ihl + 1].toInt() and 0xFF)
        val dstPort = ((packet[ihl + 2].toInt() and 0xFF) shl 8) or (packet[ihl + 3].toInt() and 0xFF)
        val udpLength = ((packet[ihl + 4].toInt() and 0xFF) shl 8) or (packet[ihl + 5].toInt() and 0xFF)

        // Only process DNS destination port 53
        if (dstPort != 53 || udpLength < 8) continue

        val dnsDataOffset = ihl + 8
        val dnsDataLength = length - dnsDataOffset

        val domain = extractDnsQueryDomain(packet, dnsDataOffset, dnsDataLength)
        if (domain != null) {
          val isBlocked = FocusVpnManager.isDomainBlocked(domain)
          if (isBlocked) {
            Log.d(TAG, "BLOCKED_DOMAIN_INTERCEPTED: $domain")
            // Send synthetic NXDOMAIN response
            val nxResponse = buildNxDomainResponse(packet, ihl, dnsDataOffset, dnsDataLength)
            if (nxResponse != null) {
              outputStream.write(nxResponse)
              outputStream.flush()
            }
            continue
          }
        }

        // Forward allowed DNS query to upstream DNS
        try {
          val sendPacket = DatagramPacket(packet, dnsDataOffset, dnsDataLength, upstreamAddr, 53)
          upstreamSocket.send(sendPacket)

          val recvBuf = ByteArray(2048)
          val recvPacket = DatagramPacket(recvBuf, recvBuf.size)
          upstreamSocket.receive(recvPacket)

          // Build IP + UDP reply packet back to TUN
          val replyPacket = buildReplyPacket(
            packet,
            ihl,
            srcPort,
            dstPort,
            recvPacket.data,
            recvPacket.length
          )
          if (replyPacket != null) {
            outputStream.write(replyPacket)
            outputStream.flush()
          }
        } catch (e: Exception) {
          // Timeout or network drop; ignore and continue loop
        }
      }
    } catch (e: Exception) {
      if (!isStopping.get()) {
        Log.e(TAG, "Exception in VPN loop: ${e.message}")
      }
    } finally {
      try {
        upstreamSocket?.close()
      } catch (ignored: Exception) {}
      Log.d(TAG, "VPN processing loop exited")
    }
  }

  /**
   * Simple parser extracting QNAME from DNS query payload.
   */
  private fun extractDnsQueryDomain(data: ByteArray, offset: Int, length: Int): String? {
    if (length < 12) return null
    var pos = offset + 12 // Skip DNS header (12 bytes)
    val maxPos = offset + length
    val sb = StringBuilder()

    while (pos < maxPos) {
      val labelLen = data[pos].toInt() and 0xFF
      pos++
      if (labelLen == 0) break // End of domain
      if (pos + labelLen > maxPos) return null

      if (sb.isNotEmpty()) sb.append('.')
      for (i in 0 until labelLen) {
        sb.append(data[pos + i].toInt().toChar())
      }
      pos += labelLen
    }

    return if (sb.isNotEmpty()) sb.toString() else null
  }

  /**
   * Crafts an NXDOMAIN DNS response packet.
   */
  private fun buildNxDomainResponse(
    origPacket: ByteArray,
    ihl: Int,
    dnsOffset: Int,
    dnsLen: Int
  ): ByteArray? {
    if (dnsLen < 12) return null
    val dnsResp = origPacket.copyOfRange(dnsOffset, dnsOffset + dnsLen)

    // Set QR=1 (Response), RCODE=3 (NXDOMAIN)
    dnsResp[2] = (dnsResp[2].toInt() or 0x81).toByte()
    dnsResp[3] = (dnsResp[3].toInt() or 0x03).toByte()

    val srcPort = ((origPacket[ihl].toInt() and 0xFF) shl 8) or (origPacket[ihl + 1].toInt() and 0xFF)
    val dstPort = ((origPacket[ihl + 2].toInt() and 0xFF) shl 8) or (origPacket[ihl + 3].toInt() and 0xFF)

    return buildReplyPacket(origPacket, ihl, srcPort, dstPort, dnsResp, dnsResp.size)
  }

  /**
   * Constructs an IPv4 + UDP packet with swapped source/dest IPs and ports.
   */
  private fun buildReplyPacket(
    origPacket: ByteArray,
    ihl: Int,
    origSrcPort: Int,
    origDstPort: Int,
    payload: ByteArray,
    payloadLen: Int
  ): ByteArray? {
    val totalLen = 20 + 8 + payloadLen
    val buf = ByteBuffer.allocate(totalLen)

    // IPv4 Header
    buf.put(0x45.toByte()) // Version 4, IHL 5
    buf.put(0x00.toByte()) // TOS
    buf.putShort(totalLen.toShort())
    buf.putShort(0.toShort()) // ID
    buf.putShort(0x4000.toShort()) // Flags (Don't fragment)
    buf.put(64.toByte()) // TTL
    buf.put(17.toByte()) // Protocol: UDP
    buf.putShort(0.toShort()) // Checksum placeholder

    // Swap IPs: Orig Dst becomes new Src, Orig Src becomes new Dst
    buf.put(origPacket, 16, 4) // Src IP = Virtual DNS IP
    buf.put(origPacket, 12, 4) // Dst IP = Client IP

    // Calculate IPv4 Header Checksum
    val headerBytes = buf.array()
    var checksum = 0
    for (i in 0 until 20 step 2) {
      if (i == 10) continue // Skip checksum field
      val w = ((headerBytes[i].toInt() and 0xFF) shl 8) or (headerBytes[i + 1].toInt() and 0xFF)
      checksum += w
    }
    while (checksum shr 16 != 0) {
      checksum = (checksum and 0xFFFF) + (checksum shr 16)
    }
    val finalIpChecksum = (checksum.inv() and 0xFFFF).toShort()
    buf.putShort(10, finalIpChecksum)

    // UDP Header
    buf.position(20)
    buf.putShort(origDstPort.toShort()) // Src Port = 53
    buf.putShort(origSrcPort.toShort()) // Dst Port = Orig Client Port
    buf.putShort((8 + payloadLen).toShort()) // UDP Length
    buf.putShort(0.toShort()) // UDP Checksum (0 = optional in IPv4)

    // Payload
    buf.put(payload, 0, payloadLen)

    return buf.array()
  }

  @Synchronized
  private fun stopVpn() {
    if (!isRunning) return
    isStopping.set(true)
    isRunning = false

    try {
      vpnThread?.interrupt()
      vpnThread = null
      vpnInterface?.close()
      vpnInterface = null
    } catch (e: Exception) {
      Log.e(TAG, "Error closing VPN: ${e.message}")
    } finally {
      stopSelf()
      Log.d(TAG, "FocusVpnService stopped")
    }
  }

  override fun onRevoke() {
    super.onRevoke()
    Log.d(TAG, "FocusVpnService revoked by system or user")
    stopVpn()
  }

  override fun onDestroy() {
    super.onDestroy()
    Log.d(TAG, "FocusVpnService destroyed")
    stopVpn()
  }
}
