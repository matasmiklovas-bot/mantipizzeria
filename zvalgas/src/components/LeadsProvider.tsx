"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Lead } from "@/lib/types";

interface LeadsState {
  me: string;
  leads: Lead[];
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Puts a lead returned by the server into local state (insert or replace). */
  upsert: (lead: Lead) => void;
  upsertMany: (leads: Lead[]) => void;
  drop: (id: string) => void;
}

const Ctx = createContext<LeadsState | null>(null);

export function useLeads() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLeads outside LeadsProvider");
  return v;
}

/** Shared fetch helper: JSON in/out, readable errors, redirect to login on 401. */
export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Reikia prisijungti");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Klaida ${res.status}`);
  return data as T;
}

const POLL_MS = 20_000;

export function LeadsProvider({ me, children }: { me: string; children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const data = await api<{ leads: Lead[] }>("/api/leads", { cache: "no-store" });
      setLeads(data.leads);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inflight.current = false;
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refresh]);

  const upsertMany = useCallback((incoming: Lead[]) => {
    setLeads((prev) => {
      const map = new Map(prev.map((l) => [l.id, l]));
      const added: Lead[] = [];
      for (const l of incoming) {
        if (!map.has(l.id)) added.push(l);
        map.set(l.id, l);
      }
      return [...added, ...prev.map((l) => map.get(l.id)!)];
    });
  }, []);
  const upsert = useCallback((lead: Lead) => upsertMany([lead]), [upsertMany]);
  const drop = useCallback((id: string) => setLeads((prev) => prev.filter((l) => l.id !== id)), []);

  return (
    <Ctx.Provider value={{ me, leads, loaded, error, refresh, upsert, upsertMany, drop }}>{children}</Ctx.Provider>
  );
}
