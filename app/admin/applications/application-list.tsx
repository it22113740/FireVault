"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckIcon, Loader2Icon, UserPlusIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { approveApplication, denyApplication } from "@/lib/actions/applications";
import type { Enums } from "@/lib/database.types";
import { formatDate } from "@/lib/format";
import { whatsappUrl } from "@/lib/whatsapp";

export type ApplicationRow = {
  id: string;
  full_name: string;
  email: string;
  whatsapp_number: string;
  contact_number: string;
  status: Enums<"application_status">;
  deny_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  screenshotUrl: string | null;
};

const EMPTY: Record<Enums<"application_status">, string> = {
  pending: "No applications waiting for review.",
  approved: "No approved applications yet.",
  denied: "No denied applications.",
};

export function ApplicationList({
  applications,
  status,
}: {
  applications: ApplicationRow[];
  status: Enums<"application_status">;
}) {
  const reduce = useReducedMotion();

  if (applications.length === 0) {
    return <EmptyState icon={UserPlusIcon} title={EMPTY[status]} />;
  }

  // Reviewed cards slide out when the refreshed list no longer includes them
  return (
    <ul className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {applications.map((application) => (
          <motion.li
            key={application.id}
            layout={!reduce}
            exit={{ opacity: 0, x: reduce ? 0 : 40 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <ApplicationCard application={application} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function ApplicationCard({ application }: { application: ApplicationRow }) {
  const [zoom, setZoom] = useState(false);

  return (
    <article className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[8rem_1fr]">
      {application.screenshotUrl ? (
        <button
          type="button"
          onClick={() => setZoom(true)}
          className="relative aspect-[3/4] w-full overflow-hidden rounded-lg border bg-muted sm:w-32"
          aria-label={`View ${application.full_name}'s screenshot`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
          <img src={application.screenshotUrl} alt="" className="size-full object-cover" />
        </button>
      ) : (
        <div className="flex aspect-[3/4] items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground sm:w-32">
          No preview
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold">{application.full_name}</h2>
          <p className="text-xs text-muted-foreground">Applied {formatDate(application.created_at)}</p>
        </div>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Detail label="Email">
            <a href={`mailto:${application.email}`} className="break-all hover:text-primary">
              {application.email}
            </a>
          </Detail>
          <Detail label="WhatsApp">
            <a
              href={whatsappUrl(application.whatsapp_number)}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary"
            >
              {application.whatsapp_number}
            </a>
          </Detail>
          <Detail label="Contact">
            <a href={`tel:${application.contact_number}`} className="hover:text-primary">
              {application.contact_number}
            </a>
          </Detail>
          {application.reviewed_at && (
            <Detail label="Reviewed">{formatDate(application.reviewed_at)}</Detail>
          )}
        </dl>
        {application.deny_reason && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm">
            <span className="font-medium">Reason:</span> {application.deny_reason}
          </p>
        )}
        {application.status === "pending" && <ReviewActions application={application} />}
      </div>

      {application.screenshotUrl && (
        <Dialog open={zoom} onOpenChange={setZoom}>
          <DialogContent className="max-w-2xl p-2">
            <DialogTitle className="sr-only">{application.full_name}&apos;s screenshot</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
            <img
              src={application.screenshotUrl}
              alt={`${application.full_name}'s WhatsApp group screenshot`}
              className="max-h-[80svh] w-full rounded-lg object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </article>
  );
}

function ReviewActions({ application }: { application: ApplicationRow }) {
  const [approving, startApprove] = useTransition();
  const [denyOpen, setDenyOpen] = useState(false);
  const [reason, setReason] = useState("");

  function approve() {
    startApprove(async () => {
      const result = await approveApplication(application.id);
      if (result.ok) {
        toast.success(`${application.full_name} approved. They'll get an email to set their password.`);
      } else {
        toast.error(result.error);
      }
    });
  }

  async function deny() {
    const result = await denyApplication(application.id, reason);
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(
      result.data.emailed
        ? `${application.full_name} was denied and emailed.`
        : `${application.full_name} was denied. Email isn't set up, so let them know yourself.`
    );
    return true;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="lg" onClick={approve} disabled={approving} className="h-11">
        {approving ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
        {approving ? "Approving…" : "Approve"}
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() => setDenyOpen(true)}
        disabled={approving}
        className="h-11"
      >
        <XIcon /> Deny
      </Button>
      <ConfirmDialog
        open={denyOpen}
        onOpenChange={setDenyOpen}
        title={`Deny ${application.full_name}?`}
        description="They won't get a login. If email is set up, they'll receive the reason below."
        confirmLabel="Deny application"
        pendingLabel="Denying…"
        onConfirm={deny}
      >
        <FormField
          label="Reason (optional)"
          htmlFor={`reason-${application.id}`}
          counter={{ value: reason.length, max: 500 }}
        >
          <Textarea
            id={`reason-${application.id}`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            rows={3}
          />
        </FormField>
      </ConfirmDialog>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate">{children}</dd>
    </div>
  );
}
