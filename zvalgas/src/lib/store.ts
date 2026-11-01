"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FoundLead, Lead, StatusId } from "./types";

const KEY = "zvalgas.leads.v1";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(uab|mb|iį|ii|ab|vši|vsi)\b/g, "")
    .replace(/[^a-z0-9]/g, "");

const phoneKey = (s: string) => s.replace(/\D/g, "").slice(-8);

function isDuplicate(a: FoundLead, b: FoundLead) {
  if (a.companyCode && b.companyCode && a.companyCode === b.companyCode) return true;
  if (a.phone && b.phone && phoneKey(a.phone) === phoneKey(b.phone)) return true;
  return norm(a.name) !== "" && norm(a.name) === norm(b.name);
}

function load(): Lead[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [ready, setReady] = useState(false);
  const leadsRef = useRef<Lead[]>([]);

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  useEffect(() => {
    // Hydrate from localStorage after mount to avoid SSR mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLeads(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(leads));
  }, [leads, ready]);

  // Keep several open tabs in sync instead of letting them overwrite each other.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setLeads(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** Adds new leads, skipping duplicates. Returns how many were actually added. */
  const addMany = useCallback((found: FoundLead[], fresh = true): number => {
    const next = [...leadsRef.current];
    let added = 0;
    for (const f of found) {
      if (next.some((l) => isDuplicate(l, f))) continue;
      const now = Date.now();
      next.unshift({ ...f, id: uid(), status: "new", note: "", createdAt: now, updatedAt: now, fresh });
      added++;
    }
    leadsRef.current = next;
    setLeads(next);
    return added;
  }, []);

  const update = useCallback((id: string, patch: Partial<Pick<Lead, "status" | "note">>) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch, fresh: false, updatedAt: Date.now() } : l)),
    );
  }, []);

  const remove = useCallback((id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const replaceAll = useCallback((next: Lead[]) => setLeads(next), []);

  return { leads, ready, addMany, update, remove, replaceAll };
}

export type SetStatus = (id: string, status: StatusId) => void;
