package com.honara7ty.app

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.util.Calendar

class FocusModeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED -> restore(context)
            ACTION_ENABLE -> {
                if (!manager.isNotificationPolicyAccessGranted) return
                manager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
                val disableAt = System.currentTimeMillis() + 30 * 60 * 1000
                val disable = Intent(context, FocusModeReceiver::class.java).apply {
                    action = ACTION_DISABLE
                }
                val pending = PendingIntent.getBroadcast(
                    context,
                    REQUEST_DISABLE,
                    disable,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )
                val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, disableAt, pending)
            }
            ACTION_DISABLE -> {
                if (!manager.isNotificationPolicyAccessGranted) return
                manager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
            }
        }
    }

    companion object {
        const val ACTION_ENABLE = "com.honara7ty.app.ACTION_ENABLE_FOCUS"
        const val ACTION_DISABLE = "com.honara7ty.app.ACTION_DISABLE_FOCUS"
        const val REQUEST_ENABLE = 1001
        const val REQUEST_DISABLE = 1002
        const val PREFS = "honara7ty_focus"
        const val KEY_AUTOMATIC = "automatic"
        const val KEY_HOUR = "hour"
        const val KEY_MINUTE = "minute"

        fun restore(context: Context) {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            if (!prefs.getBoolean(KEY_AUTOMATIC, false)) return
            val hour = prefs.getInt(KEY_HOUR, 7)
            val minute = prefs.getInt(KEY_MINUTE, 0)
            val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val intent = Intent(context, FocusModeReceiver::class.java).apply {
                action = ACTION_ENABLE
            }
            val pending = PendingIntent.getBroadcast(
                context,
                REQUEST_ENABLE,
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
    }
}
