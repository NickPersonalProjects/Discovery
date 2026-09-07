import { normalizeUsState } from "./us-states";

export function normalizeZipCode(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length < 5) {
    return undefined;
  }

  return digits.slice(0, 5);
}

export function normalizePhoneNumber(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }

  return digits.length === 10 ? digits : undefined;
}

export function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function canonicalizeUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
    const normalizedHost = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!normalizedHost) {
      return undefined;
    }

    const path = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
    return `https://${normalizedHost}${path}`;
  } catch {
    return undefined;
  }
}

export function extractDomain(value: string | undefined): string | undefined {
  const canonical = canonicalizeUrl(value);
  if (!canonical) {
    return undefined;
  }

  return new URL(canonical).hostname;
}

export function normalizeStateAndZip(input: { state?: string; postalCode?: string }) {
  return {
    state: normalizeUsState(input.state),
    postalCode: normalizeZipCode(input.postalCode),
  };
}
