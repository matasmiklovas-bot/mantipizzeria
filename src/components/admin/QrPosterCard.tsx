interface QrPosterCardProps {
  qrSrc: string;
  label: string;
  className?: string;
}

export function QrPosterCard({ qrSrc, label, className }: QrPosterCardProps) {
  return (
    <div
      className={`bg-[#111111] border-2 border-[#c9a962] rounded-sm flex flex-col items-center justify-between px-6 py-8 w-[280px] aspect-[3/4] shadow-xl ${className ?? ""}`}
    >
      <img
        src="/brand/logo-mark.png"
        alt="Manti Pizzeria"
        className="h-[72px] w-auto max-w-[200px] object-contain brightness-0 invert"
      />

      <div className="bg-[#faf8f5] rounded-[20px] p-4">
        <img src={qrSrc} alt="QR kodas" className="w-[180px] h-[180px] block" />
      </div>

      <div className="bg-[#8b2635] text-white font-semibold text-lg px-8 py-3 rounded-full whitespace-nowrap">
        {label}
      </div>
    </div>
  );
}
