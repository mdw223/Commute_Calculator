"use client";

import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md border-4 border-ink bg-surface shadow-brutal p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="font-display text-xl font-bold">
          {title}
        </h2>
        <p className="text-sm text-muted">{message}</p>
        <div className="flex gap-2 justify-end flex-wrap">
          <button
            type="button"
            onClick={onCancel}
            className="border-2 border-ink px-4 py-2 font-mono text-xs uppercase bg-surface hover:bg-newsprint"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="border-2 border-ink px-4 py-2 font-mono text-xs uppercase bg-headline text-newsprint hover:bg-headline/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
