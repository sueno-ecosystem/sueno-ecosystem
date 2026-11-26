"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Camera, Check, Circle, ShieldCheck } from "lucide-react";
import type { Database } from "@galene/shared";
import type { AdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, formatDuration, publicMediaUrl, slugify } from "@/lib/format";
import { AuditHistoryTab } from "@/components/AuditHistoryTab";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MediaUploadField } from "@/components/MediaUploadField";
import { StatusBadge } from "@/components/StatusBadge";

type VideoRow = Database["public"]["Tables"]["videos"]["Row"];
type PillarRow = Database["public"]["Tables"]["pillars"]["Row"];
type TriggerTagRow = Database["public"]["Tables"]["trigger_tags"]["Row"];

const videoFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().min(1, "Slug is required").max(100),
  summary: z.string().max(2000).nullable().optional(),
  pillar: z.string().min(1),
  access: z.enum(["free", "members"]),
  sort: z.coerce.number().int().min(0),
  title_es: z.string().max(200).nullable().optional(),
  summary_es: z.string().max(2000).nullable().optional(),
});

type VideoFormValues = z.infer<typeof videoFormSchema>;

const TABS = ["Details", "Spanish", "Media", "Tags", "Review", "History"] as const;
type Tab = (typeof TABS)[number];

export function VideoEditor({
  initialVideo,
  pillars,
  triggerTags,
  initialTagSlugs,
  role,
}: {
  initialVideo: VideoRow;
  pillars: PillarRow[];
  triggerTags: TriggerTagRow[];
  initialTagSlugs: string[];
  role: AdminRole;
}) {
  const router = useRouter();
  const canEdit = role === "owner" || role === "editor";
  const canApprove = role === "owner" || role === "reviewer";

  const [video, setVideo] = useState<VideoRow>(initialVideo);
  const [tab, setTab] = useState<Tab>("Details");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(() => new Set(initialTagSlugs));
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [toast, setToast] = useState<string | null>(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [capturingFrame, setCapturingFrame] = useState(false);
  const videoElRef = useRef<HTMLVideoElement>(null);

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema) as never,
    defaultValues: {
      title: initialVideo.title,
      slug: initialVideo.slug,
      summary: initialVideo.summary ?? "",
      pillar: initialVideo.pillar,
      access: initialVideo.access === "free" ? "free" : "members",
      sort: initialVideo.sort,
      title_es: initialVideo.title_es ?? "",
      summary_es: initialVideo.summary_es ?? "",
    },
  });

  const isDirty = form.formState.isDirty;

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const videoUrl = publicMediaUrl(video.video_key);
  const posterUrl = publicMediaUrl(video.poster_key);

  const hasVideo = Boolean(video.video_key);
  const hasPoster = Boolean(video.poster_key);
  const medicalOk = !video.needs_medical_review || Boolean(video.reviewed_at);
  const publishReady = hasVideo && hasPoster && medicalOk;

  const groupedTags = useMemo(() => {
    const map = new Map<string, TriggerTagRow[]>();
    for (const t of triggerTags) {
      const list = map.get(t.pillar) ?? [];
      list.push(t);
      map.set(t.pillar, list);
    }
    return map;
  }, [triggerTags]);

  async function saveFields(patch: Partial<VideoRow>) {
    if (!canEdit) return;
    setSaveState("saving");
    setToast(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("videos")
      .update(patch)
      .eq("id", video.id)
      .select("*")
      .single();

    if (error) {
      setSaveState("error");
      setToast(error.message);
      return;
    }
    setVideo(data);
    setSaveState("saved");
    router.refresh();
  }

  async function onSubmitForm(values: VideoFormValues) {
    if (!canEdit) return;
    await saveFields({
      title: values.title.trim(),
      slug: slugify(values.slug) || values.slug.trim(),
      summary: values.summary?.trim() || null,
      pillar: values.pillar,
      access: values.access,
      sort: values.sort,
      title_es: values.title_es?.trim() || null,
      summary_es: values.summary_es?.trim() || null,
    });
    form.reset(values);
  }

  async function toggleTag(slug: string) {
    if (!canEdit) return;
    const supabase = createClient();
    const next = new Set(selectedTags);
    if (next.has(slug)) {
      next.delete(slug);
      setSelectedTags(next);
      const { error } = await supabase
        .from("video_tags")
        .delete()
        .eq("video_id", video.id)
        .eq("tag_slug", slug);
      if (error) setToast(error.message);
    } else {
      next.add(slug);
      setSelectedTags(next);
      const { error } = await supabase
        .from("video_tags")
        .insert({ video_id: video.id, tag_slug: slug });
      if (error) setToast(error.message);
    }
  }

  async function approveVideo() {
    if (!canApprove) return;
    setBusyAction(true);
    setToast(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("approve_video", { p_video: video.id });
    if (error) {
      setToast(error.message);
      setBusyAction(false);
      return;
    }
    const { data } = await supabase.from("videos").select("*").eq("id", video.id).single();
    if (data) setVideo(data);
    setBusyAction(false);
    setToast("Medical review approved.");
    router.refresh();
  }

  async function changeStatus(nextStatus: "draft" | "review" | "published" | "archived") {
    if (!canEdit) return;
    setBusyAction(true);
    await saveFields({ status: nextStatus });
    setBusyAction(false);
    setArchiveOpen(false);
  }

  async function captureFrameAsPoster() {
    const el = videoElRef.current;
    if (!el || !canEdit) return;
    setCapturingFrame(true);
    setToast(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = el.videoWidth || 1280;
      canvas.height = el.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
      );
      if (!blob) throw new Error("Failed to capture frame (CORS may block tainted canvas).");

      const presignRes = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "poster",
          entityId: video.id,
          contentType: "image/jpeg",
          sizeBytes: blob.size,
        }),
      });
      const presignData = (await presignRes.json()) as {
        uploadUrl?: string;
        key?: string;
        error?: string;
      };
      if (!presignRes.ok || !presignData.uploadUrl || !presignData.key) {
        throw new Error(presignData.error ?? "Media storage not configured");
      }

      const putRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      if (!putRes.ok) throw new Error(`Poster upload failed (${putRes.status})`);

      await saveFields({ poster_key: presignData.key });
      setToast("Poster captured from video.");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not capture frame.");
    } finally {
      setCapturingFrame(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1.5">
          <Link
            href="/videos"
            className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Videos</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold tracking-tight">{video.title}</h1>
            <StatusBadge status={video.status} />
            <span className="text-xs text-fg-muted">
              {saveState === "saving"
                ? "Saving…"
                : isDirty
                ? "Unsaved changes"
                : saveState === "error"
                ? "Save failed"
                : "Saved"}
            </span>
          </div>
          <p className="font-mono text-xs text-fg-muted">
            {video.slug} · {formatDuration(video.duration_seconds)} · Updated {formatDateTime(video.updated_at)}
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            {video.status === "draft" && (
              <button
                type="button"
                disabled={busyAction}
                onClick={() => void changeStatus("review")}
                className="rounded-md border border-border bg-bg-subtle px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg-muted"
              >
                Submit for review
              </button>
            )}

            {video.status !== "published" && (
              <button
                type="button"
                disabled={busyAction || !publishReady}
                onClick={() => void changeStatus("published")}
                title={publishReady ? "Publish video" : "Complete publish checklist below first"}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Publish
              </button>
            )}

            {video.status !== "archived" && (
              <button
                type="button"
                disabled={busyAction}
                onClick={() => setArchiveOpen(true)}
                className="rounded-md border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg-muted hover:bg-bg-muted hover:text-fg"
              >
                Archive
              </button>
            )}
          </div>
        )}
      </div>

      {/* Publish checklist */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-bg-subtle px-4 py-2.5 text-xs">
        <span className="font-medium text-fg-muted">Publish checklist:</span>
        <span className="inline-flex items-center gap-1.5">
          {hasVideo ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-fg-muted" />
          )}
          Video uploaded
        </span>
        <span className="inline-flex items-center gap-1.5">
          {hasPoster ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-fg-muted" />
          )}
          Poster uploaded
        </span>
        <span className="inline-flex items-center gap-1.5">
          {medicalOk ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Circle className="h-3.5 w-3.5 text-amber-500" />
          )}
          {video.needs_medical_review ? "Medical review approved" : "Medical review not required"}
        </span>
      </div>

      {toast && (
        <div className="rounded-md border border-border bg-bg-subtle px-3 py-2 text-xs text-fg">
          {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              tab === t
                ? "border-accent text-fg"
                : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {(tab === "Details" || tab === "Spanish") && (
        <form
          onSubmit={form.handleSubmit(onSubmitForm)}
          className="space-y-6 rounded-lg border border-border bg-bg-subtle p-6 sm:p-8"
        >
          {tab === "Details" && (
            <>
              <div className="border-b border-border pb-4">
                <h2 className="text-sm font-semibold text-fg">Lesson details</h2>
                <p className="mt-1 text-xs text-fg-muted">
                  Title, URL slug, and summary shown in the Learn tab.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-fg">Title</label>
                  <input
                    {...form.register("title")}
                    disabled={!canEdit}
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-fg">Slug</label>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() =>
                          form.setValue("slug", slugify(form.getValues("title")), { shouldDirty: true })
                        }
                        className="text-[11px] font-medium text-accent hover:underline"
                      >
                        Auto from title
                      </button>
                    )}
                  </div>
                  <input
                    {...form.register("slug")}
                    disabled={!canEdit}
                    className="h-10 w-full rounded-md border border-border bg-bg px-3.5 font-mono text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Summary</label>
                <textarea
                  rows={4}
                  {...form.register("summary")}
                  disabled={!canEdit}
                  className="min-h-[104px] w-full rounded-md border border-border bg-bg px-3.5 py-2.5 text-sm leading-relaxed text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                />
              </div>

              <div className="border-t border-border pt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                  Classification & access
                </h3>
                <div className="mt-4 grid gap-5 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-fg">Pillar</label>
                    <select
                      {...form.register("pillar")}
                      disabled={!canEdit}
                      className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                    >
                      {pillars.map((p) => (
                        <option key={p.slug} value={p.slug}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-fg">Access</label>
                    <select
                      {...form.register("access")}
                      disabled={!canEdit}
                      className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                    >
                      <option value="members">Members only</option>
                      <option value="free">Free preview</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-fg">Sort order</label>
                    <input
                      type="number"
                      {...form.register("sort")}
                      disabled={!canEdit}
                      className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === "Spanish" && (
            <>
              <div className="border-b border-border pb-4">
                <h2 className="text-sm font-semibold text-fg">Spanish localization</h2>
                <p className="mt-1 text-xs text-fg-muted">
                  Optional Spanish copy shown when the device language is Spanish.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Title (ES)</label>
                <input
                  {...form.register("title_es")}
                  disabled={!canEdit}
                  className="h-10 w-full rounded-md border border-border bg-bg px-3.5 text-sm text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-fg">Summary (ES)</label>
                <textarea
                  rows={4}
                  {...form.register("summary_es")}
                  disabled={!canEdit}
                  className="min-h-[104px] w-full rounded-md border border-border bg-bg px-3.5 py-2.5 text-sm leading-relaxed text-fg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
                />
              </div>
              <div className="rounded-md border border-border bg-bg px-4 py-3 text-xs text-fg-muted">
                Spanish captions key:{" "}
                <span className="font-mono text-fg">{video.captions_es_key ?? "Not uploaded"}</span>{" "}
                (upload in the Media tab).
              </div>
            </>
          )}

          {canEdit && (
            <div className="flex justify-end border-t border-border pt-5">
              <button
                type="submit"
                disabled={saveState === "saving"}
                className="h-9 rounded-md bg-accent px-4 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
              >
                Save changes
              </button>
            </div>
          )}
        </form>
      )}

      {tab === "Media" && (
        <div className="space-y-6 rounded-lg border border-border bg-bg-subtle p-5">
          <MediaUploadField
            kind="video"
            entityId={video.id}
            accept="video/mp4"
            label="Video (MP4 H.264)"
            hint="Max 500 MB · stored at videos/{id}/main.mp4"
            currentKey={video.video_key}
            disabled={!canEdit}
            onUploaded={async (res, file) => {
              const objectUrl = URL.createObjectURL(file);
              const duration = await new Promise<number | null>((resolve) => {
                const v = document.createElement("video");
                v.preload = "metadata";
                v.onloadedmetadata = () => {
                  const d = Number.isFinite(v.duration) ? Math.round(v.duration) : null;
                  URL.revokeObjectURL(objectUrl);
                  resolve(d && d > 0 ? d : null);
                };
                v.onerror = () => {
                  URL.revokeObjectURL(objectUrl);
                  resolve(null);
                };
                v.src = objectUrl;
              });
              await saveFields({
                video_key: res.key,
                ...(duration ? { duration_seconds: duration } : {}),
              });
            }}
          />

          {videoUrl && (
            <div className="space-y-2">
              <video
                ref={videoElRef}
                src={videoUrl}
                controls
                crossOrigin="anonymous"
                className="max-h-72 w-full rounded-md border border-border bg-black"
              />
              {canEdit && (
                <button
                  type="button"
                  onClick={captureFrameAsPoster}
                  disabled={capturingFrame}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg px-3 py-1.5 text-xs font-medium text-fg hover:bg-bg-muted disabled:opacity-60"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>{capturingFrame ? "Capturing…" : "Capture frame from video as poster"}</span>
                </button>
              )}
            </div>
          )}

          <MediaUploadField
            kind="poster"
            entityId={video.id}
            accept="image/jpeg,image/png,image/webp"
            label="Poster image"
            hint="JPG, PNG, or WebP · max 5 MB"
            currentKey={video.poster_key}
            disabled={!canEdit}
            onUploaded={async (res) => {
              await saveFields({ poster_key: res.key });
            }}
          />

          {posterUrl && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-fg-muted">Poster preview</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterUrl}
                alt={video.title}
                className="h-36 rounded-md border border-border object-cover"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <MediaUploadField
              kind="captions_en"
              entityId={video.id}
              accept=".vtt,text/vtt"
              label="Captions (English .vtt)"
              hint="WebVTT file"
              currentKey={video.captions_key}
              disabled={!canEdit}
              onUploaded={async (res) => {
                await saveFields({ captions_key: res.key });
              }}
            />
            <MediaUploadField
              kind="captions_es"
              entityId={video.id}
              accept=".vtt,text/vtt"
              label="Captions (Spanish .vtt)"
              hint="WebVTT file"
              currentKey={video.captions_es_key}
              disabled={!canEdit}
              onUploaded={async (res) => {
                await saveFields({ captions_es_key: res.key });
              }}
            />
          </div>
        </div>
      )}

      {tab === "Tags" && (
        <div className="space-y-4 rounded-lg border border-border bg-bg-subtle p-5">
          <p className="text-xs text-fg-muted">
            Link trigger tags to this lesson. Changes save immediately.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from(groupedTags.entries()).map(([pillar, tags]) => (
              <div key={pillar} className="rounded-md border border-border bg-bg p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-fg-muted">
                  {pillar}
                </p>
                <div className="space-y-1.5">
                  {tags.map((t) => (
                    <label key={t.slug} className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTags.has(t.slug)}
                        disabled={!canEdit}
                        onChange={() => void toggleTag(t.slug)}
                        className="accent-accent"
                      />
                      <span className="text-fg">{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Review" && (
        <div className="space-y-4 rounded-lg border border-border bg-bg-subtle p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-fg">Medical & clinical review</p>
              <p className="text-xs text-fg-muted">
                Videos in the Medications pillar always require approval from an owner or reviewer.
                Editing reviewed content clears approval automatically.
              </p>
            </div>
            {canApprove && (
              <button
                type="button"
                onClick={approveVideo}
                disabled={busyAction}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Approve</span>
              </button>
            )}
          </div>

          <div className="grid gap-3 border-t border-border pt-4 text-xs sm:grid-cols-3">
            <div>
              <span className="text-fg-muted">Needs review</span>
              <p className="mt-1 font-medium text-fg">
                {video.needs_medical_review ? "Yes" : "No"}
              </p>
              {canEdit && video.pillar !== "medications" && (
                <button
                  type="button"
                  onClick={() => void saveFields({ needs_medical_review: !video.needs_medical_review })}
                  className="mt-1 text-[11px] text-accent hover:underline"
                >
                  Toggle requirement
                </button>
              )}
            </div>
            <div>
              <span className="text-fg-muted">Reviewed at</span>
              <p className="mt-1 font-medium text-fg">{formatDateTime(video.reviewed_at)}</p>
            </div>
            <div>
              <span className="text-fg-muted">Reviewed by</span>
              <p className="mt-1 font-mono text-fg">{video.reviewed_by ?? "—"}</p>
            </div>
          </div>
        </div>
      )}

      {tab === "History" && <AuditHistoryTab tableName="videos" rowId={video.id} />}

      <ConfirmDialog
        open={archiveOpen}
        title="Archive video?"
        description="This removes the video from the app without deleting its R2 media files."
        confirmLabel="Archive"
        destructive
        loading={busyAction}
        onCancel={() => setArchiveOpen(false)}
        onConfirm={() => void changeStatus("archived")}
      />
    </div>
  );
}
