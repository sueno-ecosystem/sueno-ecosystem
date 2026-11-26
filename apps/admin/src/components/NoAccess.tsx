"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function NoAccess({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 text-fg">
      <div className="w-full max-w-md rounded-lg border border-border bg-bg-subtle p-6">
        <div className="flex items-center gap-2 text-fg">
          <ShieldAlert className="h-5 w-5 text-amber-500" />
          <h1 className="text-base font-semibold">No admin access</h1>
        </div>
        <p className="mt-2 text-sm text-fg-muted">
          Signed in as <span className="font-medium text-fg">{email ?? userId}</span>, which is not
          in <code className="font-mono text-xs">public.admins</code>.
        </p>
        <div className="mt-4 rounded-md border border-border bg-bg p-3">
          <p className="text-xs text-fg-muted">Your auth user ID:</p>
          <p className="mt-1 select-all font-mono text-xs text-fg">{userId}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="mt-5 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm font-medium text-fg hover:bg-bg-muted"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
