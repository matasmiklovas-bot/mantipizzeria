import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import {
  getSupabaseAnonKey,
  getSupabaseServiceKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

export async function GET() {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const hasUrl = Boolean(getSupabaseUrl());
    const hasAnon = Boolean(getSupabaseAnonKey());
    const hasService = Boolean(getSupabaseServiceKey());
    let hint = "Trūksta Supabase env kintamųjų Vercel.";
    if (hasUrl && (!hasAnon || !hasService)) {
      hint =
        "Trūksta anon/publishable arba service/secret rakto. Nukopijuokite iš Supabase Dashboard → Settings → API.";
    }

    return NextResponse.json({ ok: false, configured: false, hint });
  }

  try {
    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();
    const { count, error } = await supabase
      .from("pizzas")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({
        ok: false,
        configured: true,
        hint: `Supabase klaida: ${error.message}`,
      });
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      pizzaCount: count ?? 0,
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      configured: true,
      hint: e instanceof Error ? e.message : "Nepavyko prisijungti",
    });
  }
}
