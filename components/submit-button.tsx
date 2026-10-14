"use client";

import { useFormStatus } from "react-dom";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = Omit<React.ComponentProps<typeof Button>, "type"> & {
  pendingLabel: string;
  // For forms not submitted through a form action (e.g. React Hook Form)
  pending?: boolean;
};

// Disabled + spinner + verb in progress while submitting; never double-submits
export function SubmitButton({
  pendingLabel,
  pending: pendingProp,
  disabled,
  children,
  ...props
}: SubmitButtonProps) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;

  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...props}>
      {pending && <Loader2Icon className="animate-spin" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
