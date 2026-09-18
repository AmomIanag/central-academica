"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "./button";
import { Spinner } from "./feedback";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        onCancel();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const root = dialogRef.current;
      const focusables = root
        ? Array.from(root.querySelectorAll<HTMLElement>("button:not([disabled])"))
        : [];

      if (focusables.length === 0) {
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [busy, onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Fechar confirmação"
        onClick={() => {
          if (!busy) {
            onCancel();
          }
        }}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative z-10 w-full max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-5 shadow-lg"
      >
        <h2 id={titleId} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm text-muted">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy} aria-busy={busy}>
            {busy ? <Spinner className="h-4 w-4" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
