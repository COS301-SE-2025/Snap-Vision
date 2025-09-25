// android/app/src/main/java/com/snapnative/ble/MinewScannerModule.kt
package com.snapnative.ble

import android.annotation.SuppressLint
import android.util.Log
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
    private const val EVENT_DEBUG  = "onBeaconDebug"
    private const val TAG = "MinewScanner"
  }

  private var central: MTCentralManager? = null
  private var running = false
  private var uuidFilter: String? = null

  init {
    reactCtx.addLifecycleEventListener(this)
  }

  override fun getName(): String = "MinewScanner"

  // NativeEventEmitter compatibility
  @ReactMethod fun addListener(eventName: String) { /* no-op */ }
  @ReactMethod fun removeListeners(count: Int) { /* no-op */ }

  @ReactMethod
  fun isRunning(promise: Promise) {
    promise.resolve(running)
  }

  @SuppressLint("MissingPermission")
  @ReactMethod
  fun startScan(options: ReadableMap?, promise: Promise) {
    try {
      if (running) { promise.resolve(true); return }

      // Optional UUID filter
      uuidFilter = options?.getString("uuid")?.lowercase(Locale.ROOT)

      // Debug: scan starting
      Arguments.createMap().apply {
        putString("message", "Starting Minew scanner")
        putString("uuidFilter", uuidFilter ?: "none")
      }.also { emit(EVENT_DEBUG, it) }

      val mgr = MTCentralManager.getInstance(reactCtx.applicationContext)
      central = mgr

      // Clear any previous listener
      mgr.setMTCentralManagerListener(null)

      mgr.setMTCentralManagerListener(object : MTCentralManagerListener {
        override fun onScanedPeripheral(peripherals: List<MTPeripheral>?) {
          val count = peripherals?.size ?: 0

          // Debug: number of peripherals
          Arguments.createMap().apply {
            putString("message", "Detected peripherals")
            putInt("count", count)
          }.also { emit(EVENT_DEBUG, it) }

          peripherals?.forEach { p ->
            try {
              val fh = p.mMTFrameHandler ?: return@forEach
              val rssi = fh.rssi
              val frames = fh.advFrames as? ArrayList<MinewFrame> ?: return@forEach

              // Debug: frame count
              Arguments.createMap().apply {
                putString("message", "Advertisement frames")
                putInt("count", frames.size)
              }.also { emit(EVENT_DEBUG, it) }

              frames.forEach { f ->
                try {
                  // Debug: frame type
                  Arguments.createMap().apply {
                    putString("message", "Frame found")
                    putString("type", f.javaClass.simpleName)
                    putInt("rssi", rssi)
                  }.also { emit(EVENT_DEBUG, it) }

                  if (f is IBeaconFrame) {
                    val uuid = f.uuid?.lowercase(Locale.ROOT) ?: return@forEach

                    // Debug: iBeacon details
                    Arguments.createMap().apply {
                      putString("message", "iBeacon detected")
                      putString("uuid", uuid)
                      putInt("major", f.major)
                      putInt("minor", f.minor)
                      putInt("rssi", rssi)
                    }.also { emit(EVENT_DEBUG, it) }

                    // Apply optional UUID filter
                    if (uuidFilter == null || uuid == uuidFilter) {
                      val map = Arguments.createMap().apply {
                        putString("uuid", uuid)
                        putInt("major", f.major)
                        putInt("minor", f.minor)
                        putInt("rssi", rssi)
                        // Try to include txPower if your AAR exposes it; ignore if not.
                        try {
                          val tx = f.txPower
                          putInt("txPower", tx)
                        } catch (_: Throwable) { /* safe on older AARs */ }
                        putDouble("timestamp", System.currentTimeMillis().toDouble())
                      }
                      emit(EVENT_BEACON, map)
                    } else {
                      // Debug: filtered due to mismatched UUID
                      Arguments.createMap().apply {
                        putString("message", "Filtered iBeacon (UUID mismatch)")
                        putString("got", uuid)
                        putString("need", uuidFilter)
                      }.also { emit(EVENT_DEBUG, it) }
                    }
                  }
                } catch (e: Throwable) {
                  Arguments.createMap().apply {
                    putString("message", "Error processing frame")
                    putString("error", e.message ?: "unknown")
                  }.also { emit(EVENT_DEBUG, it) }
                }
              }
            } catch (e: Throwable) {
              Arguments.createMap().apply {
                putString("message", "Error processing peripheral")
                putString("error", e.message ?: "unknown")
              }.also { emit(EVENT_DEBUG, it) }
            }
          }
        }
      })

      Log.d(TAG, "startScan(): calling startScan on MTCentralManager")
      mgr.startScan()
      running = true

      Arguments.createMap().apply {
        putString("message", "Scan started")
        putString("status", "success")
      }.also { emit(EVENT_DEBUG, it) }

      promise.resolve(true)
    } catch (t: Throwable) {
      Log.e(TAG, "startScan error", t)
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
    try {
      reactCtx
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(event, params)
    } catch (e: Throwable) {
      try { Log.e(TAG, "Failed to emit event", e) } catch (_: Throwable) {}
    }
  }

  override fun onHostResume() { /* no-op */ }
  override fun onHostPause()  { /* no-op */ }

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
