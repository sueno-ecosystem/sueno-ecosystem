"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  CreditCard,
  Handshake,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  Monitor,
  Moon,
  MousePointerClick,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Shield,
  Sliders,
  Sun,
  Tag,
  Ticket,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import type { AdminRole } from "@/lib/auth";
import { breadcrumbsForPath, visibleNavGroups, type NavItem } from "@/lib/nav";
import { createClient } from "@/lib/supabase/client";
import { CommandPalette } from "@/components/CommandPalette";
import { useTheme } from "@/components/ThemeProvider";

const ICONS: Record<NavItem["icon"], React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  video: Video,
  layers: Layers,
  tag: Tag,
  package: Package,
  boxes: Boxes,
  handshake: Handshake,
  users: Users,
  "mouse-pointer-click": MousePointerClick,
  "trending-up": TrendingUp,
  "credit-card": CreditCard,
  ticket: Ticket,
  shield: Shield,
  sliders: Sliders,
  history: History,
  "bar-chart-3": BarChart3,
};

export function AdminShell({
  email,
  role,
  children,
}: {
  email: string | null;
  role: AdminRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { mode, cycle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const groups = visibleNavGroups(role);
  const crumbs = breadcrumbsForPath(pathname);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      {/* Left Sidebar */}
      <aside
        className={`flex shrink-0 flex-col border-r border-border bg-bg-subtle transition-[width] duration-150 ${
          collapsed ? "w-14" : "w-56"
        }`}
      >
        <div className="flex h-12 items-center justify-between border-b border-border px-3">
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="inline-block h-2 w-2 rounded-full bg-accent" />
              <span>Sueño Admin</span>
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-md p-1.5 text-fg-muted hover:bg-bg-muted hover:text-fg"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-3">
          {groups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  const active =
                    item.href === "/"
                      ? pathname === "/"
                      : pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                          active
                            ? "bg-bg-muted font-medium text-fg"
                            : "text-fg-muted hover:bg-bg-muted/60 hover:text-fg"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-accent" : ""}`} />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-2.5">
          {!collapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-fg">{email ?? "Admin"}</p>
                <p className="text-[11px] uppercase tracking-wider text-fg-muted">{role}</p>
              </div>
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                className="rounded-md p-1.5 text-fg-muted hover:bg-bg-muted hover:text-fg"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={signOut}
              title="Sign out"
              className="flex w-full justify-center rounded-md p-1.5 text-fg-muted hover:bg-bg-muted hover:text-fg"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center justify-between border-b border-border bg-bg px-5">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
            {crumbs.map((c, idx) => (
              <span key={`${c.href}-${idx}`} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-fg-muted" />}
                {idx === crumbs.length - 1 ? (
                  <span className="font-medium text-fg">{c.label}</span>
                ) : (
                  <Link href={c.href} className="text-fg-muted hover:text-fg">
                    {c.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-2 rounded-md border border-border bg-bg-subtle px-2.5 py-1 text-xs text-fg-muted hover:bg-bg-muted hover:text-fg"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search…</span>
              <kbd className="rounded border border-border px-1 font-mono text-[10px]">⌘K</kbd>
            </button>

            <button
              type="button"
              onClick={cycle}
              title={`Theme: ${mode}`}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-subtle px-2.5 py-1 text-xs text-fg-muted hover:bg-bg-muted hover:text-fg"
            >
              {mode === "light" && <Sun className="h-3.5 w-3.5" />}
              {mode === "dark" && <Moon className="h-3.5 w-3.5" />}
              {mode === "system" && <Monitor className="h-3.5 w-3.5" />}
              <span className="capitalize">{mode}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>

      <CommandPalette role={role} open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
