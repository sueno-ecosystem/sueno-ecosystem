const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
export type Utm = Partial<Record<(typeof KEYS)[number], string>>;

/** Client side: read UTM tags from the URL (and remember them for this visit). */
export function getUtm(): Utm {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const fromUrl: Utm = {};
  for (const k of KEYS) {
    const v = params.get(k);
    if (v) fromUrl[k] = v;
  }
  try {
    if (Object.keys(fromUrl).length) sessionStorage.setItem("utm", JSON.stringify(fromUrl));
    return Object.keys(fromUrl).length ? fromUrl : JSON.parse(sessionStorage.getItem("utm") ?? "{}");
  } catch {
    return fromUrl;
  }
}

/** Server side: keep only known keys, short strings. */
export function cleanUtm(input: unknown): Utm {
  const out: Utm = {};
  if (!input || typeof input !== "object") return out;
  for (const k of KEYS) {
    const v = (input as Record<string, unknown>)[k];
    if (typeof v === "string" && v.length) out[k] = v.slice(0, 100);
  }
  return out;
}
