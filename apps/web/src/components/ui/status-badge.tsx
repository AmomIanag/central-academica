import { cn } from "@/lib/cn";
import { statusLabel } from "@/lib/format";
import type { AcademicStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: AcademicStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        status === "aprovado" && "bg-success/12 text-success",
        status === "reprovado" && "bg-danger/12 text-danger",
        status === "em_andamento" && "bg-warning/12 text-warning",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
