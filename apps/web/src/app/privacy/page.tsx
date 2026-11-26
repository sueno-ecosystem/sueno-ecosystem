import Link from "next/link";

export const metadata = { title: "Privacy · Sueño" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl flex-1 px-6 py-20">
      <Link href="/" className="text-sm text-muted underline underline-offset-4 hover:text-foreground">
        ← Back to Sueño
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy</h1>
      <p className="mt-4 leading-relaxed text-muted">
        Your 4 AM Journal stays on your phone. Journal entries are never sent to our servers or included in analytics.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Analytics</h2>
      <p className="mt-2 leading-relaxed text-muted">
        We use privacy-first product analytics (PostHog) on our website to understand which lessons and pages are
        helpful, measure page performance, and see how visitors find Sueño. We do not send emails, names, or form
        contents to analytics, all session-replay inputs are masked, and we respect your browser&apos;s Do Not Track
        setting.
      </p>
    </main>
  );
}
