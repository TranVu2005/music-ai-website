import { isIP } from "node:net";

export interface RateLimiter {
  consume(key: string, now: number): boolean | Promise<boolean>;
}

export class MemoryRateLimiter implements RateLimiter {
  private readonly entries = new Map<string, { count: number; expiresAt: number }>();

  constructor(
    private readonly limit = 5,
    private readonly windowMs = 600000,
    private readonly maxKeys = 10000,
  ) {}

  consume(key: string, now: number): boolean {
    for (const [entryKey, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(entryKey);
    }
    const current = this.entries.get(key);
    if (current) {
      if (current.count >= this.limit) return false;
      current.count += 1;
      return true;
    }
    if (this.entries.size >= this.maxKeys) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { count: 1, expiresAt: now + this.windowMs });
    return true;
  }
}

export function createRateLimiter(): RateLimiter {
  // Extension point: replace the backing store when the app has multiple instances.
  return new MemoryRateLimiter();
}

export function getClientIp(request: Request, trustedProxyHops = 1): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const hops = Number.isSafeInteger(trustedProxyHops) && trustedProxyHops > 0 ? trustedProxyHops : 1;
  if (forwarded) {
    const entries = forwarded.split(",").map((item) => item.trim());
    const selected = entries[entries.length - hops];
    if (selected && isIP(selected)) return selected;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;
  console.warn("[custom-request] no trusted client IP; using shared fallback key");
  return "unknown-client";
}

export function getTrustedProxyHops(): number {
  const value = Number(process.env.TRUSTED_PROXY_HOPS ?? "1");
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
}
