import { createClient } from "@/lib/supabase/server";
import { GlobalAuditTable } from "@/components/settings/GlobalAuditTable";

export default async function AuditLogPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*")
    .order("changed_at", { ascending: false })
    .limit(200);

  return <GlobalAuditTable rows={data ?? []} />;
}
