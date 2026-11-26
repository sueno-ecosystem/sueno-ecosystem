"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import type { MediaKind, PresignResponse } from "@/lib/media/storage";

export function MediaUploadField({
  kind,
  entityId,
  accept,
  label,
  hint,
  currentKey,
  disabled = false,
  onUploaded,
}: {
  kind: MediaKind;
  entityId: string;
  accept: string;
  label: string;
  hint: string;
  currentKey: string | null;
  disabled?: boolean;
  onUploaded: (res: PresignResponse, file: File) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setError(null);
    setProgress(0);

    try {
      const contentType = file.type || (file.name.endsWith(".vtt") ? "text/vtt" : "application/octet-stream");
      const presignRes = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          entityId,
          contentType,
          sizeBytes: file.size,
        }),
      });

      const presignData = (await presignRes.json()) as Partial<PresignResponse> & { error?: string };
      if (!presignRes.ok || !presignData.uploadUrl || !presignData.key) {
        throw new Error(presignData.error ?? "Failed to get upload URL.");
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignData.uploadUrl!);
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            setProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload."));
        xhr.send(file);
      });

      await onUploaded(presignData as PresignResponse, file);
      setProgress(null);
    } catch (err) {
      setProgress(null);
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-fg">{label}</span>
        {currentKey && <span className="font-mono text-[11px] text-fg-muted">{currentKey}</span>}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          if (file) void uploadFile(file);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-5 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-border bg-bg hover:border-fg-muted/50"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
            e.target.value = "";
          }}
          className="hidden"
        />
        <Upload className="h-4 w-4 text-fg-muted" />
        <p className="mt-1.5 text-xs text-fg">
          {progress !== null ? `Uploading… ${progress}%` : "Drop file or click to upload"}
        </p>
        <p className="mt-0.5 text-[11px] text-fg-muted">{hint}</p>
      </div>

      {progress !== null && (
        <div className="h-1 w-full overflow-hidden rounded bg-bg-muted">
          <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p>}
    </div>
  );
}
