import { redirect } from "next/navigation";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getAdminSession } from "@/lib/auth";

export default async function RevenuePresalesPage() {
  const session = await getAdminSession();
  if (session.status !== "ok" || session.role !== "owner") {
    redirect("/");
  }

  return (
    <PlaceholderPage
      title="Pre-sales"
      description="Founding-member pre-sales (claimed / unclaimed) and CSV export."
      notice="Waiting for Stripe webhook. Pre-sales table will be built in PART 3e."
    />
  );
}
