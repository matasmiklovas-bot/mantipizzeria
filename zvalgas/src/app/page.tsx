"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AddLeadForm } from "@/components/AddLeadForm";
import { LeadRow } from "@/components/LeadRow";
import { SearchPanel } from "@/components/SearchPanel";
import { StatusDot } from "@/components/StatusPicker";
import { useLeads } from "@/lib/store";
import { STATUSES, type Lead, type StatusId } from "@/lib/types";

type Filter = StatusId | "all";

function csvCell(v: string) {
  return /[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const { leads, ready, addMany, update, remove, replaceAll } = useLeads();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s.id, 0])) as Record<StatusId, number>;
    for (const l of leads) c[l.status]++;
    return c;
  }, [leads]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter(
      (l) =>
        (filter === "all" || l.status === filter) &&
        (!needle ||
          [l.name, l.category, l.city, l.phone, l.email, l.note].some((v) => v.toLowerCase().includes(needle))),
    );
  }, [leads, filter, q]);

  const exclude = useMemo(() => leads.map((l) => l.name).slice(0, 300), [leads]);

  const onStatus = useCallback((id: string, status: StatusId) => update(id, { status }), [update]);
  const onNote = useCallback((id: string, note: string) => update(id, { note }), [update]);

  const exportCsv = () => {
    const head = ["Pavadinimas", "Statusas", "Telefonas", "El. paštas", "Sritis", "Miestas", "Pajamos", "Reikia", "Svetainė", "Įmonės kodas", "Pastabos", "Šaltinis"];
    const rows = leads.map((l) => [
      l.name, STATUSES.find((s) => s.id === l.status)!.label, l.phone, l.email, l.category, l.city,
      l.revenue, l.need, l.website, l.companyCode, l.note, l.source,
    ]);
    const csv = "﻿" + [head, ...rows].map((r) => r.map(csvCell).join(";")).join("\n");
    download(`zvalgas-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
  };

  const exportJson = () =>
    download(`zvalgas-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(leads, null, 2), "application/json");

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data) || !data.every((l) => l && typeof l.id === "string" && typeof l.name === "string")) {
        alert("Netinkamas failas.");
        return;
      }
      if (leads.length && !confirm(`Pakeisti dabartinius ${leads.length} kontaktus ${data.length} iš failo?`)) return;
      replaceAll(data as Lead[]);
    } catch {
      alert("Nepavyko nuskaityti failo.");
    }
  };

  const called = leads.length - counts.new;

  return (
    <div className="mx-auto max-w-[1360px] px-5 md:px-10">
      <header className="flex items-end justify-between gap-6 border-b border-line pb-5 pt-8 md:pt-12">
        <div>
          <h1 className="font-serif text-[44px] leading-[0.9] tracking-[-0.02em] md:text-[56px]">
            Žvalgas<span className="text-accent">.</span>
          </h1>
          <p className="mt-2 text-[13px] text-muted">Verslai, kuriems reikia svetainės ar sistemos.</p>
        </div>
        <div className="hidden gap-8 text-right sm:flex">
          <div>
            <div className="tnum font-serif text-[32px] leading-none">{ready ? leads.length : "–"}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted">kontaktų</div>
          </div>
          <div>
            <div className="tnum font-serif text-[32px] leading-none">{ready ? called : "–"}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted">paskambinta</div>
          </div>
          <div>
            <div className="tnum font-serif text-[32px] leading-none" style={{ color: "var(--s-interested)" }}>
              {ready ? counts.interested : "–"}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-muted">nori</div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 py-6 lg:py-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            aria-expanded={searchOpen}
            className="flex h-11 w-full items-center justify-between rounded-lg border border-line-2 px-4 text-[14px] font-medium lg:hidden"
          >
            Ieškoti naujų įmonių
            <svg viewBox="0 0 10 10" className={`size-2.5 transition-transform ${searchOpen ? "rotate-180" : ""}`}>
              <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
            </svg>
          </button>
          {/* Kept mounted on mobile so a running search survives collapsing the panel. */}
          <div className={`${searchOpen ? "mt-6 block" : "hidden"} lg:mt-0 lg:block`}>
            <SearchPanel exclude={exclude} onLeads={addMany} />
          </div>
        </aside>

        <main className="min-w-0">
          {/* Status filter */}
          <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
            {(["all", ...STATUSES.map((s) => s.id)] as Filter[]).map((id) => {
              const s = STATUSES.find((x) => x.id === id);
              const n = id === "all" ? leads.length : counts[id];
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                  className="flex h-8 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] text-muted transition-colors hover:text-ink aria-pressed:bg-ink aria-pressed:text-paper"
                >
                  {s && <StatusDot id={s.id} />}
                  {s ? s.short : "Visi"}
                  <span className="tnum font-mono text-[11px] opacity-60">{ready ? n : ""}</span>
                </button>
              );
            })}
          </nav>

          {/* Toolbar */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line pb-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtruoti pagal pavadinimą, tel., pastabas…"
              className="h-9 min-w-0 flex-1 basis-56 bg-transparent text-[14px] placeholder:text-muted/70 focus:outline-none"
            />
            <div className="flex items-center gap-4 text-[12.5px] text-muted">
              <button type="button" onClick={() => setAdding((a) => !a)} className="hover:text-ink">
                + Pridėti
              </button>
              <button type="button" onClick={exportCsv} disabled={!leads.length} className="hover:text-ink disabled:opacity-40">
                CSV
              </button>
              <button type="button" onClick={exportJson} disabled={!leads.length} className="hover:text-ink disabled:opacity-40">
                Atsarginė kopija
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className="hover:text-ink">
                Įkelti
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importJson(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="pt-5">
            {adding && <AddLeadForm onAdd={(l) => addMany([l], false) > 0} onClose={() => setAdding(false)} />}

            {ready && visible.length > 0 && (
              <ul>
                {visible.map((l) => (
                  <LeadRow key={l.id} lead={l} onStatus={onStatus} onNote={onNote} onRemove={remove} />
                ))}
              </ul>
            )}

            {ready && visible.length === 0 && (
              <div className="py-24 text-center">
                <p className="font-serif text-[28px] italic text-ink-2">
                  {leads.length === 0 ? "Sąrašas tuščias." : "Nieko nerasta."}
                </p>
                <p className="mt-2 text-[13px] text-muted">
                  {leads.length === 0
                    ? "Pasirink sritį ir miestą, tada spausk „Ieškoti įmonių“."
                    : "Pakeisk filtrą arba paieškos frazę."}
                </p>
              </div>
            )}
          </div>

          {ready && leads.length > 0 && (
            <p className="mt-10 border-t border-line pt-4 text-[11.5px] text-muted">
              Duomenys saugomi tik šioje naršyklėje. Reguliariai daryk atsarginę kopiją.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
