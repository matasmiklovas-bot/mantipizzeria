"use client";

import { useEffect, useRef, useState } from "react";
import { STATUSES, statusById, type StatusId } from "@/lib/types";

export function StatusDot({ id, className = "" }: { id: StatusId; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block size-2 shrink-0 rounded-full ${className}`}
      style={{ background: statusById(id).color }}
    />
  );
}

export function StatusPicker({ value, onChange }: { value: StatusId; onChange: (s: StatusId) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = statusById(value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      const n = Number(e.key);
      if (n >= 1 && n <= STATUSES.length) {
        onChange(STATUSES[n - 1].id);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onChange]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group flex h-8 w-full items-center gap-2 rounded-full border border-line bg-surface pl-3 pr-2.5 text-[13px] text-ink-2 transition-colors hover:border-line-2 hover:text-ink"
      >
        <StatusDot id={value} />
        <span className="truncate">{current.short}</span>
        <svg viewBox="0 0 10 10" className="ml-auto size-2.5 text-muted transition-transform group-aria-expanded:rotate-180">
          <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="rise absolute right-0 z-30 mt-1.5 w-60 overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-[0_12px_32px_-12px_rgba(22,21,19,0.25)]"
        >
          {STATUSES.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={s.id === value}
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-ink-2 hover:bg-paper aria-selected:text-ink"
              >
                <StatusDot id={s.id} />
                <span className="flex-1">{s.label}</span>
                <kbd className="font-mono text-[10px] text-muted">{i + 1}</kbd>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
