"use client";

import { useState } from "react";

export default function Login() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    setError((await res.json().catch(() => ({}))).error ?? "Nepavyko prisijungti");
    setBusy(false);
  }

  const inp =
    "h-11 w-full rounded-lg border border-line bg-surface px-3 text-[16px] text-ink placeholder:text-muted/70 focus:border-ink focus:outline-none";

  return (
    <div className="grid min-h-dvh place-items-center px-5">
      <form onSubmit={submit} className="rise w-full max-w-[360px]">
        <h1 className="font-serif text-[56px] leading-[0.9] tracking-[-0.02em]">
          Žvalgas<span className="text-accent">.</span>
        </h1>
        <p className="mt-2 text-[13px] text-muted">Skambučių darbo vieta komandai.</p>
        <div className="mt-10 flex flex-col gap-3">
          <input className={inp} placeholder="Tavo vardas" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input
            className={inp}
            type="password"
            placeholder="Komandos slaptažodis"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-[13px] text-accent">{error}</p>}
          <button disabled={busy} className="mt-2 h-11 rounded-lg bg-ink text-[14px] font-medium text-paper transition-opacity disabled:opacity-60">
            {busy ? "Jungiamasi…" : "Prisijungti"}
          </button>
        </div>
      </form>
    </div>
  );
}
