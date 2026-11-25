import type { AdminRole } from "@/lib/auth";

export interface NavItem {
  label: string;
  href: string;
  icon:
    | "layout-dashboard"
    | "video"
    | "layers"
    | "tag"
    | "package"
    | "boxes"
    | "handshake"
    | "users"
    | "mouse-pointer-click"
    | "trending-up"
    | "credit-card"
    | "ticket"
    | "shield"
    | "sliders"
    | "history"
    | "bar-chart-3";
  ownerOnly?: boolean;
}

export interface NavGroup {
  label: string;
  ownerOnly?: boolean;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: "layout-dashboard" }],
  },
  {
    label: "Content",
    items: [
      { label: "Videos", href: "/videos", icon: "video" },
      { label: "Pillars", href: "/pillars", icon: "layers" },
      { label: "Trigger tags", href: "/tags", icon: "tag" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { label: "Products", href: "/products", icon: "package" },
      { label: "Bundles", href: "/bundles", icon: "boxes" },
      { label: "Partners", href: "/partners", icon: "handshake" },
    ],
  },
  {
    label: "Growth",
    items: [
      { label: "Validation", href: "/validation", icon: "bar-chart-3" },
      { label: "Waitlist", href: "/waitlist", icon: "users" },
      { label: "Clicks", href: "/clicks", icon: "mouse-pointer-click" },
    ],
  },
  {
    label: "Revenue",
    ownerOnly: true,
    items: [
      { label: "Overview", href: "/revenue", icon: "trending-up", ownerOnly: true },
      { label: "Members", href: "/revenue/members", icon: "credit-card", ownerOnly: true },
      { label: "Pre-sales", href: "/revenue/presales", icon: "ticket", ownerOnly: true },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Team", href: "/settings/team", icon: "shield" },
      { label: "Plans & Checkout", href: "/settings/plans", icon: "sliders", ownerOnly: true },
      { label: "Audit log", href: "/settings/audit", icon: "history" },
    ],
  },
];

export function visibleNavGroups(role: AdminRole): NavGroup[] {
  const isOwner = role === "owner";
  return NAV_GROUPS.filter((g) => !g.ownerOnly || isOwner).map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.ownerOnly || isOwner),
  }));
}

export function breadcrumbsForPath(pathname: string): { label: string; href: string }[] {
  if (pathname === "/") return [{ label: "Overview", href: "/" }, { label: "Dashboard", href: "/" }];
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.href !== "/" && (pathname === item.href || pathname.startsWith(item.href + "/"))) {
        return [
          { label: group.label, href: item.href },
          { label: item.label, href: item.href },
        ];
      }
    }
  }
  return [{ label: "Admin", href: "/" }];
}
