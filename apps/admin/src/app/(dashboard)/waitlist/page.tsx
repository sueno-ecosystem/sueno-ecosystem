import { createClient } from "@/lib/supabase/server";
import { WaitlistTable } from "@/components/growth/WaitlistTable";

export default async function WaitlistPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("waitlist")
    .select("*")
    .order("created_at", { ascending: false });

  return <WaitlistTable rows={data ?? []} />;
}
