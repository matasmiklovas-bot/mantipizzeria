export function isSecureCookie(): boolean {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return url.startsWith("https://");
}
