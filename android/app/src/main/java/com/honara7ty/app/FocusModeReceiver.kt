package com.honara7ty.app

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class FocusModeReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_ENABLE_FOCUS = "com.honara7ty.app.ACTION_ENABLE_FOCUS"
        const val ACTION_DISABLE_FOCUS = "com.honara7ty.app.ACTION_DISABLE_FOCUS"
        const val REQUEST_CODE_ENABLE = 1001
        const val REQUEST_CODE_DISABLE = 1002
    }

    override fun onReceive(context: Context, intent: Intent) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (!notificationManager.isNotificationPolicyAccessGranted) {
            return
        }

        when (intent.action) {
            ACTION_ENABLE_FOCUS -> {
                Log.d("FocusModeReceiver", "Enabling Focus Mode")
                notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY)
                
                // Schedule disable alarm for 30 minutes later
                scheduleDisableAlarm(context)
            }
            ACTION_DISABLE_FOCUS -> {
                Log.d("FocusModeReceiver", "Disabling Focus Mode")
                notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL)
            }
        }
    }

    private fun scheduleDisableAlarm(context: Context) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val intent = Intent(context, FocusModeReceiver::class.java).apply {
            action = ACTION_DISABLE_FOCUS
        }
        
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            REQUEST_CODE_DISABLE,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 30 minutes in milliseconds
        val triggerAtMillis = System.currentTimeMillis() + (30 * 60 * 1000)

        try {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerAtMillis,
                pendingIntent
            )
        } catch (e: SecurityException) {
            Log.e("FocusModeReceiver", "Exact alarm permission denied", e)
        }
    }
}
