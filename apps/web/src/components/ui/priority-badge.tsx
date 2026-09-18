import { cn } from "@/lib/cn";
import { priorityLabel, type TaskPriority } from "@/lib/tasks";

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        priority === "high" && "bg-danger/12 text-danger",
        priority === "normal" && "bg-foreground/8 text-muted",
        priority === "low" && "text-muted",
      )}
    >
      {priorityLabel(priority)}
    </span>
  );
}
