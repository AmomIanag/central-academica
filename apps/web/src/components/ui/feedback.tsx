import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("h-4 w-4 animate-spin", className)} aria-hidden />;
}

export function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-5 w-5 text-muted" />
      <span className="sr-only">Carregando</span>
    </div>
  );
}

export function ScreenLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Spinner className="h-5 w-5 text-muted" />
      <span className="sr-only">Carregando</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border px-6 py-12 text-center">
      <Inbox className="h-5 w-5 text-muted" aria-hidden />
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-border bg-surface px-6 py-12 text-center" role="alert">
      <AlertCircle className="h-5 w-5 text-danger" aria-hidden />
      <p className="mt-3 text-sm font-medium text-foreground">{message}</p>
      {onRetry ? (
        <Button className="mt-4" variant="secondary" onClick={onRetry}>
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
