import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isMediaConfigured } from "@/lib/media/storage";

function StatusCountRow({
  label,
  counts,
  href,
}: {
  label: string;
  counts: { draft: number; review?: number; published: number; archived: number };
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-border bg-bg-subtle p-4 transition-colors hover:border-fg-muted/40"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-fg">{label}</span>
        <span className="font-mono text-xs text-fg-muted">
          {counts.draft + (counts.review ?? 0) + counts.published + counts.archived} total
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded border border-border bg-bg px-2 py-0.5 text-fg-muted">
          Draft {counts.draft}
        </span>
        {counts.review !== undefined && (
          <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-600 dark:text-amber-400">
            Review {counts.review}
          </span>
        )}
        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
          Published {counts.published}
        </span>
        <span className="rounded border border-border bg-bg px-2 py-0.5 text-fg-muted">
          Archived {counts.archived}
        </span>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { data: videos },
    { data: products },
    { data: bundles },
    { data: recentAudit },
  ] = await Promise.all([
    supabase.from("videos").select("id, title, status, needs_medical_review, reviewed_at, video_key, poster_key"),
    supabase.from("products").select("id, name, status, url, image_key, claims_reviewed"),
    supabase.from("bundles").select("id, title, status, hero_image_key, claims_reviewed"),
    supabase
      .from("audit_log")
      .select("id, table_name, action, changed_at")
      .order("changed_at", { ascending: false })
      .limit(8),
  ]);

  const videoCounts = {
    draft: videos?.filter((v) => v.status === "draft").length ?? 0,
    review: videos?.filter((v) => v.status === "review").length ?? 0,
    published: videos?.filter((v) => v.status === "published").length ?? 0,
    archived: videos?.filter((v) => v.status === "archived").length ?? 0,
  };

  const productCounts = {
    draft: products?.filter((p) => p.status === "draft").length ?? 0,
    published: products?.filter((p) => p.status === "published").length ?? 0,
    archived: products?.filter((p) => p.status === "archived").length ?? 0,
  };

  const bundleCounts = {
    draft: bundles?.filter((b) => b.status === "draft").length ?? 0,
    published: bundles?.filter((b) => b.status === "published").length ?? 0,
    archived: bundles?.filter((b) => b.status === "archived").length ?? 0,
  };

  const needsReview =
    videos?.filter((v) => v.status === "review" || (v.needs_medical_review && !v.reviewed_at)) ?? [];

  const notReady = [
    ...(videos
      ?.filter((v) => v.status !== "published" && (!v.video_key || !v.poster_key))
      .map((v) => ({ id: v.id, label: v.title, kind: "Video", reason: "Missing video or poster" })) ??
      []),
    ...(products
      ?.filter((p) => p.status !== "published" && (!p.url || !p.image_key || !p.claims_reviewed))
      .map((p) => ({
        id: p.id,
        label: p.name,
        kind: "Product",
        reason: "Missing link, image, or claims review",
      })) ?? []),
  ].slice(0, 6);

  const r2Ready = isMediaConfigured();
  const stripeReady = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-fg-muted">Content, commerce, and review queues.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-md border border-border bg-bg-subtle px-2.5 py-1 text-fg-muted">
            {r2Ready ? "Media storage connected" : "Media storage not configured"}
          </span>
          <span className="rounded-md border border-border bg-bg-subtle px-2.5 py-1 text-fg-muted">
            {stripeReady ? "Stripe connected" : "Stripe not configured"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCountRow label="Videos" counts={videoCounts} href="/videos" />
        <StatusCountRow label="Products" counts={productCounts} href="/products" />
        <StatusCountRow label="Bundles" counts={bundleCounts} href="/bundles" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-bg-subtle p-4">
          <h2 className="text-sm font-medium">Needs review</h2>
          {needsReview.length === 0 ? (
            <p className="mt-3 text-xs text-fg-muted">No items waiting for review.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-xs">
              {needsReview.slice(0, 6).map((v) => (
                <li key={v.id} className="flex items-center justify-between">
                  <span className="truncate text-fg">{v.title}</span>
                  <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-600 dark:text-amber-400">
                    Review
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-bg-subtle p-4">
          <h2 className="text-sm font-medium">Not ready to publish</h2>
          {notReady.length === 0 ? (
            <p className="mt-3 text-xs text-fg-muted">All drafts have required assets.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-xs">
              {notReady.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-fg">{item.label}</span>
                  <span className="shrink-0 text-fg-muted">{item.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-bg-subtle p-4">
          <h2 className="text-sm font-medium">Recent changes</h2>
          {!recentAudit || recentAudit.length === 0 ? (
            <p className="mt-3 text-xs text-fg-muted">No audit entries yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-xs">
              {recentAudit.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-fg">
                    {row.table_name} · {row.action}
                  </span>
                  <span className="text-fg-muted">
                    {new Date(row.changed_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
