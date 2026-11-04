"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { api, useLeads } from "@/components/LeadsProvider";
import { StatusPill } from "@/components/Status";
import { when } from "@/lib/format";
import type { Activity, Lead } from "@/lib/types";

function line(a: Activity) {
  switch (a.kind) {
    case "created":
      return <span className="text-muted">pridėjo kontaktą</span>;
    case "status":
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5 text-muted">
          pakeitė statusą į {a.status && <StatusPill id={a.status} />}
        </span>
      );
    case "call":
      return (
        <span className="inline-flex flex-wrap items-center gap-1.5 text-muted">
          paskambino {a.status && <StatusPill id={a.status} />}
        </span>
      );
    default:
      return null;
  }
}

export function Thread({ lead, version }: { lead: Lead; version: number }) {
  const { upsert } = useLeads();
  const [items, setItems] = useState<Activity[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await api<{ activities: Activity[] }>(`/api/leads/${lead.id}/activity`, { cache: "no-store" });
      setItems(data.activities);
    } catch {
      setItems((prev) => prev ?? []);
    }
  }, [lead.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(null);
  }, [lead.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 15_000);
    return () => clearInterval(t);
  }, [load, version, lead.updatedAt]);

  useEffect(() => {
    // Scroll only the history list itself, never the page around it.
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items?.length]);

  async function send() {
    const note = draft.trim();
    if (!note || sending) return;
    setSending(true);
    try {
      const res = await api<{ lead: Lead; activity: Activity }>(`/api/leads/${lead.id}`, {
        method: "PATCH",
        json: { action: "note", note },
      });
      upsert(res.lead);
      setItems((prev) => [...(prev ?? []), res.activity]);
      setDraft("");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-col">
      <header className="flex items-baseline justify-between px-5 pb-3 pt-5">
        <h2 className="text-[13px] font-medium text-ink">Istorija</h2>
        <span className="tnum text-[12px] text-muted">{items ? items.length : ""}</span>
      </header>

      <div ref={listRef} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-5">
        {items === null && <div className="py-6 text-[13px] text-muted">Kraunama…</div>}
        {items?.length === 0 && <div className="py-6 text-[13px] text-muted">Dar nieko neįvyko.</div>}
        <ol className="flex flex-col gap-4 pb-4">
          {items?.map((a) => (
            <li key={a.id} className="rise flex gap-3">
              <Avatar name={a.author} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-ink">{a.author}</span>
                  <time className="text-[11.5px] text-muted" dateTime={a.createdAt}>
                    {when(a.createdAt)}
                  </time>
                </div>
                {a.kind !== "note" && <div className="mt-1 text-[13px]">{line(a)}</div>}
                {a.note && (
                  <p className="mt-1.5 whitespace-pre-wrap rounded-xl rounded-tl-sm bg-surface px-3 py-2 text-[13.5px] leading-relaxed text-ink-2 ring-1 ring-line">
                    {a.note}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <form
        className="border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border border-line bg-surface p-1.5 focus-within:border-ink">
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Rašyti pastabą komandai…"
            className="max-h-32 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-2 text-[14px] text-ink placeholder:text-muted/70 focus:outline-none focus-visible:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Siųsti"
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-ink text-paper transition-opacity disabled:opacity-30"
          >
            <Icon name="send" size={16} />
          </button>
        </div>
      </form>
    </section>
  );
}
