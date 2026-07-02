import { stripe } from "@/lib/stripe";
import { readFile } from "fs/promises";
import path from "path";

const DEFAULT_DOMAINS = ["mantipizzeria.lt", "mantipizzeria.vercel.app", "localhost"];

export function getApplePayDomains(): string[] {
  const fromEnv = process.env.APPLE_PAY_DOMAINS?.split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  if (fromEnv?.length) return fromEnv;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      const hostname = new URL(appUrl).hostname;
      return [...new Set([hostname, ...DEFAULT_DOMAINS])];
    } catch {
      // ignore invalid URL
    }
  }

  return DEFAULT_DOMAINS;
}

export async function getApplePayDomainAssociation(): Promise<string | null> {
  if (process.env.APPLE_PAY_DOMAIN_ASSOCIATION) {
    return process.env.APPLE_PAY_DOMAIN_ASSOCIATION;
  }

  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      ".well-known",
      "apple-developer-merchantid-domain-association"
    );
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export async function ensureApplePayDomainsRegistered(): Promise<void> {
  if (!stripe) return;

  const domains = getApplePayDomains();
  const existing = await stripe.applePayDomains.list({ limit: 100 });
  const registered = new Set(existing.data.map((d) => d.domain_name));

  for (const domain of domains) {
    if (registered.has(domain)) continue;
    try {
      await stripe.applePayDomains.create({ domain_name: domain });
    } catch {
      // Domain verification file may not be hosted yet
    }
  }
}
