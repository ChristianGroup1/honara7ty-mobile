package com.honara7ty.app

import android.content.IntentSender
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import android.os.Bundle
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import com.swmansion.gesturehandler.react.RNGestureHandlerEnabledRootView
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManager
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability

class MainActivity : ReactActivity() {
  private lateinit var appUpdateManager: AppUpdateManager
  private lateinit var updateFlowLauncher: ActivityResultLauncher<IntentSenderRequest>

  /**
   * Returns the name of the main component registered from JavaScript.
   */
  override fun getMainComponentName(): String = "honara7ty"

  override fun onCreate(savedInstanceState: Bundle?) {
    updateFlowLauncher =
      registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { result ->
        if (result.resultCode != RESULT_OK) {
          checkForImmediateUpdate()
        }
      }

    super.onCreate(null)

    appUpdateManager = AppUpdateManagerFactory.create(this)
    checkForImmediateUpdate()
  }

  override fun onResume() {
    super.onResume()

    if (!::appUpdateManager.isInitialized) {
      return
    }

    appUpdateManager.appUpdateInfo.addOnSuccessListener { appUpdateInfo ->
      if (
        appUpdateInfo.updateAvailability() ==
          UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS
      ) {
        startImmediateUpdate(appUpdateInfo)
      }
    }
  }

  private fun checkForImmediateUpdate() {
    appUpdateManager.appUpdateInfo.addOnSuccessListener { appUpdateInfo ->
      if (
        appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE &&
          appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)
      ) {
        startImmediateUpdate(appUpdateInfo)
      }
    }
  }

  private fun startImmediateUpdate(appUpdateInfo: AppUpdateInfo) {
    try {
      appUpdateManager.startUpdateFlowForResult(
        appUpdateInfo,
        updateFlowLauncher,
        AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(),
      )
    } catch (_: IntentSender.SendIntentException) {
      // Retry by re-checking update availability on the next resume.
    }
  }

  /**
   * Returns the instance of the [ReactActivityDelegate].
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun createRootView(): com.facebook.react.ReactRootView {
          return RNGestureHandlerEnabledRootView(this@MainActivity)
        }
      }
}
