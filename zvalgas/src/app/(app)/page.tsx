"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LeadFocus } from "@/components/call/LeadFocus";
import { Thread } from "@/components/call/Thread";
import { Icon } from "@/components/Icon";
import { useLeads } from "@/components/LeadsProvider";
import { buildQueues, place, toneColor, type Placed, type QueueTab } from "@/lib/queue";

const TABS: { id: QueueTab; label: string }[] = [
  { id: "queue", label: "Eilė" },
  { id: "waiting", label: "Laukia" },
  { id: "won", label: "Nori" },
];

function QueueList({
  tab,
  setTab,
  queues,
  selectedId,
  onPick,
}: {
  tab: QueueTab;
  setTab: (t: QueueTab) => void;
  queues: Record<QueueTab, Placed[]>;
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  const list = queues[tab];
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-3 pt-5">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Skambinti</h1>
        <div className="mt-3 grid grid-cols-3 rounded-lg bg-paper p-0.5 ring-1 ring-line">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              className="flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] text-muted aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_rgba(22,21,19,0.08)]"
            >
              {t.label}
              <span className="tnum font-mono text-[11px] opacity-70">{queues[t.id].length}</span>
            </button>
          ))}
        </div>
      </div>
      <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {list.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-muted">Tuščia.</li>}
        {list.map((p) => (
          <li key={p.lead.id}>
            <button
              type="button"
              onClick={() => onPick(p.lead.id)}
              aria-current={p.lead.id === selectedId}
              className="flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-paper aria-[current=true]:bg-paper aria-[current=true]:ring-1 aria-[current=true]:ring-line"
            >
              <span className="flex items-center gap-2">
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: toneColor[p.tone] }} />
                <span className="truncate text-[14px] font-medium text-ink">{p.lead.name}</span>
              </span>
              <span className="truncate pl-3.5 text-[12px] text-muted">
                {[p.lead.city, p.lead.category].filter(Boolean).join(" · ") || "—"}
              </span>
              <span className="truncate pl-3.5 text-[11.5px]" style={{ color: toneColor[p.tone] }}>
                {p.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** True when the history panel has room to sit beside the lead (xl). */
function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

export default function CallPage() {
  const wide = useWide();
  const { leads, loaded } = useLeads();
  const [tab, setTab] = useState<QueueTab>("queue");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const [showList, setShowList] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("lead");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (id) setSelectedId(id);
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const queues = useMemo(() => buildQueues(leads, now), [leads, now]);

  const current: Placed | null = useMemo(() => {
    if (selectedId) {
      const lead = leads.find((l) => l.id === selectedId);
      if (lead) return place(lead, now) ?? { lead, tab: "waiting", rank: 0, sortKey: 0, label: "Nenori", tone: "muted" };
    }
    return queues.queue.find((p) => !skipped.has(p.lead.id)) ?? null;
  }, [selectedId, leads, now, queues, skipped]);

  const position = current ? queues.queue.findIndex((p) => p.lead.id === current.lead.id) : -1;

  function pick(id: string) {
    setSelectedId(id);
    setShowList(false);
    window.history.replaceState(null, "", `/?lead=${id}`);
  }

  function afterLogged() {
    // The logged lead leaves the queue by its new status, so the next one opens by itself.
    setVersion((v) => v + 1);
    setSelectedId(null);
    window.history.replaceState(null, "", "/");
  }

  function skip() {
    if (!current) return;
    setSkipped((s) => new Set(s).add(current.lead.id));
    setSelectedId(null);
    window.history.replaceState(null, "", "/");
  }

  const list = (
    <QueueList tab={tab} setTab={setTab} queues={queues} selectedId={current?.lead.id ?? null} onPick={pick} />
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-[300px] shrink-0 border-r border-line bg-surface lg:block">{list}</aside>

      {showList && (
        <div className="rise absolute inset-0 z-30 bg-surface lg:hidden">
          <button
            type="button"
            onClick={() => setShowList(false)}
            aria-label="Uždaryti"
            className="absolute right-3 top-4 z-10 rounded-lg p-2 text-muted hover:text-ink"
          >
            <Icon name="x" />
          </button>
          {list}
        </div>
      )}

      <div className="scroll-thin min-w-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-paper/90 px-5 py-2.5 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setShowList(true)} className="inline-flex items-center gap-2 text-[13px] text-ink-2">
            <Icon name="list" size={16} /> Eilė
            <span className="tnum rounded-full bg-ink px-1.5 font-mono text-[11px] text-paper">{queues.queue.length}</span>
          </button>
        </div>

        {!loaded && <div className="p-10 text-[13px] text-muted">Kraunama…</div>}

        {loaded && !current && (
          <div className="grid min-h-[70%] place-items-center px-6 py-16 text-center">
            <div>
              <p className="font-serif text-[34px] italic text-ink-2">Eilė tuščia.</p>
              <p className="mx-auto mt-2 max-w-sm text-[14px] text-muted">
                {leads.length === 0
                  ? "Dar nėra nė vieno kontakto. Surask įmonių su AI arba importuok sąrašą."
                  : "Visiems paskambinta. Tie, kurie neatsiliepė ar galvoja, grįš į eilę patys."}
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link href="/paieska" className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-[14px] font-medium text-white">
                  <Icon name="spark" size={16} /> Ieškoti įmonių
                </Link>
                {leads.length === 0 && (
                  <Link href="/kontaktai" className="inline-flex h-10 items-center rounded-lg border border-line-2 px-4 text-[14px]">
                    Importuoti
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {current && (
          <>
            <LeadFocus
              placed={current}
              position={position >= 0 ? position + 1 : null}
              total={queues.queue.length}
              onLogged={afterLogged}
              onSkip={current.tab === "queue" ? skip : null}
            />
            {!wide && (
              <div className="h-[520px] border-t border-line bg-surface">
                <Thread lead={current.lead} version={version} />
              </div>
            )}
          </>
        )}
      </div>

      {current && wide && (
        <aside className="flex w-[360px] shrink-0 flex-col border-l border-line bg-surface">
          <Thread lead={current.lead} version={version} />
        </aside>
      )}
    </div>
  );
}
