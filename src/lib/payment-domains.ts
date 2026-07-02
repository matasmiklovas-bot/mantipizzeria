import { stripe } from "@/lib/stripe";
import { getRequestAppUrl } from "@/lib/utils";

const DEFAULT_DOMAINS = [
  "mantipizzeria.vercel.app",
  "mantipizzeria.lt",
  "www.mantipizzeria.lt",
];

export function getPaymentDomains(request?: Request): string[] {
  const fromEnv = process.env.APPLE_PAY_DOMAINS?.split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const domains = new Set<string>(fromEnv?.length ? fromEnv : DEFAULT_DOMAINS);

  if (request) {
    try {
      const hostname = new URL(getRequestAppUrl(request)).hostname;
      domains.add(hostname);
    } catch {
      // ignore
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      domains.add(new URL(appUrl).hostname);
    } catch {
      // ignore
    }
  }

  return [...domains];
}

export type DomainRegistrationResult = {
  domain: string;
  applePay: string;
  googlePay: string;
  enabled: boolean;
  error?: string;
};

export async function ensurePaymentMethodDomainsRegistered(
  request?: Request
): Promise<DomainRegistrationResult[]> {
  if (!stripe) return [];

  const domains = getPaymentDomains(request);
  const existing = await stripe.paymentMethodDomains.list({ limit: 100 });
  const byName = new Map(existing.data.map((d) => [d.domain_name, d]));
  const results: DomainRegistrationResult[] = [];

  for (const domain of domains) {
    try {
      let entry = byName.get(domain);
      if (!entry) {
        entry = await stripe.paymentMethodDomains.create({
          domain_name: domain,
        });
      }

      results.push({
        domain,
        applePay: entry.apple_pay?.status ?? "unknown",
        googlePay: entry.google_pay?.status ?? "unknown",
        enabled: entry.enabled,
      });
    } catch (error) {
      results.push({
        domain,
        applePay: "failed",
        googlePay: "failed",
        enabled: false,
        error: error instanceof Error ? error.message : "Registration failed",
      });
    }
  }

  return results;
}

export async function getPaymentMethodDomainStatus(
  request?: Request
): Promise<DomainRegistrationResult[]> {
  if (!stripe) return [];

  const domains = getPaymentDomains(request);
  const existing = await stripe.paymentMethodDomains.list({ limit: 100 });
  const byName = new Map(existing.data.map((d) => [d.domain_name, d]));

  return domains.map((domain) => {
    const entry = byName.get(domain);
    if (!entry) {
      return {
        domain,
        applePay: "not_registered",
        googlePay: "not_registered",
        enabled: false,
      };
    }
    return {
      domain,
      applePay: entry.apple_pay?.status ?? "unknown",
      googlePay: entry.google_pay?.status ?? "unknown",
      enabled: entry.enabled,
    };
  });
}
