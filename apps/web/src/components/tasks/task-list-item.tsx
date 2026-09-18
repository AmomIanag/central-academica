"use client";

import Link from "next/link";
import { Check, RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatTaskDue, type Task } from "@/lib/tasks";

export function TaskListItem({
  task,
  busy,
  onToggle,
}: {
  task: Task;
  busy?: boolean;
  onToggle?: (task: Task) => void;
}) {
  const completed = task.status === "completed";

  return (
    <Card className="px-4 py-3">
      <div className="flex items-start gap-3">
        {onToggle ? (
          <Button
            variant="secondary"
            className="mt-0.5 h-8 w-8 shrink-0 px-0"
            onClick={() => onToggle(task)}
            disabled={busy}
            aria-label={completed ? `Reabrir ${task.title}` : `Concluir ${task.title}`}
          >
            {completed ? (
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
          </Button>
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/tarefas/${task.id}`}
              className={cn(
                "truncate text-sm font-medium hover:text-accent",
                completed && "text-muted line-through",
              )}
            >
              {task.title}
            </Link>
            <PriorityBadge priority={task.priority} />
            {task.overdue ? (
              <span className="text-[11px] font-medium text-danger">Atrasada</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">
            {formatTaskDue(task.due)}
            {task.discipline ? ` · ${task.discipline.code}` : " · Pessoal"}
          </p>
        </div>
      </div>
    </Card>
  );
}
