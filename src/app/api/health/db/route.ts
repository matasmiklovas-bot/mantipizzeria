import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";

export async function GET() {
  const configured = isSupabaseConfigured();

  if (!configured) {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    let hint = "Trūksta Supabase env kintamųjų Vercel.";
    if (anon.startsWith("sb_") || service.startsWith("sb_")) {
      hint =
        "Naudojate sb_ raktus — serveriui reikia Legacy anon + service_role (eyJ...).";
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
