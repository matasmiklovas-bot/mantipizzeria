import { NextResponse } from "next/server";
import { getKitchenOrders } from "@/lib/db";
import { requireKitchen } from "@/lib/auth";

export async function GET() {
  try {
    await requireKitchen();
    const orders = await getKitchenOrders();
    return NextResponse.json(orders, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch kitchen orders" },
      { status: 500 }
    );
  }
}
