const STYLES: Record<string, string> = {
  draft: "border-border bg-bg-muted text-fg-muted",
  review: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  published: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  archived: "border-border bg-bg text-fg-muted/70",
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  prospect: "border-border bg-bg-muted text-fg-muted",
  paused: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  ended: "border-border bg-bg text-fg-muted/70",
};

const LABELS: Record<string, string> = {
  draft: "Draft",
  review: "In review",
  published: "Published",
  archived: "Archived",
  active: "Active",
  prospect: "Prospect",
  paused: "Paused",
  ended: "Ended",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? "border-border bg-bg-muted text-fg-muted";
  const label = LABELS[status] ?? status;
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
