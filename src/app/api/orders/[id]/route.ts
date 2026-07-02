import { NextResponse } from "next/server";
import {
  deleteOrder,
  getOrder,
  updateOrderStatus,
  updateOrderPaymentStatus,
} from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import type { OrderStatus, PaymentStatus } from "@/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.payment_status === "paid") {
      const existing = await getOrder(id);
      if (!existing) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }
      const stripeMethods = ["credit_card", "apple_pay", "google_pay"] as const;
      if (
        existing.payment_status === "pending" &&
        stripeMethods.includes(
          existing.payment_method as (typeof stripeMethods)[number]
        )
      ) {
        await updateOrderPaymentStatus(id, "paid");
        const order = await getOrder(id);
        return NextResponse.json(order);
      }
    }

    await requireStaff();

    if (body.payment_status) {
      await updateOrderPaymentStatus(id, body.payment_status as PaymentStatus);
      const order = await getOrder(id);
      return NextResponse.json(order);
    }

    const order = await updateOrderStatus(id, body.status as OrderStatus);
    return NextResponse.json(order);
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireStaff();
    const { id } = await params;
    await deleteOrder(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
  }
}
