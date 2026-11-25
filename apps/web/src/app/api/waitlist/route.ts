import { createClient } from "@supabase/supabase-js";
import { captureServerEvent } from "@/lib/posthog-server";
import { cleanUtm } from "@/lib/utm";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ error: "Waitlist isn't set up yet." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    email?: unknown;
    utm?: unknown;
    distinct_id?: unknown;
  };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const utm = cleanUtm(body.utm);
  const distinctId =
    typeof body.distinct_id === "string" && body.distinct_id.length > 0
      ? body.distinct_id.slice(0, 128)
      : undefined;

  // Service role runs only on the server; the waitlist table has no public policies.
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await supabase
    .from("waitlist")
    .upsert(
      {
        email,
        utm: {
          ...utm,
          ...(distinctId ? { distinct_id: distinctId } : {}),
        },
      },
      { onConflict: "email", ignoreDuplicates: true }
    );

  if (error) {
    console.error("waitlist error", error);
    return Response.json({ error: "Couldn't save your email. Try again." }, { status: 500 });
  }

  await captureServerEvent(distinctId, "waitlist_join", utm);
  return Response.json({ ok: true });
}
