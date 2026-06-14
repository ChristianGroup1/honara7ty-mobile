package com.honara7ty.app

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.provider.Settings
import java.util.Calendar
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FocusModeModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "FocusMode"
    }

    @ReactMethod
    fun hasPermission(promise: Promise) {
        try {
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            promise.resolve(notificationManager.isNotificationPolicyAccessGranted)
        } catch (e: Exception) {
            promise.reject("FOCUS_MODE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun getStatus(promise: Promise) {
        try {
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            val isActive = notificationManager.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_PRIORITY || 
                           notificationManager.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_ALARMS ||
                           notificationManager.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_NONE
            promise.resolve(isActive)
        } catch (e: Exception) {
            promise.reject("FOCUS_MODE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("FOCUS_MODE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun enableFocusMode(promise: Promise) {
        try {
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (notificationManager.isNotificationPolicyAccessGranted) {
                notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("FOCUS_MODE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun disableFocusMode(promise: Promise) {
        try {
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            if (notificationManager.isNotificationPolicyAccessGranted) {
                notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("FOCUS_MODE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun scheduleFocusMode(hour: Int, minute: Int, promise: Promise) {
        try {
            val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(reactApplicationContext, FocusModeReceiver::class.java).apply {
                action = FocusModeReceiver.ACTION_ENABLE_FOCUS
            }
            
            val pendingIntent = PendingIntent.getBroadcast(
                reactApplicationContext,
                FocusModeReceiver.REQUEST_CODE_ENABLE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val calendar = Calendar.getInstance().apply {
                timeInMillis = System.currentTimeMillis()
                set(Calendar.HOUR_OF_DAY, hour)
                set(Calendar.MINUTE, minute)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }

            // If time is in the past, schedule for tomorrow
            if (calendar.timeInMillis <= System.currentTimeMillis()) {
                calendar.add(Calendar.DAY_OF_YEAR, 1)
            }

            alarmManager.setRepeating(
                AlarmManager.RTC_WAKEUP,
                calendar.timeInMillis,
                AlarmManager.INTERVAL_DAY,
                pendingIntent
            )

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FOCUS_MODE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun cancelScheduledFocusMode(promise: Promise) {
        try {
            val alarmManager = reactApplicationContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            
            val intentEnable = Intent(reactApplicationContext, FocusModeReceiver::class.java).apply {
                action = FocusModeReceiver.ACTION_ENABLE_FOCUS
            }
            val pendingIntentEnable = PendingIntent.getBroadcast(
                reactApplicationContext,
                FocusModeReceiver.REQUEST_CODE_ENABLE,
                intentEnable,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(pendingIntentEnable)

            val intentDisable = Intent(reactApplicationContext, FocusModeReceiver::class.java).apply {
                action = FocusModeReceiver.ACTION_DISABLE_FOCUS
            }
            val pendingIntentDisable = PendingIntent.getBroadcast(
                reactApplicationContext,
                FocusModeReceiver.REQUEST_CODE_DISABLE,
                intentDisable,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            alarmManager.cancel(pendingIntentDisable)

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("FOCUS_MODE_ERROR", e.message)
        }
    }
}
