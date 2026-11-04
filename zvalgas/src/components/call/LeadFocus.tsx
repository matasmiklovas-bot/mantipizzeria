"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { api, useLeads } from "@/components/LeadsProvider";
import { host, href, telHref, when } from "@/lib/format";
import { toneColor, type Placed } from "@/lib/queue";
import { NEEDS, type Lead, type LeadInput, type StatusId } from "@/lib/types";

const OUTCOMES: { status: StatusId; label: string; key: string; cls: string }[] = [
  { status: "no_answer", label: "Neatsiliepė", key: "1", cls: "hover:border-[var(--s-no-answer)]" },
  { status: "declined", label: "Nenori", key: "2", cls: "hover:border-[var(--s-declined)]" },
  { status: "thinking", label: "Pagalvos", key: "3", cls: "hover:border-[var(--s-thinking)]" },
  { status: "interested", label: "Nori", key: "4", cls: "hover:border-[var(--s-interested)]" },
];

function at(daysAhead: number, hour = 10) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="mt-1 break-words text-[13.5px] text-ink-2">{children}</dd>
    </div>
  );
}

function EditForm({ lead, onDone }: { lead: Lead; onDone: () => void }) {
  const { upsert } = useLeads();
  const [f, setF] = useState<LeadInput>({ ...lead });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof LeadInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));
  const cls =
    "h-10 w-full rounded-lg border border-line bg-surface px-3 text-[15px] text-ink focus:border-ink focus:outline-none";
  const fields: [keyof LeadInput, string][] = [
    ["name", "Pavadinimas"],
    ["phone", "Telefonas"],
    ["email", "El. paštas"],
    ["website", "Svetainė"],
    ["category", "Sritis"],
    ["city", "Miestas"],
    ["companyCode", "Įmonės kodas"],
    ["revenue", "Pajamos"],
  ];
  return (
    <form
      className="rise grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const res = await api<{ lead: Lead }>(`/api/leads/${lead.id}`, { method: "PATCH", json: { action: "edit", fields: f } });
          upsert(res.lead);
          onDone();
        } catch (err) {
          alert((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {fields.map(([k, label]) => (
        <label key={k} className="text-[12px] text-muted">
          {label}
          <input className={`${cls} mt-1`} value={f[k]} onChange={set(k)} required={k === "name"} />
        </label>
      ))}
      <label className="text-[12px] text-muted">
        Reikia
        <select className={`${cls} mt-1`} value={f.need} onChange={set("need")}>
          {NEEDS.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      </label>
      <label className="text-[12px] text-muted sm:col-span-2">
        Kodėl jiems reikia
        <textarea className={`${cls} mt-1 h-20 py-2`} value={f.reason} onChange={set("reason")} />
      </label>
      <div className="flex justify-end gap-3 sm:col-span-2">
        <button type="button" onClick={onDone} className="text-[13px] text-muted hover:text-ink">
          Atšaukti
        </button>
        <button disabled={busy} className="h-9 rounded-lg bg-ink px-4 text-[13px] font-medium text-paper disabled:opacity-60">
          Išsaugoti
        </button>
      </div>
    </form>
  );
}

export function LeadFocus({
  placed,
  position,
  total,
  onLogged,
  onSkip,
}: {
  placed: Placed;
  position: number | null;
  total: number;
  onLogged: (lead: Lead) => void;
  onSkip: (() => void) | null;
}) {
  const { upsert } = useLeads();
  const lead = placed.lead;
  const [note, setNote] = useState("");
  const [askWhen, setAskWhen] = useState(false);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Reset the form whenever another lead is opened.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNote("");
    setAskWhen(false);
    setCustom("");
    setEditing(false);
  }, [lead.id]);

  async function log(status: StatusId, callbackAt?: Date) {
    if (busy) return;
    if (status === "thinking" && !callbackAt) {
      setAskWhen(true);
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ lead: Lead }>(`/api/leads/${lead.id}`, {
        method: "PATCH",
        json: { action: "call", status, note, callbackAt: callbackAt?.toISOString() },
      });
      upsert(res.lead);
      onLogged(res.lead);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const logRef = useRef(log);
  useEffect(() => {
    logRef.current = log;
  });

  // Keyboard: 1–4 log an outcome (when not typing), N focuses the note.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
      const o = OUTCOMES.find((x) => x.key === e.key);
      if (o) {
        e.preventDefault();
        logRef.current(o.status);
      } else if (e.key === "n") {
        e.preventDefault();
        noteRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const meta = [lead.category, lead.city].filter(Boolean).join(" · ");

  return (
    <article className="mx-auto w-full max-w-[760px] px-5 pb-8 pt-6 md:px-8 md:pt-8">
      <div className="flex items-center gap-3 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: toneColor[placed.tone] }}>
          <span className="size-1.5 rounded-full" style={{ background: toneColor[placed.tone] }} />
          {placed.label}
        </span>
        {position !== null && (
          <span className="tnum">
            {position} iš {total}
          </span>
        )}
        <button type="button" onClick={() => setEditing((v) => !v)} className="ml-auto inline-flex items-center gap-1 hover:text-ink">
          <Icon name="edit" size={14} /> {editing ? "Uždaryti" : "Redaguoti"}
        </button>
      </div>

      <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.02em] text-ink md:text-[34px]">{lead.name}</h1>
      {meta && <p className="mt-1 text-[14px] text-muted">{meta}</p>}

      {editing ? (
        <div className="mt-6">
          <EditForm lead={lead} onDone={() => setEditing(false)} />
        </div>
      ) : (
        <>
          {/* Phone */}
          <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:pl-5">
            <div className="min-w-0 flex-1 px-2 pt-1 sm:p-0">
              <div className="text-[11px] uppercase tracking-[0.08em] text-muted">Telefonas</div>
              <div className="tnum mt-0.5 whitespace-nowrap font-mono text-[24px] text-ink md:text-[26px]">{lead.phone || "—"}</div>
            </div>
            {lead.phone && (
              <a
                href={telHref(lead.phone)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-[15px] font-medium text-white transition-colors hover:bg-accent-ink"
              >
                <Icon name="phone" size={18} /> Skambinti
              </a>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px]">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink">
                <Icon name="mail" size={15} className="text-muted" /> {lead.email}
              </a>
            )}
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <Icon name="globe" size={15} className="text-muted" />
              {lead.website ? (
                <a href={href(lead.website)} target="_blank" rel="noreferrer" className="underline decoration-line-2 underline-offset-2 hover:text-ink">
                  {host(lead.website)}
                </a>
              ) : (
                "svetainės nėra"
              )}
            </span>
          </div>

          {/* Why */}
          {(lead.reason || lead.need) && (
            <div className="mt-6 rounded-2xl bg-ink px-5 py-4 text-paper">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-rail-text">
                Ką siūlyti <span className="rounded-full bg-rail-2 px-2 py-0.5 normal-case tracking-normal text-paper">{lead.need}</span>
              </div>
              {lead.reason && <p className="mt-2 text-[15px] leading-relaxed">{lead.reason}</p>}
            </div>
          )}

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            <Fact label="Įmonės kodas">
              <span className="tnum font-mono">{lead.companyCode || "—"}</span>
            </Fact>
            <Fact label="Pajamos">{lead.revenue || "nežinomos"}</Fact>
            <Fact label="Bandymų">
              <span className="tnum">{lead.attempts}</span>
            </Fact>
            <Fact label="Paskutinis skambutis">
              {lead.lastCalledAt ? `${when(lead.lastCalledAt)} · ${lead.lastCalledBy}` : "dar neskambinta"}
            </Fact>
            <Fact label="Pridėjo">
              {lead.createdBy || "—"} · {when(lead.createdAt)}
            </Fact>
            {lead.source && (
              <Fact label="Šaltinis">
                <a href={href(lead.source)} target="_blank" rel="noreferrer" className="underline decoration-line-2 underline-offset-2 hover:text-ink">
                  {host(lead.source)}
                </a>
              </Fact>
            )}
          </dl>
        </>
      )}

      {/* Outcome */}
      <section className="mt-8 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-medium text-ink">Kaip baigėsi skambutis?</h2>
          <span className="hidden text-[11.5px] text-muted md:inline">klavišai 1–4</span>
        </div>
        <textarea
          ref={noteRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Su kuo kalbėjai, ką sakė, kiek siūlei… (nebūtina)"
          className="mt-3 w-full resize-y rounded-xl border border-line bg-paper/60 p-3 text-[15px] leading-relaxed text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none md:text-[14px]"
        />

        {askWhen ? (
          <div className="rise mt-3">
            <div className="mb-2 text-[12.5px] text-ink-2">Kada perskambinti?</div>
            <div className="flex flex-wrap gap-2">
              {[
                ["Rytoj 10:00", at(1)],
                ["Po 3 d.", at(3)],
                ["Po savaitės", at(7)],
                ["Po 2 sav.", at(14)],
              ].map(([label, d]) => (
                <button
                  key={label as string}
                  type="button"
                  disabled={busy}
                  onClick={() => log("thinking", d as Date)}
                  className="h-10 rounded-full border border-line px-4 text-[13.5px] text-ink-2 hover:border-[var(--s-thinking)] hover:text-ink"
                >
                  {label as string}
                </button>
              ))}
              <span className="inline-flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="h-10 rounded-full border border-line bg-surface px-3 text-[13.5px]"
                />
                {custom && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => log("thinking", new Date(custom))}
                    className="h-10 rounded-full bg-ink px-4 text-[13.5px] text-paper"
                  >
                    Gerai
                  </button>
                )}
              </span>
              <button type="button" onClick={() => setAskWhen(false)} className="h-10 px-2 text-[13px] text-muted hover:text-ink">
                Atgal
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {OUTCOMES.map((o) => (
              <button
                key={o.status}
                type="button"
                disabled={busy}
                onClick={() => log(o.status)}
                className={`group flex h-14 items-center justify-between rounded-xl border border-line bg-paper/40 px-4 text-left text-[14.5px] font-medium text-ink transition-colors disabled:opacity-50 ${o.cls}`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: `var(--s-${o.status.replace("_", "-")})` }} />
                  {o.label}
                </span>
                <kbd className="hidden font-mono text-[11px] text-muted md:inline">{o.key}</kbd>
              </button>
            ))}
          </div>
        )}

        {onSkip && (
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={onSkip} className="inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-ink">
              Praleisti <Icon name="skip" size={14} />
            </button>
          </div>
        )}
      </section>
    </article>
  );
}
