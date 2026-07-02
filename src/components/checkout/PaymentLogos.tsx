const badgeClass = "h-8 w-auto";

export function ApplePayBadge({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/payments/apple-pay.svg"
      alt="Apple Pay"
      className={`${badgeClass} ${className ?? ""}`}
    />
  );
}

export function GooglePayBadge({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/payments/google-pay.svg"
      alt="Google Pay"
      className={`${badgeClass} ${className ?? ""}`}
    />
  );
}

export function CardBadge({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/payments/visa.svg" alt="Visa" className={badgeClass} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/payments/mastercard.svg"
        alt="Mastercard"
        className={badgeClass}
      />
    </div>
  );
}

export function PaymentLogos({ className }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <ApplePayBadge />
      <GooglePayBadge />
      <CardBadge />
    </div>
  );
}
