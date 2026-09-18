import { cn } from "@/lib/cn";
import { statusLabel } from "@/lib/format";
import type { AcademicStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: AcademicStatus }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium tracking-wide",
        status === "APROVADO_DIRETO" && "bg-success/12 text-success",
        status === "REPROVADO_DIRETO" && "bg-danger/12 text-danger",
        status === "EXAME" && "bg-warning/12 text-warning",
        status === "EM_ANDAMENTO" && "bg-surface-hover text-muted",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
