import { PostHog } from "posthog-node";

export async function captureServerEvent(
  distinctId: string | undefined,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  const client = new PostHog(key, {
    host,
    flushAt: 1,
    flushInterval: 0,
  });

  const safe: Record<string, unknown> = {};
  if (properties) {
    for (const [k, v] of Object.entries(properties)) {
      if (k === "email" || k === "name") continue;
      safe[k] = v;
    }
  }

  try {
    client.capture({
      distinctId: distinctId || "anonymous-server",
      event,
      properties: safe,
    });
    await client.shutdown();
  } catch (err) {
    console.error("posthog server capture error", err);
  }
}
