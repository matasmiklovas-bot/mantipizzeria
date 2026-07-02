import { NextResponse } from "next/server";
import { getSiteSettings, updateSiteSettings } from "@/lib/settings";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(settings, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const updates: { orderingEnabled?: boolean; busyMode?: boolean } = {};
    if (typeof body.orderingEnabled === "boolean")
      updates.orderingEnabled = body.orderingEnabled;
    if (typeof body.busyMode === "boolean") updates.busyMode = body.busyMode;
    const settings = await updateSiteSettings(updates);
    return NextResponse.json(settings);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
