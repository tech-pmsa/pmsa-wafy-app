import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabaseClient";

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const CHANNEL_ID = "ce-work-reminders";
const ASYNC_PREFIX = "notified_ce_work_";

/**
 * Initialize notification channels and request permissions
 */
export async function initNotifications(userId?: string | null): Promise<boolean> {
  if (Platform.OS === "web") return false;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "CE Work Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#0A2540",
        sound: "default",
        enableVibrate: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return false;
    }

    // Attempt to register Expo Push Token if user is logged in
    if (userId) {
      try {
        const tokenResult = await Notifications.getExpoPushTokenAsync();
        if (tokenResult?.data) {
          await supabase
            .from("profiles")
            .update({ expo_push_token: tokenResult.data })
            .eq("uid", userId);
        }
      } catch {
        // Push token registration is optional for local notification scheduling
      }
    }

    return true;
  } catch (err) {
    console.error("Failed to initialize notifications:", err);
    return false;
  }
}

/**
 * Format a Date object to YYYY-MM-DD
 */
function toDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Offset a YYYY-MM-DD date by offsetDays
 */
function offsetDate(dateStr: string, offsetDays: number): { dateStr: string; triggerDate: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + offsetDays);

  // Set alert time to 9:00 AM local time
  const triggerDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0, 0, 0);
  return { dateStr: toDateStr(date), triggerDate };
}

/**
 * Sync and schedule CE work alerts for staff / officer accounts.
 * Shows alerts on mobile notification bar:
 * - 2 days before starting date
 * - 1 day before starting date
 * - On starting date
 * - 2 days before submission date
 * - 1 day before submission date
 * - On submission date
 */
export async function syncCeWorkNotifications(
  userRole?: string | null,
  userId?: string | null
): Promise<void> {
  if (Platform.OS === "web") return;

  const role = userRole?.toLowerCase().trim();
  if (role !== "staff" && role !== "officer") {
    return;
  }

  const hasPermission = await initNotifications(userId);
  if (!hasPermission) return;

  try {
    const { data: works, error } = await supabase
      .from("ce_work_items")
      .select("*")
      .order("submission_date", { ascending: true });

    if (error || !works) return;

    const todayStr = toDateStr(new Date());
    const now = new Date();

    // Cancel previously scheduled local notifications to avoid stacking duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const work of works) {
      if (!work.started_date || !work.submission_date) continue;

      const milestones = [
        // Starting date milestones
        { type: "start", offset: -2, base: work.started_date, label: "Starts in 2 Days" },
        { type: "start", offset: -1, base: work.started_date, label: "Starts Tomorrow" },
        { type: "start", offset: 0, base: work.started_date, label: "Starts Today" },
        // Submission date milestones
        { type: "submit", offset: -2, base: work.submission_date, label: "Submission Due in 2 Days" },
        { type: "submit", offset: -1, base: work.submission_date, label: "Submission Due Tomorrow" },
        { type: "submit", offset: 0, base: work.submission_date, label: "Submission Due Today" },
      ];

      for (const m of milestones) {
        const { dateStr, triggerDate } = offsetDate(m.base, m.offset);
        const storageKey = `${ASYNC_PREFIX}${work.id}_${m.type}_${m.offset}_${dateStr}`;

        const subTitle = `${work.work_name} (${work.batch})`;
        const bodyText = `${work.subject_name}${
          work.teacher_name ? ` | Teacher: ${work.teacher_name}` : ""
        }${work.mark ? ` | Mark: ${work.mark}` : ""} - ${m.label}`;

        // 1. If today is the milestone date, trigger immediate notification if not already shown today
        if (dateStr === todayStr) {
          const alreadyNotified = await AsyncStorage.getItem(storageKey);
          if (!alreadyNotified) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `CE Work Alert: ${m.label}`,
                subtitle: subTitle,
                body: `${subTitle}: ${bodyText}`,
                data: { workId: work.id, batch: work.batch },
                channelId: CHANNEL_ID,
              },
              trigger: null, // immediate
            });
            await AsyncStorage.setItem(storageKey, "true");
          }
        } else if (triggerDate.getTime() > now.getTime()) {
          // 2. If milestone is in the future, schedule notification for 9:00 AM on that day
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `CE Work Reminder: ${m.label}`,
              subtitle: subTitle,
              body: `${subTitle}: ${bodyText}`,
              data: { workId: work.id, batch: work.batch },
              channelId: CHANNEL_ID,
            },
            trigger: triggerDate,
          });
        }
      }
    }
  } catch (err) {
    console.error("Error syncing CE work notifications:", err);
  }
}
