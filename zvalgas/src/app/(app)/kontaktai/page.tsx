"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { api, useLeads } from "@/components/LeadsProvider";
import { StatusDot, StatusPicker } from "@/components/Status";
import { telHref, when } from "@/lib/format";
import { NEEDS, STATUSES, statusById, type Lead, type LeadInput, type StatusId } from "@/lib/types";

type Filter = StatusId | "all";
type Sort = "created" | "called" | "name";

const empty: LeadInput = {
  name: "",
  companyCode: "",
  category: "",
  city: "",
  phone: "",
  email: "",
  website: "",
  revenue: "",
  need: "Svetainė",
  reason: "",
  source: "",
};

function AddForm({ onClose }: { onClose: () => void }) {
  const { upsert } = useLeads();
  const [f, setF] = useState<LeadInput>(empty);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof LeadInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const cls =
    "h-10 w-full rounded-lg border border-line bg-surface px-3 text-[15px] text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none md:text-[14px]";
  return (
    <form
      className="rise mb-5 grid gap-2.5 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr("");
        try {
          const res = await api<{ lead: Lead }>("/api/leads", { method: "POST", json: f });
          upsert(res.lead);
          onClose();
        } catch (x) {
          setErr((x as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <input autoFocus required className={cls} placeholder="Pavadinimas *" value={f.name} onChange={set("name")} />
      <input className={`${cls} font-mono`} placeholder="Telefonas" value={f.phone} onChange={set("phone")} />
      <input className={cls} placeholder="El. paštas" type="email" value={f.email} onChange={set("email")} />
      <input className={cls} placeholder="Svetainė (jei yra)" value={f.website} onChange={set("website")} />
      <input className={cls} placeholder="Sritis" value={f.category} onChange={set("category")} />
      <input className={cls} placeholder="Miestas" value={f.city} onChange={set("city")} />
      <select className={cls} value={f.need} onChange={set("need")}>
        {NEEDS.map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
      <input className={cls} placeholder="Įmonės kodas" value={f.companyCode} onChange={set("companyCode")} />
      <div className="flex items-center justify-end gap-3 sm:col-span-2 lg:col-span-4">
        {err && <span className="mr-auto text-[13px] text-accent">{err}</span>}
        <button type="button" onClick={onClose} className="text-[13px] text-muted hover:text-ink">
          Atšaukti
        </button>
        <button disabled={busy} className="h-9 rounded-lg bg-ink px-4 text-[13px] font-medium text-paper disabled:opacity-60">
          Pridėti
        </button>
      </div>
    </form>
  );
}

function csv(leads: Lead[]) {
  const cell = (v: string) => (/[",\n;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = ["Pavadinimas", "Statusas", "Telefonas", "El. paštas", "Sritis", "Miestas", "Pajamos", "Reikia", "Svetainė", "Įmonės kodas", "Bandymų", "Paskutinis skambutis", "Kas skambino", "Šaltinis"];
  const rows = leads.map((l) => [
    l.name, statusById(l.status).label, l.phone, l.email, l.category, l.city, l.revenue, l.need, l.website,
    l.companyCode, String(l.attempts), l.lastCalledAt ?? "", l.lastCalledBy ?? "", l.source,
  ]);
  return "﻿" + [head, ...rows].map((r) => r.map((v) => cell(v ?? "")).join(";")).join("\n");
}

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Contacts() {
  const router = useRouter();
  const { leads, loaded, upsert, refresh } = useLeads();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("created");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s.id, 0])) as Record<StatusId, number>;
    for (const l of leads) c[l.status]++;
    return c;
  }, [leads]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = leads.filter(
      (l) =>
        (filter === "all" || l.status === filter) &&
        (!needle || [l.name, l.category, l.city, l.phone, l.email, l.companyCode].some((v) => v.toLowerCase().includes(needle))),
    );
    const t = (s: string | null) => (s ? Date.parse(s) : 0);
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name, "lt"));
    else if (sort === "called") out.sort((a, b) => t(b.lastCalledAt) - t(a.lastCalledAt));
    else out.sort((a, b) => t(b.createdAt) - t(a.createdAt));
    return out;
  }, [leads, filter, q, sort]);

  async function changeStatus(id: string, status: StatusId) {
    try {
      const res = await api<{ lead: Lead }>(`/api/leads/${id}`, { method: "PATCH", json: { action: "status", status } });
      upsert(res.lead);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function importFile(file: File) {
    setNotice("Importuojama…");
    try {
      const data = JSON.parse(await file.text());
      const res = await api<{ added: number; skipped: number }>("/api/import", { method: "POST", json: data });
      setNotice(`Pridėta ${res.added}${res.skipped ? `, praleista ${res.skipped} (dublikatai ar netinkami)` : ""}.`);
      refresh();
    } catch (e) {
      setNotice(e instanceof SyntaxError ? "Failas nėra tinkamas JSON." : (e as Error).message);
    }
  }

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-[1200px] px-5 pb-16 pt-6 md:px-8 md:pt-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Kontaktai</h1>
            <p className="mt-1 text-[13px] text-muted">
              <span className="tnum">{leads.length}</span> įmonių · bendras komandos sąrašas
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setAdding((a) => !a)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-3.5 text-[13px] font-medium text-paper">
              <Icon name="plus" size={15} /> Pridėti
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-2 px-3.5 text-[13px]">
              <Icon name="upload" size={15} /> Importuoti
            </button>
            <button
              type="button"
              disabled={!leads.length}
              onClick={() => download(`zvalgas-${new Date().toISOString().slice(0, 10)}.csv`, csv(visible), "text/csv;charset=utf-8")}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-2 px-3.5 text-[13px] disabled:opacity-40"
            >
              <Icon name="download" size={15} /> CSV
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </header>

        {notice && (
          <div className="rise mt-4 flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink-2">
            {notice}
            <button type="button" onClick={() => setNotice("")} aria-label="Uždaryti" className="text-muted hover:text-ink">
              <Icon name="x" size={14} />
            </button>
          </div>
        )}

        <nav className="-mx-1 mt-6 flex gap-1 overflow-x-auto pb-1">
          {(["all", ...STATUSES.map((s) => s.id)] as Filter[]).map((id) => {
            const s = id === "all" ? null : statusById(id);
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
                <span className="tnum font-mono text-[11px] opacity-60">{id === "all" ? leads.length : counts[id]}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-b border-line pb-3">
          <div className="flex min-w-0 flex-1 basis-60 items-center gap-2 text-muted">
            <Icon name="search" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ieškoti pagal pavadinimą, telefoną, kodą…"
              className="h-9 min-w-0 flex-1 bg-transparent text-[15px] text-ink placeholder:text-muted/70 focus:outline-none md:text-[14px]"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink-2"
          >
            <option value="created">Naujausi</option>
            <option value="called">Neseniai skambinta</option>
            <option value="name">Pagal pavadinimą</option>
          </select>
        </div>

        <div className="pt-4">
          {adding && <AddForm onClose={() => setAdding(false)} />}

          {!loaded && <p className="py-10 text-[13px] text-muted">Kraunama…</p>}

          {loaded && visible.length === 0 && (
            <div className="py-20 text-center">
              <p className="font-serif text-[28px] italic text-ink-2">{leads.length ? "Nieko nerasta." : "Sąrašas tuščias."}</p>
              <p className="mt-2 text-[13px] text-muted">
                {leads.length ? "Pakeisk filtrą arba paiešką." : "Surask įmonių per „Paieška“ arba importuok JSON failą."}
              </p>
            </div>
          )}

          {visible.length > 0 && (
            <ul className="divide-y divide-line">
              {visible.map((l) => (
                <li
                  key={l.id}
                  onClick={() => router.push(`/?lead=${l.id}`)}
                  className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-lg px-2 py-3.5 transition-colors hover:bg-surface md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_9.5rem]"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14.5px] font-medium text-ink">{l.name}</div>
                    <div className="truncate text-[12.5px] text-muted">
                      {[l.category, l.city, l.revenue].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <div className="w-36 md:order-last">
                    <StatusPicker value={l.status} onChange={(s) => changeStatus(l.id, s)} />
                  </div>
                  <div className="col-span-2 min-w-0 md:col-span-1">
                    {l.phone ? (
                      <a href={telHref(l.phone)} onClick={(e) => e.stopPropagation()} className="tnum font-mono text-[13px] text-ink hover:text-accent">
                        {l.phone}
                      </a>
                    ) : (
                      <span className="font-mono text-[13px] text-muted">—</span>
                    )}
                    <div className="truncate text-[12px] text-muted">{l.need}</div>
                  </div>
                  <div className="col-span-2 hidden min-w-0 text-[12.5px] text-muted md:col-span-1 md:block">
                    {l.lastCalledAt ? (
                      <>
                        <div className="truncate text-ink-2">{when(l.lastCalledAt)}</div>
                        <div className="truncate">{l.lastCalledBy} · ×{l.attempts}</div>
                      </>
                    ) : (
                      "dar neskambinta"
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
