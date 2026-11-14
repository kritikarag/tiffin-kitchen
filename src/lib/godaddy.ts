// GoDaddy Domains API. With GODADDY_API_KEY and GODADDY_API_SECRET set, availability is checked against
// GoDaddy's test environment (OTE). Without them the answers are simulated, and every result says so,
// so the rest of the app can be built and tested before the keys arrive.

const BASE_URL = process.env.GODADDY_API_URL ?? "https://api.ote-godaddy.com";

export type DomainCheck = { domain: string; available: boolean; price?: number; currency?: string; simulated: boolean };

export function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,24})+$/.test(domain);
}

function keys(): { key: string; secret: string } | null {
  const key = process.env.GODADDY_API_KEY;
  const secret = process.env.GODADDY_API_SECRET;
  return key && secret ? { key, secret } : null;
}

export async function checkDomain(domain: string): Promise<DomainCheck> {
  const auth = keys();
  if (!auth) {
    // Simulated rule: very short names count as taken, so the "try another name" path can be exercised.
    return { domain, available: domain.split(".")[0].length >= 8, simulated: true };
  }
  const response = await fetch(`${BASE_URL}/v1/domains/available?domain=${encodeURIComponent(domain)}`, {
    headers: { Authorization: `sso-key ${auth.key}:${auth.secret}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`GoDaddy answered ${response.status}`);
  const data = (await response.json()) as { available?: boolean; price?: number; currency?: string };
  return {
    domain,
    available: Boolean(data.available),
    // GoDaddy sends prices in millionths of the currency unit.
    price: typeof data.price === "number" ? Math.round(data.price / 10_000) / 100 : undefined,
    currency: data.currency,
    simulated: false,
  };
}

// TODO(stage 4): call POST /v1/domains/purchase on OTE once the keys are available. That call needs the
// owner's contact details and GoDaddy's consent agreements, so it is left out until it can be tested.
// For now this only reports that the registration was simulated; the caller saves the name on the kitchen.
export async function registerDomain(domain: string): Promise<{ domain: string; registered: boolean; simulated: boolean }> {
  return { domain, registered: true, simulated: true };
}
