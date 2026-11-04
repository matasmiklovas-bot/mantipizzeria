"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { api, useLeads } from "@/components/LeadsProvider";
import { STATUSES, type StatusId, type Stats } from "@/lib/types";

function Tile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="text-[11px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="tnum mt-2 font-serif text-[40px] leading-none text-ink">{value}</div>
      {hint && <div className="mt-2 text-[12px] text-muted">{hint}</div>}
    </div>
  );
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");

function lastDays(n: number) {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    out.push(d.toLocaleDateString("sv-SE", { timeZone: "Europe/Vilnius" })); // YYYY-MM-DD
  }
  return out;
}

export default function StatsPage() {
  const { leads } = useLeads();
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const load = () =>
      api<Stats>("/api/stats", { cache: "no-store" })
        .then((s) => {
          setStats(s);
          setError("");
        })
        .catch((e) => setError((e as Error).message));
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s.id, 0])) as Record<StatusId, number>;
    for (const l of leads) c[l.status]++;
    return c;
  }, [leads]);

  const called = leads.length - counts.new;
  const reached = counts.declined + counts.thinking + counts.interested;
  const todayCalls = stats?.today.reduce((a, r) => a + r.calls, 0) ?? 0;

  const days = lastDays(14);
  const byDay = new Map(stats?.daily.map((d) => [d.day, d.calls]) ?? []);
  const series = days.map((d) => ({ day: d, calls: byDay.get(d) ?? 0 }));
  const max = Math.max(1, ...series.map((s) => s.calls));

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-[1100px] px-5 pb-16 pt-6 md:px-8 md:pt-8">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">Statistika</h1>
        {error && <p className="mt-2 text-[13px] text-accent">{error}</p>}

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Tile label="Skambučių šiandien" value={todayCalls} />
          <Tile label="Kontaktų" value={leads.length} hint={`${counts.new} dar neskambinta`} />
          <Tile label="Pasiekta" value={pct(reached, called)} hint={`${reached} iš ${called} atsiliepė`} />
          <Tile label="Nori" value={counts.interested} hint={`${pct(counts.interested, reached)} pasiektų`} />
        </div>

        {/* Pipeline by status */}
        <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-[13px] font-medium">Kontaktai pagal statusą</h2>
          <div className="mt-4 flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Kontaktų pasiskirstymas pagal statusą">
            {STATUSES.map((s) =>
              counts[s.id] ? (
                <div key={s.id} title={`${s.short}: ${counts[s.id]}`} style={{ flexGrow: counts[s.id], background: s.color }} />
              ) : null,
            )}
            {leads.length === 0 && <div className="flex-1 bg-line" />}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5">
            {STATUSES.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-[13px] text-ink-2">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {s.short}
                <span className="tnum ml-auto font-mono text-[12px] text-ink sm:ml-0">{counts[s.id]}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Calls per day */}
        <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[13px] font-medium">Skambučiai per 14 dienų</h2>
            <span className="tnum text-[12px] text-muted">
              {hover !== null ? `${series[hover].day.slice(5).replace("-", ".")}: ${series[hover].calls}` : `iš viso ${series.reduce((a, s) => a + s.calls, 0)}`}
            </span>
          </div>
          <div className="relative mt-4 h-40" onMouseLeave={() => setHover(null)}>
            <div className="absolute inset-x-0 bottom-0 border-t border-line" />
            <div className="absolute inset-x-0 top-0 flex items-baseline gap-2 text-[11px] text-muted">
              <span className="tnum">{max}</span>
              <span className="flex-1 border-t border-dashed border-line" />
            </div>
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {series.map((s, i) => (
                <button
                  key={s.day}
                  type="button"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => setHover(i)}
                  aria-label={`${s.day}: ${s.calls} skambučių`}
                  className="flex h-full flex-1 items-end"
                >
                  <span
                    className="block w-full rounded-t-[4px] transition-opacity"
                    style={{
                      height: s.calls ? `${(s.calls / max) * 100}%` : 0,
                      background: "var(--ink)",
                      opacity: hover === null || hover === i ? 1 : 0.35,
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-between text-[11px] text-muted">
            <span>{days[0].slice(5).replace("-", ".")}</span>
            <span>šiandien</span>
          </div>
        </section>

        {/* People */}
        <section className="mt-6 grid gap-6 md:grid-cols-2">
          {(
            [
              ["Šiandien", stats?.today],
              ["Per 7 dienas", stats?.week],
            ] as const
          ).map(([title, rows]) => (
            <div key={title} className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-[13px] font-medium">{title}</h2>
              {!rows?.length ? (
                <p className="mt-4 text-[13px] text-muted">{stats ? "Dar nėra skambučių." : "Kraunama…"}</p>
              ) : (
                <table className="mt-3 w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.08em] text-muted">
                      <th className="py-2 font-normal">Kas</th>
                      <th className="py-2 text-right font-normal">Skambučių</th>
                      <th className="py-2 text-right font-normal">Pasiekta</th>
                      <th className="py-2 text-right font-normal">Nori</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((r) => (
                      <tr key={r.author}>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-2">
                            <Avatar name={r.author} size={22} />
                            {r.author}
                          </span>
                        </td>
                        <td className="tnum py-2.5 text-right font-mono">{r.calls}</td>
                        <td className="tnum py-2.5 text-right font-mono">{r.reached}</td>
                        <td className="tnum py-2.5 text-right font-mono">{r.interested}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
