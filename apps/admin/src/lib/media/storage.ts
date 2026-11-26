export type MediaKind =
  | "video"
  | "poster"
  | "captions_en"
  | "captions_es"
  | "product"
  | "bundle"
  | "partner";

export interface PresignRequest {
  kind: MediaKind;
  entityId: string;
  contentType: string;
  sizeBytes: number;
}

export interface PresignResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string | null;
}

export interface MediaStorage {
  isConfigured(): boolean;
  createPresignedPut(req: PresignRequest): Promise<PresignResponse>;
}

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_CAPTIONS_BYTES = 2 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateMediaUpload(req: PresignRequest): string | null {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(req.entityId)) {
    return "Invalid entity ID.";
  }
  if (!Number.isFinite(req.sizeBytes) || req.sizeBytes <= 0) {
    return "File size must be positive.";
  }

  if (req.kind === "video") {
    if (req.contentType !== "video/mp4") return "Only MP4 (H.264) video is accepted.";
    if (req.sizeBytes > MAX_VIDEO_BYTES) return "Video exceeds 500 MB limit.";
    return null;
  }

  if (req.kind === "captions_en" || req.kind === "captions_es") {
    if (req.contentType !== "text/vtt" && req.contentType !== "text/plain") {
      return "Only .vtt caption files are accepted.";
    }
    if (req.sizeBytes > MAX_CAPTIONS_BYTES) return "Captions file is too large.";
    return null;
  }

  if (!IMAGE_TYPES.has(req.contentType)) {
    return "Only JPG, PNG, or WebP images are accepted.";
  }
  if (req.sizeBytes > MAX_IMAGE_BYTES) return "Image exceeds 5 MB limit.";
  return null;
}

export function buildMediaKey(kind: MediaKind, entityId: string, contentType: string): string {
  switch (kind) {
    case "video":
      return `videos/${entityId}/main.mp4`;
    case "poster":
      return `posters/${entityId}.jpg`;
    case "captions_en":
      return `captions/${entityId}.en.vtt`;
    case "captions_es":
      return `captions/${entityId}.es.vtt`;
    case "product":
      return `products/${entityId}.${extForImage(contentType)}`;
    case "bundle":
      return `bundles/${entityId}.${extForImage(contentType)}`;
    case "partner":
      return `partners/${entityId}.png`;
  }
}

function extForImage(contentType: string): string {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

export function isMediaConfigured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET
  );
}

export function mediaPublicUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL?.replace(/\/+$/, "");
  return base ? `${base}/${key}` : null;
}
