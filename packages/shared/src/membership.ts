export type SubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete" | "unpaid";

export interface Membership {
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
}

/** Mirrors public.is_member() in the database. */
export function isMember(m: Membership | null, now = new Date()): boolean {
  if (!m) return false;
  if (m.status !== "active" && m.status !== "trialing") return false;
  return !m.currentPeriodEnd || new Date(m.currentPeriodEnd) > now;
}
