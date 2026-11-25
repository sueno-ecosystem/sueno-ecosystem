import { createClient } from "@supabase/supabase-js";
import { cleanUtm } from "@/lib/utm";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return Response.json({ error: "Waitlist isn't set up yet." }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as { email?: unknown; utm?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) {
    return Response.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  // Service role runs only on the server; the waitlist table has no public policies.
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error } = await supabase
    .from("waitlist")
    .upsert({ email, utm: cleanUtm(body.utm) }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    console.error("waitlist error", error);
    return Response.json({ error: "Couldn't save your email. Try again." }, { status: 500 });
  }
  return Response.json({ ok: true });
}
