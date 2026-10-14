import type { LucideIcon } from "lucide-react";
import { InboxIcon } from "lucide-react";

export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </span>
      <p className="max-w-sm text-sm text-muted-foreground">{title}</p>
      {action}
    </div>
  );
}
