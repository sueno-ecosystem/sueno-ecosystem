import { redirect } from "next/navigation";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getAdminSession } from "@/lib/auth";

export default async function RevenueOverviewPage() {
  const session = await getAdminSession();
  if (session.status !== "ok" || session.role !== "owner") {
    redirect("/");
  }

  return (
    <PlaceholderPage
      title="Revenue"
      description="Active members, MRR, and pre-sale totals from Supabase."
      notice="Waiting for Stripe webhook. Full revenue overview will be built in PART 3e."
    />
  );
}
