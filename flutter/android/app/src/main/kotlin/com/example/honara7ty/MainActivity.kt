package com.honara7ty.app

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.Calendar

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "honara7ty/settings")
            .setMethodCallHandler { call, result ->
                if (call.method == "openNotificationSettings") {
                    startActivity(
                        Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                            putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        },
                    )
                    result.success(null)
                } else {
                    result.notImplemented()
                }
            }
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "honara7ty/legacy_async_storage")
            .setMethodCallHandler { call, result ->
                if (call.method != "readAll") {
                    result.notImplemented()
                    return@setMethodCallHandler
                }
                try {
                    result.success(readReactNativeAsyncStorage())
                } catch (error: Exception) {
                    result.error("legacy_storage_read_failed", error.message, null)
                }
            }
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "honara7ty/focus_mode")
            .setMethodCallHandler { call, result ->
                val notifications =
                    getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                when (call.method) {
                    "hasPermission" -> result.success(notifications.isNotificationPolicyAccessGranted)
                    "isActive" -> result.success(
                        notifications.isNotificationPolicyAccessGranted &&
                            notifications.currentInterruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL,
                    )
                    "requestPermission" -> {
                        startActivity(
                            Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
                        )
                        result.success(null)
                    }
                    "enable" -> {
                        if (!notifications.isNotificationPolicyAccessGranted) {
                            result.success(false)
                        } else {
                            notifications.setInterruptionFilter(
                                NotificationManager.INTERRUPTION_FILTER_PRIORITY,
                            )
                            result.success(true)
                        }
                    }
                    "disable" -> {
                        if (!notifications.isNotificationPolicyAccessGranted) {
                            result.success(false)
                        } else {
                            notifications.setInterruptionFilter(
                                NotificationManager.INTERRUPTION_FILTER_ALL,
                            )
                            result.success(true)
                        }
                    }
                    "schedule" -> {
                        val hour = call.argument<Int>("hour") ?: 7
                        val minute = call.argument<Int>("minute") ?: 0
                        schedule(hour, minute)
                        result.success(true)
                    }
                    "cancel" -> {
                        cancel()
                        result.success(true)
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun readReactNativeAsyncStorage(): Map<String, String> {
        val path = applicationContext.getDatabasePath("RKStorage")
        if (!path.exists()) return emptyMap()
        val values = mutableMapOf<String, String>()
        val database = SQLiteDatabase.openDatabase(path.path, null, SQLiteDatabase.OPEN_READONLY)
        try {
            database.rawQuery("SELECT key, value FROM catalystLocalStorage", null).use { cursor ->
                val keyIndex = cursor.getColumnIndexOrThrow("key")
                val valueIndex = cursor.getColumnIndexOrThrow("value")
                while (cursor.moveToNext()) {
                    values[cursor.getString(keyIndex)] = cursor.getString(valueIndex)
                }
            }
        } finally {
            database.close()
        }
        return values
    }

    private fun schedule(hour: Int, minute: Int) {
        getSharedPreferences(FocusModeReceiver.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(FocusModeReceiver.KEY_AUTOMATIC, true)
            .putInt(FocusModeReceiver.KEY_HOUR, hour)
            .putInt(FocusModeReceiver.KEY_MINUTE, minute)
            .apply()
        val alarms = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(this, FocusModeReceiver::class.java).apply {
            action = FocusModeReceiver.ACTION_ENABLE
        }
        val pending = PendingIntent.getBroadcast(
            this,
            FocusModeReceiver.REQUEST_ENABLE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val calendar = Calendar.getInstance().apply {
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (calendar.timeInMillis <= System.currentTimeMillis()) {
            calendar.add(Calendar.DAY_OF_YEAR, 1)
        }
        alarms.setRepeating(
            AlarmManager.RTC_WAKEUP,
            calendar.timeInMillis,
            AlarmManager.INTERVAL_DAY,
            pending,
        )
    }

    private fun cancel() {
        getSharedPreferences(FocusModeReceiver.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(FocusModeReceiver.KEY_AUTOMATIC, false)
            .apply()
        val alarms = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        for ((action, code) in listOf(
            FocusModeReceiver.ACTION_ENABLE to FocusModeReceiver.REQUEST_ENABLE,
            FocusModeReceiver.ACTION_DISABLE to FocusModeReceiver.REQUEST_DISABLE,
        )) {
            val intent = Intent(this, FocusModeReceiver::class.java).apply { this.action = action }
            val pending = PendingIntent.getBroadcast(
                this,
                code,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
            alarms.cancel(pending)
        }
    }
}
