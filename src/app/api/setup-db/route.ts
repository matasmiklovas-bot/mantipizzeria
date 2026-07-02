import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getPizzas, isSupabaseConfigured } from "@/lib/db";

export async function POST() {
  try {
    await requireAdmin();

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          hint: "Trūksta Supabase env kintamųjų Vercel (URL, anon/publishable, service/secret).",
        },
        { status: 503 }
      );
    }

    const pizzas = await getPizzas();
    return NextResponse.json({
      ok: true,
      pizzaCount: pizzas.length,
      sampleIds: pizzas.slice(0, 3).map((p) => p.id),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      {
        ok: false,
        hint: e instanceof Error ? e.message : "Nepavyko paruošti duomenų bazės",
      },
      { status: 500 }
    );
  }
}
