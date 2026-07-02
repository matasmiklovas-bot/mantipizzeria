"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Pizza } from "@/types";
import { formatPrice } from "@/lib/utils";
import { SIMPLE_PIZZA_IMAGE } from "@/lib/data/pizzas";
import { PizzaThumb } from "@/components/menu/PizzaThumb";

export default function AdminMenuPage() {
  const [pizzas, setPizzas] = useState<Pizza[]>([]);
  const [editing, setEditing] = useState<Pizza | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    ingredients: "",
    price_small: "",
    price_large: "",
    image_url: "",
  });

  const fetchPizzas = async () => {
    setLoading(true);
    const res = await fetch("/api/pizzas?all=true");
    if (res.ok) setPizzas(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchPizzas();
  }, []);

  const resetForm = () => {
    setForm({ name: "", description: "", ingredients: "", price_small: "", price_large: "", image_url: "" });
    setEditing(null);
    setShowForm(false);
  };

  const showMsg = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      description: form.description,
      ingredients: form.ingredients.split(",").map((s) => s.trim()),
      price_small: parseFloat(form.price_small),
      price_large: parseFloat(form.price_large),
      image_url: form.image_url.trim() || editing?.image_url || SIMPLE_PIZZA_IMAGE,
      available: editing?.available ?? true,
    };

    const res = await fetch("/api/pizzas", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { id: editing.id, ...data } : data),
    });

    if (res.ok) {
      showMsg(editing ? "Pica atnaujinta" : "Pica pridėta");
      resetForm();
      fetchPizzas();
    } else {
      showMsg("Klaida išsaugant picą");
    }
  };

  const toggleAvailable = async (pizza: Pizza) => {
    const res = await fetch("/api/pizzas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: pizza.id, available: !pizza.available }),
    });
    if (res.ok) {
      showMsg(pizza.available ? "Pica paslėpta" : "Pica rodoma meniu");
      fetchPizzas();
    }
  };

  const deletePizza = async (id: string) => {
    if (!confirm("Ar tikrai norite ištrinti šią picą?")) return;
    const res = await fetch("/api/pizzas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      showMsg("Pica ištrinta");
      fetchPizzas();
    }
  };

  const startEdit = (pizza: Pizza) => {
    setEditing(pizza);
    setForm({
      name: pizza.name,
      description: pizza.description,
      ingredients: pizza.ingredients.join(", "),
      price_small: String(pizza.price_small),
      price_large: String(pizza.price_large),
      image_url: pizza.image_url,
    });
    setShowForm(true);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Meniu valdymas</h1>
          <p className="text-black/50 text-sm mt-1">{pizzas.length} picos · {pizzas.filter(p => p.available).length} rodomos</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4" />
          Nauja pica
        </Button>
      </div>

      {message && (
        <div className="bg-olive/10 border border-olive/30 text-olive rounded-xl px-4 py-3 mb-6 text-sm font-medium">
          {message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 card-shadow mb-8 space-y-4">
          <h2 className="font-display text-xl font-semibold">
            {editing ? "Redaguoti picą" : "Nauja pica"}
          </h2>
          <Input label="Pavadinimas" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Kaina Maža 30 cm (€)" type="number" step="0.01" value={form.price_small} onChange={(e) => setForm({ ...form, price_small: e.target.value })} required />
            <Input label="Kaina Didelė 50 cm (€)" type="number" step="0.01" value={form.price_large} onChange={(e) => setForm({ ...form, price_large: e.target.value })} required />
          </div>
          <Input label="Aprašymas" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <Input label="Ingredientai (atskirti kableliais)" value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} required />
          <Input label="Nuotraukos nuoroda (pvz. /pizzas/margherita.jpg)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder={SIMPLE_PIZZA_IMAGE} />
          <div className="flex gap-3">
            <Button type="submit">{editing ? "Išsaugoti" : "Pridėti"}</Button>
            <Button type="button" variant="ghost" onClick={resetForm}>Atšaukti</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {pizzas.map((pizza) => (
            <div
              key={pizza.id}
              className={`bg-white rounded-2xl p-4 card-shadow flex items-center gap-4 ${!pizza.available ? "opacity-50" : ""}`}
            >
              <PizzaThumb name={pizza.name} imageUrl={pizza.image_url} className="w-16 h-16" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">{pizza.name}</h3>
                <p className="text-black/50 text-sm">
                  Maža {formatPrice(pizza.price_small)} · Didelė {formatPrice(pizza.price_large)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleAvailable(pizza)} className="p-2 text-black/40 hover:text-olive transition-colors" title={pizza.available ? "Paslėpti" : "Rodyti"}>
                  {pizza.available ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                <button onClick={() => startEdit(pizza)} className="p-2 text-black/40 hover:text-olive transition-colors">
                  <Pencil className="w-5 h-5" />
                </button>
                <button onClick={() => deletePizza(pizza.id)} className="p-2 text-black/40 hover:text-red transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
