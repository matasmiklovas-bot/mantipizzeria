import { NextResponse } from "next/server";
import { createOrder, getOrders, getOrder } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import { validateAndBuildOrder } from "@/lib/orders/validate";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (id) {
      const order = await getOrder(id);
      if (!order) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      return NextResponse.json(order);
    }

    await requireStaff();
    const orders = await getOrders();
    return NextResponse.json(orders);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderInput = await validateAndBuildOrder(body);
    const order = await createOrder(orderInput);
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("INVALID")) {
      return NextResponse.json({ error: "Invalid order" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "SUPABASE_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error:
            "Duomenų bazė nesukonfigūruota. Vercel reikia legacy Supabase raktų (eyJ...).",
        },
        { status: 503 }
      );
    }
    console.error("Create order error:", e);
    const message =
      e instanceof Error && e.message.startsWith("SUPABASE_")
        ? "Nepavyko išsaugoti užsakymo. Patikrinkite Supabase nustatymus."
        : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
