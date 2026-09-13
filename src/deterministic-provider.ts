import type { Observation, Outcome, Provider } from './types.js';

interface FixtureObservation {
  outcome: Outcome;
  reason: string;
  evidence?: Record<string, unknown>;
}

export function createDeterministicProvider(
  fixtures: Record<string, FixtureObservation>,
  now: () => Date = () => new Date(),
): Provider {
  return {
    name: 'deterministic',
    recognize: (url) => url.toString() in fixtures,
    observe: async (resource): Promise<Observation> => ({
      resourceId: resource.id,
      provider: 'deterministic',
      accessPerspective: 'anonymous-reader',
      outcome: fixtures[resource.url]?.outcome ?? 'inconclusive',
      reason: fixtures[resource.url]?.reason ?? 'no fixture configured',
      observedAt: now().toISOString(),
      durationMs: 0,
      evidence: fixtures[resource.url]?.evidence ?? {},
    }),
  };
}
