"use client";

import { useState, useMemo } from "react";
import {
  Download,
  Printer,
  ChefHat,
  UtensilsCrossed,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QrPosterCard } from "@/components/admin/QrPosterCard";
import {
  downloadPosterPng,
  posterPrintHtml,
  addPosterToPdf,
} from "@/lib/qr-poster";
import jsPDF from "jspdf";

function qrSrc(table: number) {
  return `/api/qr?target=table&table=${table}&format=png`;
}

function qrKitchenSrc() {
  return `/api/qr?target=kitchen&format=png`;
}

export default function AdminQRPage() {
  const [tableFrom, setTableFrom] = useState(1);
  const [tableTo, setTableTo] = useState(10);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const tables = useMemo(() => {
    const from = Math.min(tableFrom, tableTo);
    const to = Math.max(tableFrom, tableTo);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  }, [tableFrom, tableTo]);

  const downloadTablePoster = (table: number) => {
    downloadPosterPng(
      qrSrc(table),
      `Staliukas ${table}`,
      `manti-staliukas-${table}.png`
    );
  };

  const downloadKitchenPoster = () => {
    downloadPosterPng(qrKitchenSrc(), "Virtuvė & Kasa", "manti-virtuve.png");
  };

  const downloadAllPDF = async () => {
    const pdf = new jsPDF();
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      await addPosterToPdf(
        pdf,
        qrSrc(table),
        `Staliukas ${table}`,
        i === 0
      );
    }
    pdf.save("manti-staliuku-qr.pdf");
  };

  const downloadKitchenPDF = async () => {
    const pdf = new jsPDF();
    await addPosterToPdf(pdf, qrKitchenSrc(), "Virtuvė & Kasa", true);
    pdf.save("manti-virtuve-qr.pdf");
  };

  const printPosters = (type: "tables" | "kitchen") => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const items =
      type === "kitchen"
        ? [{ qrSrc: qrKitchenSrc(), label: "Virtuvė & Kasa" }]
        : tables.map((t) => ({
            qrSrc: qrSrc(t),
            label: `Staliukas ${t}`,
          }));

    printWindow.document.write(posterPrintHtml(items));
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold mb-2">QR kodai</h1>
        <p className="text-black/50">
          Plakatai su Manti dizainu — spausdinkite ir klijuokite ant staliukų
        </p>
      </div>

      {/* Virtuvės QR */}
      <div className="bg-white rounded-2xl p-6 card-shadow mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">Virtuvės QR</h2>
              <p className="text-black/50 text-sm">Nukreipia į virtuvės ekraną</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={downloadKitchenPoster}>
              <Download className="w-4 h-4" />
              PNG plakatas
            </Button>
            <Button size="sm" variant="outline" onClick={downloadKitchenPDF}>
              <Download className="w-4 h-4" />
              PDF
            </Button>
            <Button size="sm" variant="secondary" onClick={() => printPosters("kitchen")}>
              <Printer className="w-4 h-4" />
              Spausdinti
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-8">
          <QrPosterCard qrSrc={qrKitchenSrc()} label="Virtuvė & Kasa" />
          <div className="pt-4">
            <p className="text-black/60 text-sm mb-1">Nuoroda</p>
            <a
              href={`${baseUrl}/kitchen`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-olive hover:underline flex items-center gap-1 text-sm"
            >
              {baseUrl}/kitchen
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Staliukų QR */}
      <div className="bg-white rounded-2xl p-6 card-shadow mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold">Staliukų QR</h2>
              <p className="text-black/50 text-sm">
                Klientai nuskanuoja ir užsisako maistą
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={downloadAllPDF}>
              <Download className="w-4 h-4" />
              Visi PDF
            </Button>
            <Button size="sm" variant="secondary" onClick={() => printPosters("tables")}>
              <Printer className="w-4 h-4" />
              Spausdinti visus
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 max-w-lg">
          <Input
            label="Nuo staliuko"
            type="number"
            min={1}
            max={99}
            value={String(tableFrom)}
            onChange={(e) => setTableFrom(parseInt(e.target.value, 10) || 1)}
          />
          <Input
            label="Iki staliuko"
            type="number"
            min={1}
            max={99}
            value={String(tableTo)}
            onChange={(e) => setTableTo(parseInt(e.target.value, 10) || 1)}
          />
        </div>
        <p className="text-black/40 text-sm mb-2">
          {tables.length} plakatai (staliukai {tables[0]}–{tables[tables.length - 1]})
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {tables.map((table) => (
          <div key={table} className="flex flex-col items-center gap-4">
            <QrPosterCard
              qrSrc={qrSrc(table)}
              label={`Staliukas ${table}`}
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => downloadTablePoster(table)}>
                <Download className="w-4 h-4" />
                PNG
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(`${baseUrl}/t/${table}`, "_blank")}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
