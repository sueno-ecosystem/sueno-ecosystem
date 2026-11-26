"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { Database } from "@sueno/shared";
import type { AdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type AdminRow = Database["public"]["Tables"]["admins"]["Row"];

export function TeamManager({
  initialAdmins,
  currentUserId,
  currentRole,
}: {
  initialAdmins: AdminRow[];
  currentUserId: string;
  currentRole: AdminRole;
}) {
  const router = useRouter();
  const isOwner = currentRole === "owner";

  const [admins, setAdmins] = useState<AdminRow[]>(initialAdmins);
  const [toast, setToast] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<AdminRole>("editor");
  const [saving, setSaving] = useState(false);
  const [pendingChange, setPendingChange] = useState<{
    userId: string;
    nextRole?: AdminRole;
    remove?: boolean;
  } | null>(null);

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner || !newUserId.trim()) return;
    setSaving(true);
    setToast(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("admins")
      .insert({ user_id: newUserId.trim(), role: newRole })
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      setToast(error.message);
      return;
    }
    setAdmins([...admins, data]);
    setNewUserId("");
    setNewOpen(false);
    router.refresh();
  }

  async function confirmChange() {
    if (!isOwner || !pendingChange) return;
    setSaving(true);
    setToast(null);
    const supabase = createClient();

    if (pendingChange.remove) {
      const { error } = await supabase
        .from("admins")
        .delete()
        .eq("user_id", pendingChange.userId);
      setSaving(false);
      if (error) {
        setToast(error.message);
      } else {
        setAdmins(admins.filter((a) => a.user_id !== pendingChange.userId));
        router.refresh();
      }
      setPendingChange(null);
      return;
    }

    if (pendingChange.nextRole) {
      const { data, error } = await supabase
        .from("admins")
        .update({ role: pendingChange.nextRole })
        .eq("user_id", pendingChange.userId)
        .select("*")
        .single();
      setSaving(false);
      if (error) {
        setToast(error.message);
      } else {
        setAdmins(admins.map((a) => (a.user_id === pendingChange.userId ? data : a)));
        router.refresh();
      }
      setPendingChange(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-fg-muted">
            Admin users and roles (owner, editor, reviewer).
          </p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => setNewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add admin</span>
          </button>
        )}
      </div>

      {toast && (
        <div className="rounded-md border border-border bg-bg-subtle px-4 py-2 text-xs text-fg">
          {toast}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-bg">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-border bg-bg-subtle text-xs text-fg-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">User ID</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Added</th>
              {isOwner && <th className="px-4 py-2.5 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {admins.map((a) => (
              <tr key={a.user_id} className="hover:bg-bg-subtle">
                <td className="px-4 py-3 font-mono text-xs text-fg">
                  {a.user_id}
                  {a.user_id === currentUserId && (
                    <span className="ml-2 rounded border border-border bg-bg-muted px-1.5 py-0.5 font-sans text-[10px] text-fg-muted">
                      You
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {isOwner && a.user_id !== currentUserId ? (
                    <select
                      value={a.role}
                      onChange={(e) =>
                        setPendingChange({
                          userId: a.user_id,
                          nextRole: e.target.value as AdminRole,
                        })
                      }
                      className="h-8 rounded border border-border bg-bg px-2 text-xs capitalize text-fg"
                    >
                      <option value="owner">owner</option>
                      <option value="editor">editor</option>
                      <option value="reviewer">reviewer</option>
                    </select>
                  ) : (
                    <span className="rounded border border-border bg-bg-subtle px-2 py-0.5 text-xs capitalize text-fg">
                      {a.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-fg-muted">
                  {formatDateTime(a.created_at)}
                </td>
                {isOwner && (
                  <td className="px-4 py-3 text-right">
                    {a.user_id !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => setPendingChange({ userId: a.user_id, remove: true })}
                        className="rounded border border-border p-1 text-fg-muted hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {newOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setNewOpen(false)}
        >
          <form
            onSubmit={addAdmin}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-lg border border-border bg-bg p-6 sm:p-7 shadow-lg"
          >
            <h2 className="text-base font-semibold text-fg">Add admin</h2>
            <p className="mt-1 text-xs text-fg-muted">
              Ask the user to sign in at /login first and copy their auth user ID from the No access page.
            </p>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Auth User ID (UUID)</label>
                <input
                  autoFocus
                  required
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-xs text-fg focus:border-accent focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as AdminRole)}
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none"
                >
                  <option value="editor">editor</option>
                  <option value="reviewer">reviewer</option>
                  <option value="owner">owner</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="h-9 rounded-md border border-border px-4 text-xs font-medium text-fg hover:bg-bg-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Adding…" : "Add admin"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingChange)}
        title={pendingChange?.remove ? "Remove admin?" : "Change admin role?"}
        description={
          pendingChange?.remove
            ? "This revokes all admin access for this user immediately."
            : `Change role to ${pendingChange?.nextRole}?`
        }
        confirmLabel={pendingChange?.remove ? "Remove" : "Update role"}
        destructive={Boolean(pendingChange?.remove)}
        loading={saving}
        onCancel={() => setPendingChange(null)}
        onConfirm={() => void confirmChange()}
      />
    </div>
  );
}
