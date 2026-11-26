import { redirect } from "next/navigation";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getAdminSession } from "@/lib/auth";

export default async function PlansSettingsPage() {
  const session = await getAdminSession();
  if (session.status !== "ok" || session.role !== "owner") {
    redirect("/");
  }

  const configured = Boolean(process.env.STRIPE_SECRET_KEY);

  return (
    <PlaceholderPage
      title="Plans & Checkout"
      description="Manage Stripe membership & pre-sale product metadata and R2 checkout images."
      notice={
        configured
          ? "Stripe connected. Plans & Checkout editor will be built in PART 3e."
          : "Stripe not configured. Add STRIPE_SECRET_KEY in apps/admin/.env.local to manage plans."
      }
    />
  );
}
