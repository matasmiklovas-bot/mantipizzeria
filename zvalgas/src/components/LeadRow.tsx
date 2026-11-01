"use client";

import { memo, useState } from "react";
import type { Lead, StatusId } from "@/lib/types";
import { StatusPicker } from "./StatusPicker";

function host(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function href(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="text-[13px] text-ink-2">{children}</div>
    </div>
  );
}

export const LeadRow = memo(function LeadRow({
  lead,
  onStatus,
  onNote,
  onRemove,
}: {
  lead: Lead;
  onStatus: (id: string, s: StatusId) => void;
  onNote: (id: string, note: string) => void;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const meta = [lead.category, lead.city, lead.revenue].filter(Boolean);

  return (
    <li className="group border-b border-line last:border-b-0">
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-3 px-1 py-4 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.1fr)_minmax(0,1.2fr)_9.5rem_1.5rem]">
        {/* Name */}
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 text-left">
          <div className="flex items-center gap-2">
            {lead.fresh && <span className="size-1.5 shrink-0 rounded-full bg-accent" title="Nauja" />}
            <span className="truncate text-[15px] font-medium tracking-[-0.01em] text-ink">{lead.name}</span>
          </div>
          <div className="mt-0.5 truncate text-[12.5px] text-muted">{meta.join(" · ") || "—"}</div>
        </button>

        {/* Status (mobile position) */}
        <div className="w-36 md:hidden">
          <StatusPicker value={lead.status} onChange={(s) => onStatus(lead.id, s)} />
        </div>

        {/* Contacts */}
        <div className="col-span-2 flex min-w-0 flex-col gap-0.5 md:col-span-1">
          {lead.phone ? (
            <a href={`tel:${lead.phone.replace(/\s/g, "")}`} className="tnum font-mono text-[13px] text-ink hover:text-accent">
              {lead.phone}
            </a>
          ) : (
            <span className="font-mono text-[13px] text-muted">—</span>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="truncate text-[12.5px] text-muted hover:text-ink">
              {lead.email}
            </a>
          )}
        </div>

        {/* Need */}
        <div className="col-span-2 hidden min-w-0 md:col-span-1 md:block">
          <div className="truncate text-[13px] text-ink-2">{lead.need}</div>
          <div className="truncate text-[12.5px] text-muted">
            {lead.website ? (
              <a href={href(lead.website)} target="_blank" rel="noreferrer" className="hover:text-ink">
                {host(lead.website)} ↗
              </a>
            ) : (
              "svetainės nėra"
            )}
          </div>
        </div>

        <div className="hidden md:block">
          <StatusPicker value={lead.status} onChange={(s) => onStatus(lead.id, s)} />
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Suskleisti" : "Išskleisti"}
          className="hidden size-6 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-ink md:flex"
        >
          <svg viewBox="0 0 10 10" className={`size-2.5 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="rise grid gap-5 px-1 pb-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,2.3fr)] md:gap-8">
          <div className="grid grid-cols-2 gap-4 content-start">
            <Field label="Kodėl">{lead.reason || "—"}</Field>
            <Field label="Reikia">{lead.need}</Field>
            <Field label="Įmonės kodas">
              <span className="tnum font-mono">{lead.companyCode || "—"}</span>
            </Field>
            <Field label="Svetainė">
              {lead.website ? (
                <a href={href(lead.website)} target="_blank" rel="noreferrer" className="underline decoration-line-2 underline-offset-2 hover:text-ink">
                  {host(lead.website)}
                </a>
              ) : (
                "nėra"
              )}
            </Field>
            {lead.source && (
              <Field label="Šaltinis">
                <a href={href(lead.source)} target="_blank" rel="noreferrer" className="underline decoration-line-2 underline-offset-2 hover:text-ink">
                  {host(lead.source)}
                </a>
              </Field>
            )}
            <Field label="Pridėta">
              <span className="tnum">{new Date(lead.createdAt).toLocaleDateString("lt-LT")}</span>
            </Field>
          </div>

          <div className="flex flex-col gap-3">
            <textarea
              defaultValue={lead.note}
              onBlur={(e) => e.target.value !== lead.note && onNote(lead.id, e.target.value)}
              placeholder="Pastabos: su kuo kalbėjai, kada perskambinti, kiek siūlei…"
              rows={4}
              className="w-full resize-y rounded-lg border border-line bg-surface p-3 text-[13.5px] leading-relaxed text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => (confirm ? onRemove(lead.id) : setConfirm(true))}
                onBlur={() => setConfirm(false)}
                className={`text-[12px] transition-colors ${confirm ? "text-accent" : "text-muted hover:text-ink"}`}
              >
                {confirm ? "Tikrai ištrinti?" : "Ištrinti"}
              </button>
            </div>
          </div>
        </div>
      )}
    </li>
  );
});
