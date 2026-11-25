import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { mediaStorage } from "@/lib/media/r2";
import { validateMediaUpload, type PresignRequest } from "@/lib/media/storage";

export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase not configured" }, { status: 503 });
  }

  if (!mediaStorage.isConfigured()) {
    return Response.json({ error: "Media storage not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: canEdit } = await supabase.rpc("can_edit");
  if (!canEdit) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Partial<PresignRequest> | null;
  if (
    !body ||
    typeof body.kind !== "string" ||
    typeof body.entityId !== "string" ||
    typeof body.contentType !== "string" ||
    typeof body.sizeBytes !== "number"
  ) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload: PresignRequest = {
    kind: body.kind as PresignRequest["kind"],
    entityId: body.entityId,
    contentType: body.contentType,
    sizeBytes: body.sizeBytes,
  };

  const validationError = validateMediaUpload(payload);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  try {
    const presigned = await mediaStorage.createPresignedPut(payload);
    return Response.json(presigned);
  } catch (err) {
    console.error("presign error", err);
    return Response.json({ error: "Failed to create upload URL" }, { status: 500 });
  }
}
