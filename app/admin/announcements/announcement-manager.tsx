"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImagePicker } from "@/components/image-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAnnouncement, deleteAnnouncement, setAnnouncementPublished } from "@/lib/actions/announcements";
import type { ActionResult } from "@/lib/actions/result";
import type { Tables } from "@/lib/database.types";
import { stageImage } from "@/lib/stage-image";
import { publicImageUrl } from "@/lib/storage";

export function AnnouncementManager({ announcements }: { announcements: Tables<"announcements">[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<Tables<"announcements"> | null>(null);

  async function run(action: () => Promise<ActionResult>, message: string) {
    try {
      const result = await action();
      if (!result.ok) { toast.error(result.error); return false; }
      toast.success(message);
      return true;
    } catch {
      toast.error("Something went wrong. Please try again.");
      return false;
    }
  }

  return (
    <>
      <form className="flex max-w-2xl flex-col gap-4 rounded-xl border bg-card p-5" onSubmit={(event) => {
        event.preventDefault();
        if (!file) { setError("Choose a banner image."); return; }
        setError(undefined);
        startTransition(async () => {
          try {
            setProgress(0);
            const stagedImage = await stageImage(file, setProgress);
            const form = new FormData();
            form.set("title", title);
            form.set("stagedImage", stagedImage);
            const result = await createAnnouncement(form);
            if (!result.ok) { setError(result.error); return; }
            setFile(null);
            setTitle("");
            toast.success("Announcement published.");
          } catch {
            setError("Couldn't upload the banner. Please try again.");
          } finally { setProgress(null); }
        });
      }}>
        <h2 className="text-lg font-semibold">New announcement</h2>
        <fieldset disabled={pending} className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="announcement-title">Banner description</Label>
            <Input id="announcement-title" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={160} placeholder="e.g. Weekend diamond top-up offer" />
            <p className="text-xs text-muted-foreground">Describe the announcement for visitors using screen readers.</p>
          </div>
          <ImagePicker file={file} onFileChange={setFile} aspect="video" maxMb={30} progress={progress} label="Choose banner image" />
          <p className="text-sm text-muted-foreground">A wide banner works best. The full image will be shown without cropping. New banners appear first.</p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={pending}>{pending ? "Publishing…" : "Publish announcement"}</Button>
        </fieldset>
      </form>

      <div className="flex flex-col gap-4">
        {announcements.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No announcements yet. Upload your first banner above.</p>}
        {announcements.map((announcement) => (
          <article key={announcement.id} className="overflow-hidden rounded-xl border bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element -- pre-converted WebP with its natural aspect ratio */}
            <img src={publicImageUrl(announcement.image_path)} alt={announcement.title} loading="lazy" className="max-h-80 w-full object-contain" />
            <div className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div><p className="font-medium">{announcement.title}</p><p className="text-sm text-muted-foreground">{announcement.published ? "Published" : "Hidden"}</p></div>
              <div className="flex gap-2">
                <Button variant="outline" disabled={pending} onClick={() => startTransition(async () => {
                  await run(() => setAnnouncementPublished(announcement.id, !announcement.published), announcement.published ? "Announcement hidden." : "Announcement published.");
                })}>{announcement.published ? "Hide" : "Publish"}</Button>
                <Button variant="destructive" disabled={pending} onClick={() => setDeleting(announcement)}>Delete</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <ConfirmDialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }}
        title="Delete announcement?" description="This removes the banner from the homepage and deletes its image."
        confirmLabel="Delete" pendingLabel="Deleting…"
        onConfirm={() => deleting ? run(() => deleteAnnouncement(deleting.id), "Announcement deleted.") : Promise.resolve(false)} />
    </>
  );
}
