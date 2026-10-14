import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/actions/result";

// Map a failed Server Action result onto React Hook Form fields + a toast
export function showActionError<T extends FieldValues>(
  result: Extract<ActionResult<unknown>, { ok: false }>,
  setError?: UseFormSetError<T>
) {
  if (setError && result.fieldErrors) {
    for (const [field, messages] of Object.entries(result.fieldErrors)) {
      if (messages?.[0]) setError(field as Path<T>, { message: messages[0] });
    }
  }
  toast.error(result.error);
}
