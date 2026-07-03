const badgeClass = "h-7 w-auto shrink-0";

export function ApplePayBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 50 20"
      role="img"
      aria-label="Apple Pay"
      className={`${badgeClass} ${className ?? ""}`}
    >
      <rect width="50" height="20" rx="3" fill="#000" />
      <path
        fill="#fff"
        d="M8.1 5.4c-.5 0-1.1.3-1.4.7-.4.5-.5 1.1-.4 1.7.5 0 1-.3 1.4-.7.3-.4.5-1 .4-1.6-.1 0-.6-.1-1-.1zm-.8 2.1c-.6 0-1.1.4-1.4.9-.3.5-.4 1.2-.2 1.8.8.1 1.5-.4 1.9-1.1.2-.3.3-.7.3-1.1 0-.1 0-.2-.1-.2-.2-.1-.7-.2-1.2-.2z"
      />
      <path
        fill="#fff"
        d="M12.1 7.2h1.1c1.1 0 1.9.6 1.9 1.7 0 1.2-.8 1.8-2 1.8h-1.4V7.2zm1.1 2.8c.7 0 1-.4 1-1.1 0-.6-.4-1-1-1h-.5v2.1h.5zm2.5 1.1c.8 0 1.3-.4 1.6-1l-1.1-.6c-.1.3-.4.5-.7.5-.5 0-.8-.4-.8-1v-.1c0-.6.3-1 .8-1 .3 0 .6.2.7.5l1.1-.6c-.3-.5-.8-.8-1.5-.8-1.1 0-1.8.8-1.8 2 0 1.2.7 2 1.9 2zm2.2-3.9v.8h.7v.9h-.7v1.8c0 .3.1.5.5.5.1 0 .2 0 .3 0v.9c-.2 0-.4.1-.6.1-.7 0-1.1-.4-1.1-1.2V8h-.6V7h.6V6.2h1.2zm2.9 3.9c.7 0 1.2-.3 1.4-.9l-1.1-.6c-.1.4-.4.6-.8.6-.6 0-.9-.5-.9-1.1v-.1c0-.7.4-1.1.9-1.1.4 0 .7.2.8.5l1.1-.6c-.3-.5-.8-.8-1.5-.8-1.1 0-1.8.8-1.8 2 0 1.2.7 2 1.8 2zm2.1-3.9h1.2v5.8h-1.2V7.2zm4.1 5.9c1 0 1.7-.4 2.1-1.1l-1.1-.6c-.2.4-.5.6-.9.6-.6 0-1-.5-1-1.1v-.1c0-.6.4-1.1 1-1.1.4 0 .7.2.9.5l1.1-.6c-.4-.7-1-1-1.8-1-1.2 0-2 0.9-2 2.1 0 1.2.8 2.1 2 2.1z"
      />
    </svg>
  );
}

export function GooglePayBadge({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 50 20"
      role="img"
      aria-label="Google Pay"
      className={`${badgeClass} ${className ?? ""}`}
    >
      <rect
        width="50"
        height="20"
        rx="3"
        fill="#fff"
        stroke="#747775"
        strokeWidth="0.5"
      />
      <g transform="translate(5, 1.5) scale(0.72)">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </g>
      <text
        x="27"
        y="13"
        fill="#3C4043"
        fontSize="8.5"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="500"
      >
        Pay
      </text>
    </svg>
  );
}

export function VisaLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 16"
      role="img"
      aria-label="Visa"
      className={`${badgeClass} ${className ?? ""}`}
    >
      <path
        fill="#1A1F71"
        d="M19.4 14.5l1.7-10.3h2.7l-1.7 10.3h-2.7zm11.5-10c-.5-.2-1.4-.4-2.5-.4-2.7 0-4.6 1.4-4.6 3.5 0 1.5 1.4 2.3 2.4 2.8 1.1.5 1.4.8 1.4 1.3 0 .7-.8 1-1.6 1-1.1 0-1.7-.2-2.6-.6l-.4-.2-.4 2.4c.7.3 2 0.6 3.2 0.6 2.9 0 4.7-1.4 4.7-3.6 0-1.2-.8-2.1-2.5-2.9-1-.5-1.7-.9-1.7-1.4 0-.5.5-1 1.7-1 .9-.1 1.7.2 2.2.4l.3.1.4-2.4zm6.7 6.2h2.3l-1.9-10.3h-2.1c-.5 0-.8.1-1.1.5l-3.8 9.8h2.7l.5-1.4h3.3l.2 1.4zm-2.9-3.7l1.4-3.7.4 3.7h-1.8zM15.1 4.2l-2.1 10.3h-2.6l2.1-10.3h2.6z"
      />
    </svg>
  );
}

export function MastercardLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 20"
      role="img"
      aria-label="Mastercard"
      className={`${badgeClass} ${className ?? ""}`}
    >
      <circle cx="12" cy="10" r="7" fill="#EB001B" />
      <circle cx="20" cy="10" r="7" fill="#F79E1B" />
      <path
        fill="#FF5F00"
        d="M16 4.8a7 7 0 0 0-2.7 5.7A7 7 0 0 0 16 16.2a7 7 0 0 0 2.7-5.7A7 7 0 0 0 16 4.8z"
      />
    </svg>
  );
}

export function CardBadge({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 overflow-visible ${className ?? ""}`}>
      <VisaLogo />
      <MastercardLogo />
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
