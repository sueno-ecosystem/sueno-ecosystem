import { redirect } from "next/navigation";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { getAdminSession } from "@/lib/auth";

export default async function RevenueMembersPage() {
  const session = await getAdminSession();
  if (session.status !== "ok" || session.role !== "owner") {
    redirect("/");
  }

  return (
    <PlaceholderPage
      title="Members"
      description="Read-only view of active and canceled subscriptions."
      notice="Waiting for Stripe webhook. Members table will be built in PART 3e."
    />
  );
}
