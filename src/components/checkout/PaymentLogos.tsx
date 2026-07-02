export function ApplePayBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-8 items-center rounded-lg bg-black px-3 ${className ?? ""}`}
    >
      <svg viewBox="0 0 50 20" className="h-4 w-auto" aria-label="Apple Pay">
        <path
          fill="#fff"
          d="M8.4 3.2c-.5.6-1.3 1.1-2.1 1-.1-.8.3-1.6.7-2.1.5-.6 1.3-1 2-1 .1.8-.2 1.6-.6 2.1zm.6 1c-1.1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.2.7-2.8 1.7-1.2 2.1-.3 5.2.8 6.9.6.8 1.2 1.7 2.1 1.7.9 0 1.2-.6 2.3-.6 1.1 0 1.4.6 2.3.6.9 0 1.5-.8 2.1-1.6.7-.9 1-1.9 1-1.9s-1.9-.7-1.9-2.9c0-1.8 1.5-2.7 1.5-2.7s-.8-1.2-2.1-1.2c-.1 0-1.1-.1-1.8.9zm7.1-.2h-4.8v9.8h2.5v-3.3h2.3c2.1 0 3.6-1.1 3.6-3.2 0-2-1.5-3.3-3.6-3.3zm-.1 5.3h-2v-3.9h2c1.2 0 1.9.6 1.9 1.9s-.7 2-1.9 2zm5.8 2.7c1.3 0 2.2-.6 2.7-1.6l-2.2-1.3c-.2.5-.7.9-1.4.9-.9 0-1.5-.7-1.5-1.9v-.1h4.4v-.6c0-2.3-1.2-3.7-3.2-3.7-2 0-3.3 1.5-3.3 3.8 0 2.2 1.3 3.8 3.4 3.8zm-.1-6.1c.8 0 1.3.5 1.4 1.3h-2.9c.1-.7.6-1.3 1.5-1.3zm8.1 6.1c1.1 0 2-.5 2.5-1.3l-2.1-1.2c-.2.4-.6.7-1.1.7-.8 0-1.3-.7-1.3-1.8v-.1c0-1.1.5-1.8 1.3-1.8.5 0 .9.3 1.1.7l2.1-1.2c-.5-.8-1.4-1.3-2.5-1.3-2 0-3.4 1.4-3.4 3.8 0 2.3 1.4 3.8 3.4 3.8zm5.2-7.5v1.6h1.3v1.8h-1.3v3.4c0 .6.3.9.9.9.2 0 .4 0 .6-.1v1.8c-.3.1-.7.1-1.1.1-1.4 0-2.1-.7-2.1-2.2v-3.9h-1.2v-1.8h1.2V6.4h2.5z"
        />
      </svg>
    </span>
  );
}

export function GooglePayBadge({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-3 ${className ?? ""}`}
    >
      <svg viewBox="0 0 44 18" className="h-4 w-auto" aria-label="Google Pay">
        <path
          fill="#5F6368"
          d="M8.2 8.8v2.6h3.6c-.2 1-1.2 2.9-3.6 2.9-2.2 0-4-1.8-4-4s1.8-4 4-4c1 0 1.7.4 2.1.8l1.6-1.5C11.2 3.6 9.8 3 8.2 3 4.5 3 1.5 6 1.5 9.7s3 6.7 6.7 6.7c3.8 0 6.3-2.7 6.3-6.5 0-.4 0-.8-.1-1.1H8.2z"
        />
        <path fill="#4285F4" d="M18.5 7.6h2.1V16h-2.1V7.6z" />
        <path
          fill="#4285F4"
          d="M26.8 11.2c0-1.3-1-2.2-2.6-2.2-1.5 0-2.6 1-2.6 2.4 0 1.4 1.1 2.4 2.7 2.4.8 0 1.5-.2 2-.6l-1-1.5c-.4.3-.9.5-1.4.5-.7 0-1.3-.3-1.5-.9h3.7c0-.1 0-.2.1-.3v-.8zm-3.6-.9c0-.6.5-1 1.2-1 .7 0 1.1.4 1.2 1h-2.4z"
        />
        <path
          fill="#4285F4"
          d="M31.2 7.3c-1.4 0-2.3.7-2.8 1.4l1.6 1.1c.3-.5.8-.8 1.3-.8.8 0 1.3.5 1.3 1.2v.3h-1.4c-1.8 0-2.7.8-2.7 2 0 1.2 1 2 2.4 2 .9 0 1.6-.3 2.1-.9v.7h2V10c0-1.7-1.2-2.7-2.8-2.7zm-.3 4.8c-.6 0-1-.3-1-.7 0-.5.4-.8 1.2-.8h1.3v.4c0 .6-.6 1.1-1.5 1.1z"
        />
        <path
          fill="#4285F4"
          d="M38.5 11.9l-2.5-4.3h2.3l1.4 2.7 1.4-2.7h2.2l-2.5 4.3 2.6 4.5h-2.3l-1.6-2.9-1.6 2.9h-2.2l2.6-4.5z"
        />
      </svg>
    </span>
  );
}

export function CardBadge({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-1.5 ${className ?? ""}`}>
      <span className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-2.5 text-[11px] font-bold tracking-wide text-[#1A1F71]">
        VISA
      </span>
      <span className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white px-2.5">
        <span className="flex items-center -space-x-1">
          <span className="h-3.5 w-3.5 rounded-full bg-[#EB001B]" />
          <span className="h-3.5 w-3.5 rounded-full bg-[#F79E1B]" />
        </span>
      </span>
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
