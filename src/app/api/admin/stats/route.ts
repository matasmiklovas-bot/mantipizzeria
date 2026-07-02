import { NextResponse } from "next/server";
import { getDailyStats } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const stats = await getDailyStats();
    return NextResponse.json(stats);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
