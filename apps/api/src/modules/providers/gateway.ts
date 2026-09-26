import { limits } from "@atlas/config";
import type { Observation } from "../search/dedupe";

export type AdapterQuery = {
  text: string;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number | null;
  locale: string;
};

export type AdapterWarning = { code: string; provider: string; message: string };

export type AdapterSearchResult = {
  observations: Observation[];
  warning: AdapterWarning | null;
};

export type BuiltDestination = {
  label: string;
  preferredUrl: string;
  fallbackUrl: string;
  allowedHosts: string[];
  allowedSchemes: string[];
};

export interface ProviderAdapter {
  readonly code: string;
  readonly timeoutMs: number;
  search(input: AdapterQuery, signal: AbortSignal): Promise<AdapterSearchResult>;
  buildDestination(input: { externalId: string; action: string }, signal: AbortSignal): Promise<BuiltDestination | null>;
}

export class CircuitBreaker {
  private readonly state = new Map<string, { failures: number; openUntil: number }>();

  constructor(
    private readonly threshold = limits.circuitFailureThreshold,
    private readonly openMs = limits.circuitOpenMs,
  ) {}

  canCall(provider: string, now = Date.now()): boolean {
    const current = this.state.get(provider);
    return !current || current.openUntil <= now;
  }

  recordSuccess(provider: string): void {
    this.state.delete(provider);
  }

  recordFailure(provider: string, now = Date.now()): void {
    const current = this.state.get(provider) ?? { failures: 0, openUntil: 0 };
    const failures = current.failures + 1;
    this.state.set(provider, {
      failures,
      openUntil: failures >= this.threshold ? now + this.openMs : 0,
    });
  }
}

export class TokenBucket {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly limit: number, private readonly windowMs: number) {}

  tryTake(provider: string, now = Date.now()): boolean {
    const recent = (this.hits.get(provider) ?? []).filter((stamp) => now - stamp < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(provider, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(provider, recent);
    return true;
  }
}

export class ProviderGateway {
  constructor(
    private readonly adapters: ProviderAdapter[],
    private readonly breaker = new CircuitBreaker(),
    private readonly bucket = new TokenBucket(20, 1_000),
  ) {}

  async search(input: AdapterQuery, parent?: AbortSignal): Promise<{ observations: Observation[]; warnings: AdapterWarning[] }> {
    const eligible = this.adapters.filter((adapter) => this.breaker.canCall(adapter.code)).slice(0, limits.maxProvidersPerSearch);
    const deadline = AbortSignal.timeout(limits.searchDeadlineMs);
    const settled = await Promise.all(
      eligible.map((adapter) => this.callOne(adapter, input, parent ? AbortSignal.any([deadline, parent]) : deadline)),
    );
    return {
      observations: settled.flatMap((result) => result.observations),
      warnings: settled.flatMap((result) => (result.warning ? [result.warning] : [])),
    };
  }

  private async callOne(adapter: ProviderAdapter, input: AdapterQuery, deadline: AbortSignal): Promise<AdapterSearchResult> {
    if (!this.bucket.tryTake(adapter.code)) {
      return { observations: [], warning: { code: "rate_limited", provider: adapter.code, message: "Provider rate limit reached." } };
    }
    const timeout = AbortSignal.timeout(adapter.timeoutMs);
    const signal = AbortSignal.any([deadline, timeout]);
    try {
      const result = await adapter.search(input, signal);
      this.breaker.recordSuccess(adapter.code);
      return result;
    } catch (error) {
      this.breaker.recordFailure(adapter.code);
      const aborted = signal.aborted || (error instanceof Error && error.name === "AbortError");
      return {
        observations: [],
        warning: {
          code: aborted ? "timeout" : "unavailable",
          provider: adapter.code,
          message: aborted ? "Provider timed out." : "Provider unavailable.",
        },
      };
    }
  }
}
