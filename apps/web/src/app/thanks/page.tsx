import Link from "next/link";
import { ThanksTracker } from "@/components/ThanksTracker";

export const metadata = { title: "You're in · Galene" };

export default function Thanks() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <ThanksTracker />
      <div className="max-w-lg text-center">
        <p className="text-sm font-medium tracking-widest text-accent uppercase">Founding member</p>
        <h1 className="mt-4 text-4xl font-semibold">You&apos;re in. Thank you.</h1>
        <p className="mt-5 leading-relaxed text-muted">
          Your receipt is on its way to your email. When Galene opens, we&apos;ll send a sign-in link to that same
          email so you can claim your membership.
        </p>
        <Link href="/" className="mt-10 inline-block text-sm text-muted underline underline-offset-4 hover:text-foreground">
          Back to home
        </Link>
      </div>
    </main>
  );
}
