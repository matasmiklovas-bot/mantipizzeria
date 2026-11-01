"use client";

import { useEffect, useRef, useState } from "react";
import {
  NEEDS,
  REVENUE_BRACKETS,
  type FoundLead,
  type Need,
  type RevenueId,
  type SearchEvent,
  type SearchRequest,
} from "@/lib/types";

const PW_KEY = "zvalgas.pw";
const COUNTS = [5, 10, 15] as const;

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
      className="h-8 rounded-full border px-3 text-[13px] transition-colors aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper border-line text-ink-2 hover:border-line-2"
    >
      {children}
    </button>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-line bg-surface px-3 text-[14px] text-ink placeholder:text-muted/70 transition-colors hover:border-line-2 focus:border-ink focus:outline-none";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function SearchPanel({
  exclude,
  onLeads,
}: {
  exclude: string[];
  onLeads: (leads: FoundLead[]) => number;
}) {
  const [industry, setIndustry] = useState("");
  const [city, setCity] = useState("Vilnius");
  const [revenue, setRevenue] = useState<RevenueId[]>([]);
  const [needs, setNeeds] = useState<Need[]>([]);
  const [count, setCount] = useState<number>(10);

  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [needPw, setNeedPw] = useState(false);
  const [pw, setPw] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPw(localStorage.getItem(PW_KEY) ?? "");
  }, []);

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
    setLog([{ kind: "info", text: "Pradedama paieška" }]);

    const body: SearchRequest = { industry, city, revenue, needs, count, exclude };

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-app-password": pw },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (res.status === 401) {
        setNeedPw(true);
        push({ kind: "error", text: "Reikia slaptažodžio" });
        return;
      }
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        push({ kind: "error", text: err.error ?? `Klaida ${res.status}` });
        return;
      }
      setNeedPw(false);

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
          else if (e.type === "fetch") push({ kind: "fetch", text: hostOf(e.url) });
          else if (e.type === "error") push({ kind: "error", text: e.message });
          else if (e.type === "leads") {
            const added = onLeads(e.leads);
            const skipped = e.leads.length - added;
            push({
              kind: "info",
              text:
                e.leads.length === 0
                  ? "Nieko tinkamo nerasta. Praplėsk kriterijus."
                  : `Rasta ${e.leads.length}, pridėta ${added}${skipped ? `, ${skipped} jau buvo sąraše` : ""}`,
            });
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") push({ kind: "info", text: "Sustabdyta" });
      else push({ kind: "error", text: "Ryšio klaida" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Label>Sritis</Label>
        <input
          className={inputCls}
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          placeholder="kirpyklos, autoservisai, kavinės…"
        />
      </div>

      <div>
        <Label>Miestas</Label>
        <input
          className={inputCls}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Visa Lietuva"
        />
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
        <p className="mt-2 text-[12px] leading-snug text-muted">
          {revenue.length ? "Įmonės be viešų pajamų duomenų bus praleistos." : "Nepasirinkus – bet kokios."}
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
              className="tnum h-7 w-12 rounded-full text-[13px] text-ink-2 transition-colors aria-pressed:bg-ink aria-pressed:text-paper"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {needPw && (
        <div className="rise">
          <Label>Slaptažodis</Label>
          <input
            type="password"
            className={inputCls}
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              localStorage.setItem(PW_KEY, e.target.value);
            }}
            placeholder="APP_PASSWORD"
          />
        </div>
      )}

      <button
        type="button"
        onClick={run}
        className={`group flex h-11 items-center justify-between rounded-lg px-4 text-[14px] font-medium transition-colors ${
          running ? "border border-line-2 bg-surface text-ink" : "bg-accent text-white hover:bg-[#c23d16]"
        }`}
      >
        <span>{running ? "Sustabdyti" : "Ieškoti įmonių"}</span>
        <span className="tnum font-mono text-[12px] opacity-80">
          {running ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}` : "→"}
        </span>
      </button>

      {log.length > 0 && (
        <div
          ref={logRef}
          className="max-h-56 overflow-y-auto border-t border-line pt-4 font-mono text-[11.5px] leading-[1.7]"
        >
          {log.map((l, i) => (
            <div key={i} className="rise flex gap-2">
              <span className={l.kind === "error" ? "text-accent" : "text-muted"}>
                {l.kind === "search" ? "?" : l.kind === "fetch" ? "↓" : l.kind === "error" ? "!" : "·"}
              </span>
              <span className={`min-w-0 break-words ${l.kind === "error" ? "text-accent" : "text-ink-2"}`}>
                {l.text}
              </span>
            </div>
          ))}
          {running && (
            <div className="flex gap-2 text-muted">
              <span className="blink">▍</span>
            </div>
          )}
        </div>
      )}

      {!running && log.length === 0 && (
        <p className="text-[12px] leading-relaxed text-muted">
          Paieška užtrunka 1–4 min. AI tikrina rekvizitai.lt, žemėlapius ir pačių įmonių svetaines. Kontaktus
          patikrink prieš skambindamas – AI kartais klysta.
        </p>
      )}
    </section>
  );
}
