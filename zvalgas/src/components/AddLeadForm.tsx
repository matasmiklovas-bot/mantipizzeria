"use client";

import { useState } from "react";
import { NEEDS, type FoundLead, type Need } from "@/lib/types";

const empty: FoundLead = {
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

const cls =
  "h-9 w-full rounded-lg border border-line bg-surface px-3 text-[13.5px] text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none";

export function AddLeadForm({ onAdd, onClose }: { onAdd: (l: FoundLead) => boolean; onClose: () => void }) {
  const [f, setF] = useState<FoundLead>(empty);
  const [dup, setDup] = useState(false);
  const set = (k: keyof FoundLead) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form
      className="rise mb-6 grid gap-2.5 rounded-xl border border-line bg-surface/60 p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!f.name.trim()) return;
        if (onAdd({ ...f, name: f.name.trim() })) {
          setF(empty);
          onClose();
        } else setDup(true);
      }}
    >
      <input autoFocus required className={cls} placeholder="Pavadinimas *" value={f.name} onChange={set("name")} />
      <input className={cls} placeholder="Sritis" value={f.category} onChange={set("category")} />
      <input className={`${cls} font-mono`} placeholder="Telefonas" value={f.phone} onChange={set("phone")} />
      <input className={cls} placeholder="El. paštas" type="email" value={f.email} onChange={set("email")} />
      <input className={cls} placeholder="Miestas" value={f.city} onChange={set("city")} />
      <input className={cls} placeholder="Svetainė (jei yra)" value={f.website} onChange={set("website")} />
      <select className={cls} value={f.need} onChange={(e) => setF((p) => ({ ...p, need: e.target.value as Need }))}>
        {NEEDS.map((n) => (
          <option key={n}>{n}</option>
        ))}
      </select>
      <input className={cls} placeholder="Pajamos" value={f.revenue} onChange={set("revenue")} />
      <div className="flex items-center justify-end gap-3 sm:col-span-2">
        {dup && <span className="mr-auto text-[12px] text-accent">Toks kontaktas jau yra sąraše.</span>}
        <button type="button" onClick={onClose} className="text-[13px] text-muted hover:text-ink">
          Atšaukti
        </button>
        <button type="submit" className="h-9 rounded-lg bg-ink px-4 text-[13px] font-medium text-paper hover:bg-ink-2">
          Pridėti
        </button>
      </div>
    </form>
  );
}
