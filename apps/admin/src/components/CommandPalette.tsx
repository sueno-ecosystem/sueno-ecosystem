"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import type { AdminRole } from "@/lib/auth";
import { visibleNavGroups } from "@/lib/nav";
import { useTheme } from "@/components/ThemeProvider";

interface CommandAction {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

export function CommandPalette({
  role,
  open,
  onOpenChange,
}: {
  role: AdminRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { setMode } = useTheme();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const actions = useMemo<CommandAction[]>(() => {
    const navActions: CommandAction[] = visibleNavGroups(role).flatMap((g) =>
      g.items.map((item) => ({
        id: `nav:${item.href}`,
        group: g.label,
        label: item.label,
        hint: item.href,
        run: () => router.push(item.href),
      }))
    );

    const quickActions: CommandAction[] = [
      {
        id: "new:video",
        group: "Quick actions",
        label: "New video",
        hint: "/videos",
        run: () => router.push("/videos?new=1"),
      },
      {
        id: "new:product",
        group: "Quick actions",
        label: "New product",
        hint: "/products",
        run: () => router.push("/products?new=1"),
      },
      {
        id: "theme:light",
        group: "Appearance",
        label: "Theme: Light",
        run: () => setMode("light"),
      },
      {
        id: "theme:dark",
        group: "Appearance",
        label: "Theme: Dark",
        run: () => setMode("dark"),
      },
      {
        id: "theme:system",
        group: "Appearance",
        label: "Theme: System",
        run: () => setMode("system"),
      },
    ];

    return [...navActions, ...quickActions];
  }, [role, router, setMode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.group.toLowerCase().includes(q)
    );
  }, [actions, query]);

  const safeIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0));

  if (!open) return null;

  function execute(action: CommandAction) {
    onOpenChange(false);
    setQuery("");
    action.run();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-[15vh] px-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-bg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search className="h-4 w-4 text-fg-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && filtered[safeIndex]) {
                e.preventDefault();
                execute(filtered[safeIndex]);
              }
            }}
            placeholder="Jump to page or action…"
            className="w-full bg-transparent text-sm text-fg placeholder:text-fg-muted focus:outline-none"
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-fg-muted">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-fg-muted">No matching commands.</p>
          ) : (
            filtered.map((action, index) => (
              <button
                key={action.id}
                type="button"
                onClick={() => execute(action)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                  index === safeIndex
                    ? "bg-bg-muted text-fg"
                    : "text-fg-muted hover:bg-bg-muted/60 hover:text-fg"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-fg-muted">
                    {action.group}
                  </span>
                  <span className="text-fg">{action.label}</span>
                </span>
                {index === safeIndex && <CornerDownLeft className="h-3.5 w-3.5 text-fg-muted" />}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
