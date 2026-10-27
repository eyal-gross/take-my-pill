import { getStore } from "@netlify/blobs";
import type { Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
  }

  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return new Response(JSON.stringify({ error: "Missing endpoint" }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const store = getStore("push-subscriptions");
    const key = await hashEndpoint(endpoint);
    const record = await store.get(key, { type: "json" }) as any;

    if (!record) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    // Mark as taken until next cycle start (next 18:00 in user's timezone)
    const now = new Date();
    const nextCycle = getNextCycleStart(now);

    record.takenUntil = nextCycle.toISOString();
    await store.setJSON(key, record);

    return new Response(JSON.stringify({ ok: true, takenUntil: record.takenUntil }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("Taken error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
};

function getNextCycleStart(now: Date): Date {
  // Cycle starts at 18:00 Israel time. Calculate in UTC.
  // Israel is UTC+2 (winter) or UTC+3 (summer). Use a fixed offset approach
  // that's close enough — the server cron handles exact timing.
  const d = new Date(now);
  // Next 18:00 local Israel time ≈ 15:00 or 16:00 UTC
  // For simplicity, set next cycle to ~15:00 UTC today or tomorrow
  d.setUTCHours(15, 0, 0, 0);
  if (d <= now) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

async function hashEndpoint(endpoint: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(endpoint);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
