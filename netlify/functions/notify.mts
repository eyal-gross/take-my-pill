import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import type { Context } from "@netlify/functions";

// Notification schedule: times in Israel local time (hour, minute)
const CLOCK_TIMES = [
  { h: 18, m: 0  }, { h: 19, m: 0  }, { h: 20, m: 0  }, { h: 21, m: 0  },
  { h: 22, m: 0  }, { h: 22, m: 30 }, { h: 23, m: 0  }, { h: 23, m: 30 },
  { h: 0,  m: 0  }, { h: 0,  m: 30 }, { h: 1,  m: 0  }, { h: 1,  m: 30 },
  { h: 2,  m: 0  }, { h: 2,  m: 30 }, { h: 3,  m: 0  }, { h: 3,  m: 30 },
  { h: 4,  m: 0  },
];

export default async (req: Request, context: Context) => {
  // Auth check — external cron must send the secret
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const CRON_SECRET = process.env.CRON_SECRET;

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
  const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:pill@example.com";

  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.error("Missing VAPID keys in environment");
    return new Response("Missing config", { status: 500 });
  }

  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);

  // Get current Israel time
  const now = new Date();
  const israelTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })
  );
  const currentHour = israelTime.getHours();
  const currentMinute = israelTime.getMinutes();

  // Find which CLOCK_TIMES index matches the current minute
  const matchIndex = CLOCK_TIMES.findIndex((ct) => {
    return ct.h === currentHour && ct.m === currentMinute;
  });

  if (matchIndex === -1) {
    console.log(
      `Not a notification time. Israel time: ${currentHour}:${String(currentMinute).padStart(2, "0")}`
    );
    return new Response("Not notification time", { status: 200 });
  }

  const timeLabel = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;
  console.log(`Notification time! Israel: ${currentHour}:${String(currentMinute).padStart(2, "0")}, label: ${timeLabel}, index: ${matchIndex}`);

  const store = getStore("push-subscriptions");
  const { blobs } = await store.list();

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const blob of blobs) {
    const record = (await store.get(blob.key, { type: "json" })) as any;
    if (!record?.subscription) continue;

    // Skip if pill was taken this cycle
    if (record.takenUntil) {
      const takenUntil = new Date(record.takenUntil);
      if (now < takenUntil) {
        skipped++;
        continue;
      }
    }

    // Skip if user toggled this time slot off
    if (record.clockStates && record.clockStates[matchIndex] === false) {
      skipped++;
      continue;
    }

    const payload = JSON.stringify({
      title: "💊 תזכורת גלולה",
      body: `${timeLabel} — הגיע הזמן לקחת את הגלולה!`,
      tag: "pill-reminder",
    });

    try {
      await webpush.sendNotification(record.subscription, payload);
      sent++;
    } catch (err: any) {
      console.error(`Push failed for ${blob.key}:`, err.statusCode, err.body);
      if (err.statusCode === 410 || err.statusCode === 404) {
        await store.delete(blob.key);
        console.log(`Removed expired subscription: ${blob.key}`);
      }
      failed++;
    }
  }

  console.log(`Done: sent=${sent}, skipped=${skipped}, failed=${failed}`);
  return new Response(
    JSON.stringify({ sent, skipped, failed }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
