import { redirect } from "next/navigation";
import { AdminShell } from "@/components/AdminShell";
import { NoAccess } from "@/components/NoAccess";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  if (session.status === "unconfigured" || session.status === "unauthenticated") {
    redirect("/login");
  }

  if (session.status === "unauthorized") {
    return <NoAccess userId={session.userId} email={session.email} />;
  }

  return (
    <AdminShell email={session.email} role={session.role}>
      {children}
    </AdminShell>
  );
}
