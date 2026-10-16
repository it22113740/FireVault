"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlusIcon, Loader2Icon, RulerIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImagePicker } from "@/components/image-picker";
import { Button } from "@/components/ui/button";
import { createGameUpdate, deleteGameUpdate } from "@/lib/actions/game-updates";
import { formatDate } from "@/lib/format";
import type { GameUpdate } from "@/lib/game-updates";
import { stageImage } from "@/lib/stage-image";

export function UpdateManager({
  updates,
  size,
}: {
  updates: GameUpdate[];
  size: { width: number; height: number };
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<GameUpdate | null>(null);

  function publish() {
    if (!file) return setError("Choose an image first.");
    setError(undefined);
    startTransition(async () => {
      try {
        setProgress(0);
        const formData = new FormData();
        formData.set("stagedImage", await stageImage(file, setProgress));
        const result = await createGameUpdate(formData);
        if (!result.ok) return setError(result.error);
        setFile(null);
        toast.success("Update posted.");
      } catch (caught) {
        setError((caught as Error).message || "Couldn't upload the image. Please try again.");
      } finally {
        setProgress(null);
      }
    });
  }

  async function remove() {
    if (!deleting) return false;
    const result = await deleteGameUpdate(deleting.id);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success("Update deleted.");
    return true;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
      <section className="flex flex-col gap-4 rounded-xl border bg-card p-5 lg:sticky lg:top-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ImagePlusIcon className="size-5 text-primary" /> New update
        </h2>
        <p className="flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">
          <RulerIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Use <strong className="tabular-nums">{size.width} × {size.height} px</strong> (16:9 landscape) so it
            fills the frame. Other shapes are shown whole with bars around them.
          </span>
        </p>
        <ImagePicker
          aspect="video"
          maxMb={30}
          label="Choose update image"
          file={file}
          onFileChange={(next) => {
            setFile(next);
            setError(undefined);
          }}
          progress={progress}
          error={error}
        />
        <Button size="lg" className="h-11" onClick={publish} disabled={pending || !file}>
          {pending && <Loader2Icon className="animate-spin" />}
          {pending ? "Posting…" : "Post update"}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Posted <span className="text-muted-foreground tabular-nums">({updates.length})</span>
        </h2>
        {updates.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No updates yet. Post your first image.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {updates.map((update, index) => (
              <li key={update.id} className="overflow-hidden rounded-xl border bg-card">
                <div className="relative aspect-video bg-muted">
                  <Image
                    src={update.imageUrl}
                    alt={`Update posted ${formatDate(update.createdAt)}`}
                    fill
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                    className="object-contain"
                  />
                  {index === 0 && (
                    <span className="absolute top-2 left-2 rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                      Latest
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 p-3">
                  <span className="text-sm text-muted-foreground">{formatDate(update.createdAt)}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleting(update)}
                  >
                    <Trash2Icon /> Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this update?"
        description="It's removed from the Updates page and its image is deleted."
        confirmLabel="Delete"
        pendingLabel="Deleting…"
        onConfirm={remove}
      />
    </div>
  );
}
