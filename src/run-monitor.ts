import type {
  MonitorConfig,
  Observation,
  Provider,
  Resource,
  RunReport,
} from './types.js';

interface RunMonitorOptions {
  resources: Resource[];
  config: MonitorConfig;
  providers: Provider[];
  now?: () => Date;
}

export async function runMonitor({
  resources,
  config,
  providers,
  now = () => new Date(),
}: RunMonitorOptions): Promise<RunReport> {
  const observedAt = now().toISOString();
  const results = await Promise.all(
    resources.map((resource) => observeResource(resource)),
  );

  return {
    version: 1,
    observedAt,
    results,
    shouldFail: results.some(({ outcome }) =>
      config.monitor.failOn.includes(outcome),
    ),
  };

  async function observeResource(resource: Resource): Promise<Observation> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(resource.url);
    } catch {
      return invalidObservation(resource, 'resource URL is malformed');
    }

    const provider = providers.find((candidate) =>
      candidate.recognize(parsedUrl),
    );
    if (!provider) {
      return {
        resourceId: resource.id,
        provider: 'none',
        accessPerspective: 'anonymous-reader',
        outcome: 'unsupported',
        reason: 'no provider recognizes this resource URL',
        observedAt,
        durationMs: 0,
        evidence: { url: resource.url },
      };
    }

    const profileName = resource.profile ?? Object.keys(config.profiles)[0];
    const profile =
      profileName === undefined ? undefined : config.profiles[profileName];
    if (!profile) {
      return invalidObservation(
        resource,
        `validation profile not found: ${profileName ?? 'none'}`,
      );
    }

    return provider.observe(resource, { profile, config: config.monitor });
  }

  function invalidObservation(resource: Resource, reason: string): Observation {
    return {
      resourceId: resource.id,
      provider: 'none',
      accessPerspective: 'anonymous-reader',
      outcome: 'invalid-input',
      reason,
      observedAt,
      durationMs: 0,
      evidence: { url: resource.url },
    };
  }
}
