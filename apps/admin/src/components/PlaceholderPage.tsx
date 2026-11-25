export function PlaceholderPage({
  title,
  description,
  notice,
}: {
  title: string;
  description: string;
  notice?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-fg-muted">{description}</p>
      </div>
      <div className="rounded-lg border border-border bg-bg-subtle p-6 text-sm text-fg-muted">
        {notice ?? "Coming in the next build step."}
      </div>
    </div>
  );
}
