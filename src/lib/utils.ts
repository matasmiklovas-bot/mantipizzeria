export function formatPrice(price: number): string {
  return `${price.toFixed(2)} €`;
}

export function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString("lt-LT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getAppUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getTableUrl(tableNumber: number): string {
  return `${getAppUrl()}/t/${tableNumber}`;
}
