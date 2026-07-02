"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.href = "/admin";
      return;
    } else {
      setError("Neteisingas slaptažodis");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-red flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-display text-2xl font-bold">M</span>
          </div>
          <h1 className="font-display text-3xl font-bold">Administratorius</h1>
          <p className="text-black/50 mt-2">Manti Pizzeria valdymo panelė</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 card-shadow space-y-6">
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
