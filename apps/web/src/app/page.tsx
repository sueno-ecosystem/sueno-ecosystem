import Link from "next/link";
import { CheckoutButton } from "@/components/CheckoutButton";
import { FaqList } from "@/components/FaqList";
import { HeroCopy, type HookVariant } from "@/components/HeroCopy";
import { LandingTracker } from "@/components/LandingTracker";
import { PhoneMock } from "@/components/PhoneMock";
import { WaitlistForm } from "@/components/WaitlistForm";

// ─── Copy lives here so it's easy to test different hooks ───────────────────
const HOOK = "Awake at 4 AM again?";
const SUBHEAD =
  "Sueño helps you figure out what keeps waking you up and change it, without pills. Short lessons, a private night journal, and sleep setups matched to your nights.";

const DEFAULT_HOOK: HookVariant = { hook: HOOK, subhead: SUBHEAD };

// Prepared for PostHog feature flag `landing-hook` (off by default)
const HOOK_VARIANTS: Record<string, HookVariant> = {
  control: DEFAULT_HOOK,
  "no-pills": {
    hook: "Stop staring at the ceiling at 4 AM.",
    subhead:
      "Figure out what's actually waking you up — room temperature, light, caffeine, or stress — and fix it without sleep pills.",
  },
};

const FOUNDING_PRICE = "$29";
const FOUNDING_TERM = "first 3 months";
const REGULAR_PRICE = "$19/month";

const features = [
  {
    title: "Learn",
    body: "Short videos across environment, clothing, wearables, medications and sleep basics. Two minutes each, made to watch in bed.",
  },
  {
    title: "4 AM Journal",
    body: "When you wake up, dump what's in your head in night mode, then tap what's keeping you up. Your words never leave your phone.",
  },
  {
    title: "Bundles",
    body: "Based on what you tag, Sueño suggests one or two sleep setups from brands we've vetted: cooler sheets, better light, quieter rooms.",
  },
];

const faqs = [
  {
    q: "When does Sueño open?",
    a: "We're building it now. Founding members get early access first and updates along the way.",
  },
  {
    q: "iPhone or Android?",
    a: "Both. You'll get a link to download it when it's ready.",
  },
  {
    q: "Is my journal private?",
    a: "Yes. What you write stays on your phone. If you choose to, only the quick tags you tap (like \"too hot\") sync, to personalize suggestions.",
  },
  {
    q: "Is this medical treatment?",
    a: "No. Sueño is education and habit tools, not medical care. If you take sleep medication or think you have a sleep disorder, talk to your doctor before changing anything.",
  },
  {
    q: "What if I change my mind?",
    a: "Email us before launch and we'll refund your founding membership in full.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <LandingTracker />

      {/* Hero */}
      <section data-section="hero" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-accent-2/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-16 md:grid-cols-2 md:pt-24">
          <div className="text-center md:text-left">
            <p className="mb-4 text-sm font-medium tracking-widest text-accent uppercase">Sueño</p>
            <HeroCopy defaultVariant={DEFAULT_HOOK} variants={HOOK_VARIANTS} />
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row md:items-start">
              <CheckoutButton location="hero">Become a founding member · {FOUNDING_PRICE}</CheckoutButton>
              <a href="#waitlist" className="px-2 py-3.5 text-sm text-muted underline-offset-4 hover:text-foreground hover:underline">
                Not ready? Join the waitlist
              </a>
            </div>
          </div>
          <PhoneMock />
        </div>
      </section>

      {/* What it is */}
      <section data-section="features" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">Three tools for better nights</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-3xl border border-line bg-card p-7">
                <h3 className="text-lg font-semibold text-accent">{f.title}</h3>
                <p className="mt-3 leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why different */}
      <section data-section="why" className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold sm:text-3xl">No pills. No guilt. No one reading your diary.</h2>
          </div>
          <ul className="space-y-5 text-muted">
            <li><span className="font-semibold text-foreground">Non-medication.</span> Change your room, your evening and your habits, the things you control.</li>
            <li><span className="font-semibold text-foreground">Private by design.</span> Your journal is stored only on your phone, not on our servers.</li>
            <li><span className="font-semibold text-foreground">Built for 4 AM.</span> Dark screens, big buttons, nothing that wakes you up more.</li>
          </ul>
        </div>
      </section>

      {/* Founding offer */}
      <section id="founding" data-section="founding" className="border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="rounded-3xl border border-accent/40 bg-card p-8 sm:p-12">
            <p className="text-sm font-medium tracking-widest text-accent uppercase">Founding member</p>
            <p className="mt-4 text-5xl font-semibold">{FOUNDING_PRICE}</p>
            <p className="mt-2 text-muted">one-time, covers your {FOUNDING_TERM} after launch. After that, {REGULAR_PRICE} only if you choose to stay.</p>
            <ul className="mx-auto mt-8 max-w-sm space-y-3 text-left text-muted">
              <li>✓ Early access before public launch</li>
              <li>✓ Founding price while Sueño is new</li>
              <li>✓ Help shape what we build</li>
              <li>✓ Full refund if you change your mind before launch</li>
            </ul>
            <div className="mt-10 flex justify-center">
              <CheckoutButton location="founding">Reserve my spot · {FOUNDING_PRICE}</CheckoutButton>
            </div>
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" data-section="waitlist" className="border-t border-line">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center">
          <h2 className="text-2xl font-semibold sm:text-3xl">Not ready yet?</h2>
          <p className="mt-3 text-muted">Get one email when Sueño opens. Nothing else.</p>
          <div className="mt-8 flex w-full justify-center">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section data-section="faq" className="border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">Questions</h2>
          <FaqList items={faqs} />
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-10 text-sm text-muted sm:flex-row">
          <p>© 2026 Sueño</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="underline-offset-4 hover:text-foreground hover:underline">
              Privacy
            </Link>
            <p>Education and habit tools, not medical advice.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
