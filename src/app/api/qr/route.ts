import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth";
import { getRequestAppUrl } from "@/lib/utils";

function buildUrl(request: Request, target: string, table: string | null) {
  const baseUrl = getRequestAppUrl(request);
  switch (target) {
    case "kitchen":
      return `${baseUrl}/kitchen`;
    case "menu":
      return `${baseUrl}/menu`;
    default:
      return `${baseUrl}/t/${table}`;
  }
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const target = searchParams.get("target") ?? "table";
  const table = searchParams.get("table");
  const format = searchParams.get("format") ?? "png";

  if (target === "table" && !table) {
    return NextResponse.json({ error: "Table number required" }, { status: 400 });
  }

  const url = buildUrl(request, target, table);

  if (format === "svg") {
    const svg = await QRCode.toString(url, { type: "svg", width: 400, margin: 2 });
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml" },
    });
  }

  const png = await QRCode.toBuffer(url, {
    width: 400,
    margin: 2,
    color: { dark: "#111111", light: "#FFF8F0" },
  });

  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
}
