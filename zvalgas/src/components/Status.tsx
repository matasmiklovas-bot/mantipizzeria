"use client";

import { useEffect, useRef, useState } from "react";
import { STATUSES, statusById, type StatusId } from "@/lib/types";

export function StatusDot({ id, className = "" }: { id: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2 shrink-0 rounded-full ${className}`}
      style={{ background: statusById(id).color }}
    />
  );
}

export function StatusPill({ id }: { id: string }) {
  const s = statusById(id);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[12px] text-ink-2">
      <StatusDot id={s.id} />
      {s.short}
    </span>
  );
}

export function StatusPicker({ value, onChange }: { value: StatusId; onChange: (s: StatusId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = statusById(value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-8 w-full items-center gap-2 rounded-full border border-line bg-surface pl-3 pr-2.5 text-[13px] text-ink-2 transition-colors hover:border-line-2"
      >
        <StatusDot id={value} />
        <span className="truncate">{current.short}</span>
        <svg viewBox="0 0 10 10" className="ml-auto size-2.5 text-muted">
          <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          className="rise absolute right-0 z-30 mt-1.5 w-56 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-[0_12px_32px_-12px_rgba(22,21,19,0.25)]"
        >
          {STATUSES.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={s.id === value}
                onClick={() => {
                  setOpen(false);
                  if (s.id !== value) onChange(s.id);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-2 hover:bg-paper aria-selected:text-ink"
              >
                <StatusDot id={s.id} />
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
