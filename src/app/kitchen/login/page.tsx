"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function KitchenLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/kitchen/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.href = "/kitchen";
      return;
    }

    setError("Neteisingas slaptažodis");
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/brand/logo.png"
            alt="Mantì Pizzeria"
            className="h-14 w-auto object-contain mx-auto mb-6"
          />
          <h1 className="font-display text-3xl font-bold text-white">Virtuvė & Kasa</h1>
          <p className="text-white/50 mt-2">Darbuotojų prisijungimas</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/5 border border-white/10 rounded-2xl p-8 space-y-6"
        >
          <Input
            label="Slaptažodis"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Įveskite slaptažodį"
            required
          />
          {error && <p className="text-red text-sm">{error}</p>}
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Prisijungti
          </Button>
        </form>
      </div>
    </div>
  );
}
