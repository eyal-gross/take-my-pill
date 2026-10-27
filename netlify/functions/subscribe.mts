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
    const { subscription, timezone } = await req.json();

    if (!subscription?.endpoint) {
      return new Response(JSON.stringify({ error: "Invalid subscription" }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const store = getStore("push-subscriptions");

    // Use a hash of the endpoint as the key
    const key = await hashEndpoint(subscription.endpoint);

    // Preserve existing fields (takenUntil, clockStates) on re-subscribe
    const existing = await store.get(key, { type: "json" }) as any;

    await store.setJSON(key, {
      ...existing,
      subscription,
      timezone: timezone || "Asia/Jerusalem",
      takenUntil: existing?.takenUntil || null,
      clockStates: existing?.clockStates || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("Subscribe error:", err);
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
};

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
