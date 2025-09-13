// android/app/src/main/java/com/snapnative/ble/MinewScannerModule.kt
package com.snapnative.ble

import android.annotation.SuppressLint
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.LifecycleEventListener
import com.minew.beaconplus.sdk.MTCentralManager
import com.minew.beaconplus.sdk.MTPeripheral
import com.minew.beaconplus.sdk.frames.IBeaconFrame
import com.minew.beaconplus.sdk.frames.MinewFrame
import com.minew.beaconplus.sdk.interfaces.MTCentralManagerListener
import java.util.Locale

class MinewScannerModule(
  private val reactCtx: ReactApplicationContext
) : ReactContextBaseJavaModule(reactCtx), LifecycleEventListener {

  companion object {
    private const val EVENT_BEACON = "onBeacon"
  }

  private var central: MTCentralManager? = null
  private var running = false
  private var uuidFilter: String? = null

  init {
    reactCtx.addLifecycleEventListener(this)
  }

  override fun getName(): String = "MinewScanner"

  @ReactMethod
  fun isRunning(promise: Promise) = promise.resolve(running)

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun startScan(options: ReadableMap?, promise: Promise) {
    try {
      if (running) { promise.resolve(true); return }

      uuidFilter = options?.getString("uuid")?.lowercase(Locale.ROOT)

      val mgr = MTCentralManager.getInstance(reactCtx.applicationContext)
      central = mgr

      // Detach any previous listener defensively
      mgr.setMTCentralManagerListener(null)

      mgr.setMTCentralManagerListener(object : MTCentralManagerListener {
        override fun onScanedPeripheral(peripherals: List<MTPeripheral>?) {
          peripherals?.forEach { p ->
            val fh = p.mMTFrameHandler ?: return@forEach
            val rssi = fh.rssi
            val frames = fh.advFrames as? ArrayList<MinewFrame> ?: return@forEach
            frames.forEach { f ->
              if (f is IBeaconFrame) {
                val uuid = f.uuid?.lowercase(Locale.ROOT) ?: return@forEach
                if (uuidFilter == null || uuid == uuidFilter) {
                  val map = Arguments.createMap().apply {
                    putString("uuid", uuid)
                    putInt("major", f.major)
                    putInt("minor", f.minor)
                    putInt("rssi", rssi)
                    // Some Minew AARs expose txPower on IBeaconFrame; if not, omit.
                    try {
                      val tx = f.txPower // may not exist on all versions
                      putInt("txPower", tx)
                    } catch (_: Throwable) { }
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                  }
                  emit(EVENT_BEACON, map)
                }
              }
            }
          }
        }
      })

      mgr.startScan()
      running = true
      promise.resolve(true)
    } catch (t: Throwable) {
      promise.reject("MINEW_START_ERROR", t)
    }
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun stopScan(promise: Promise) {
    try {
      central?.apply {
        try { stopScan() } catch (_: Throwable) {}
        setMTCentralManagerListener(null)
      }
      running = false
      promise.resolve(true)
    } catch (t: Throwable) {
      promise.reject("MINEW_STOP_ERROR", t)
    }
  }

  private fun emit(event: String, params: WritableMap) {
    reactCtx
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(event, params)
  }

  override fun onHostResume() {}
  override fun onHostPause() {}
  @SuppressLint("MissingPermission")
  override fun onHostDestroy() {
    try {
      central?.apply {
        try { stopScan() } catch (_: Throwable) {}
        setMTCentralManagerListener(null)
      }
      running = false
    } catch (_: Throwable) { }
  }
}
