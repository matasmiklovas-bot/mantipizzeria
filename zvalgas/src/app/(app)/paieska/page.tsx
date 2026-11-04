"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { useLeads } from "@/components/LeadsProvider";
import { host } from "@/lib/format";
import { NEEDS, REVENUE_BRACKETS, type Lead, type Need, type RevenueId, type SearchEvent, type SearchRequest } from "@/lib/types";

const COUNTS = [5, 10, 15, 20] as const;
type LogLine = { kind: "search" | "fetch" | "info" | "error"; text: string };

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{children}</div>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="h-9 rounded-full border border-line px-3.5 text-[13.5px] text-ink-2 transition-colors hover:border-line-2 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
    >
      {children}
    </button>
  );
}

const inputCls =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-[16px] text-ink placeholder:text-muted/70 hover:border-line-2 focus:border-ink focus:outline-none md:text-[14.5px]";

export default function SearchPage() {
  const { upsertMany } = useLeads();
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("");
  const [revenue, setRevenue] = useState<RevenueId[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [count, setCount] = useState(10);

  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [added, setAdded] = useState<Lead[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const push = (l: LogLine) => setLog((prev) => [...prev, l]);

  async function run() {
    if (running) {
      abortRef.current?.abort();
      return;
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRunning(true);
    setElapsed(0);
    setAdded([]);
    setLog([{ kind: "info", text: "Pradedama paieška" }]);
    const body: SearchRequest = { industry, city, revenue, needs, count };

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        push({ kind: "error", text: err.error ?? `Klaida ${res.status}` });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const e = JSON.parse(line) as SearchEvent;
          if (e.type === "search") push({ kind: "search", text: e.query });
          else if (e.type === "fetch") push({ kind: "fetch", text: host(e.url) });
          else if (e.type === "error") push({ kind: "error", text: e.message });
          else if (e.type === "result") {
            upsertMany(e.added);
            setAdded(e.added);
            const skipped = e.found - e.added.length;
            push({
              kind: "info",
              text:
                e.found === 0
                  ? "Nieko tinkamo nerasta. Praplėsk kriterijus."
                  : `Rasta ${e.found}, į sąrašą pridėta ${e.added.length}${skipped ? `, ${skipped} jau buvo` : ""}.`,
            });
          }
        }
      }
    } catch (err) {
      push((err as Error).name === "AbortError" ? { kind: "info", text: "Sustabdyta" } : { kind: "error", text: "Ryšio klaida" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 pb-16 pt-6 md:px-8 md:pt-8 lg:grid-cols-[400px_minmax(0,1fr)]">
        <section>
          <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Paieška</h1>
          <p className="mt-1 text-[13px] text-muted">AI ieško internete įmonių, kurioms reikia svetainės ar sistemos, ir įrašo jas į bendrą sąrašą.</p>

          <div className="mt-7 flex flex-col gap-6">
            <div>
              <Label>Sritis</Label>
              <input className={inputCls} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="kirpyklos, autoservisai, statybos…" />
            </div>
            <div>
              <Label>Miestas</Label>
              <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Visa Lietuva" />
            </div>
            <div>
              <Label>Metinės pajamos</Label>
              <div className="flex flex-wrap gap-1.5">
                {REVENUE_BRACKETS.map((r) => (
                  <Chip key={r.id} active={revenue.includes(r.id)} onClick={() => setRevenue((v) => toggle(v, r.id))}>
                    {r.label}
                  </Chip>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-muted">
                {revenue.length ? "Įmonės be viešų pajamų duomenų bus praleistos, todėl rezultatų bus mažiau." : "Nepasirinkus – bet kokios."}
              </p>
            </div>
            <div>
              <Label>Ko trūksta</Label>
              <div className="flex flex-wrap gap-1.5">
                {NEEDS.map((n) => (
                  <Chip key={n} active={needs.includes(n)} onClick={() => setNeeds((v) => toggle(v, n))}>
                    {n}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <Label>Kiekis</Label>
              <div className="inline-flex rounded-full border border-line p-0.5">
                {COUNTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={count === c}
                    onClick={() => setCount(c)}
                    className="tnum h-8 w-12 rounded-full text-[13px] text-ink-2 aria-pressed:bg-ink aria-pressed:text-paper"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={run}
              className={`flex h-12 items-center justify-between rounded-xl px-5 text-[15px] font-medium transition-colors ${
                running ? "border border-line-2 bg-surface text-ink" : "bg-accent text-white hover:bg-accent-ink"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Icon name={running ? "x" : "spark"} size={17} />
                {running ? "Sustabdyti" : "Ieškoti įmonių"}
              </span>
              <span className="tnum font-mono text-[12px] opacity-80">
                {running ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}` : ""}
              </span>
            </button>
            <p className="text-[12px] leading-relaxed text-muted">
              Viena paieška trunka 1–4 min. ir naudoja Anthropic API kreditus. AI kartais klysta: prieš skambindamas pažiūrėk šaltinį.
            </p>
          </div>
        </section>

        <section className="min-w-0">
          <div className="rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-[13px] font-medium">Eiga</h2>
              {running && <span className="blink text-[12px] text-muted">dirba…</span>}
            </div>
            <div ref={logRef} className="scroll-thin max-h-72 min-h-32 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-[1.75]">
              {log.length === 0 && <div className="text-muted">Čia matysi, ką AI tikrina.</div>}
              {log.map((l, i) => (
                <div key={i} className="rise flex gap-2">
                  <span className={l.kind === "error" ? "text-accent" : "text-muted"}>
                    {l.kind === "search" ? "?" : l.kind === "fetch" ? "↓" : l.kind === "error" ? "!" : "·"}
                  </span>
                  <span className={`min-w-0 break-words ${l.kind === "error" ? "text-accent" : "text-ink-2"}`}>{l.text}</span>
                </div>
              ))}
            </div>
          </div>

          {added.length > 0 && (
            <div className="mt-6">
              <div className="flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold">Nauji kontaktai</h2>
                <Link href="/" className="inline-flex items-center gap-1 text-[13px] text-accent">
                  Pradėti skambinti <Icon name="arrow" size={14} />
                </Link>
              </div>
              <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
                {added.map((l) => (
                  <li key={l.id}>
                    <Link href={`/?lead=${l.id}`} className="block px-4 py-3 hover:bg-paper/60">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-[14px] font-medium">{l.name}</span>
                        <span className="tnum shrink-0 font-mono text-[12.5px] text-ink-2">{l.phone}</span>
                      </div>
                      <div className="mt-0.5 truncate text-[12.5px] text-muted">{l.reason || [l.category, l.city].join(" · ")}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
