// Keep in sync with supabase/seed.sql (trigger_tags).
export const PILLARS = ["environment", "medications", "clothes", "wearables", "knowledge", "mind"] as const;
export type Pillar = (typeof PILLARS)[number];

export const TRIGGER_TAGS = [
  { slug: "racing_thoughts", label: "Racing thoughts", pillar: "mind" },
  { slug: "work_worry", label: "Worried about work", pillar: "mind" },
  { slug: "too_hot", label: "Too hot", pillar: "environment" },
  { slug: "noise", label: "Noise", pillar: "environment" },
  { slug: "light", label: "Light in the room", pillar: "environment" },
  { slug: "late_caffeine", label: "Caffeine late", pillar: "knowledge" },
  { slug: "late_screen", label: "Screens before bed", pillar: "knowledge" },
  { slug: "alcohol", label: "Alcohol", pillar: "knowledge" },
  { slug: "uncomfortable_sleepwear", label: "Uncomfortable sleepwear", pillar: "clothes" },
  { slug: "tracker_anxiety", label: "Checking my sleep tracker", pillar: "wearables" },
  { slug: "med_change", label: "Medication change", pillar: "medications" },
] as const satisfies ReadonlyArray<{ slug: string; label: string; pillar: Pillar }>;

export type TriggerTagSlug = (typeof TRIGGER_TAGS)[number]["slug"];
