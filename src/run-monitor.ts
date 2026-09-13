import type {
  MonitorConfig,
  Observation,
  Provider,
  Resource,
  RunReport,
  NetworkTransport,
} from './types.js';

interface RunMonitorOptions {
  resources: Resource[];
  config: MonitorConfig;
  providers: Provider[];
  now?: () => Date;
  network?: NetworkTransport;
}

export async function runMonitor({
  resources,
  config,
  providers,
  now = () => new Date(),
  network = globalThis.fetch,
}: RunMonitorOptions): Promise<RunReport> {
  const observedAt = now().toISOString();
  const results = await observeResources();

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

    const profileName = resource.profile ?? config.monitor.defaultProfile;
    const profile =
      profileName === undefined ? undefined : config.profiles[profileName];
    if (!profile) {
      return invalidObservation(
        resource,
        `validation profile not found: ${profileName}`,
      );
    }

    let provider: Provider | undefined;
    let recognitionFailure: Provider | undefined;
    for (const candidate of providers) {
      try {
        if (candidate.recognize(parsedUrl)) {
          provider = candidate;
          break;
        }
      } catch {
        recognitionFailure ??= candidate;
      }
    }
    if (!provider && recognitionFailure) {
      return withResourceTitle(resource, {
        resourceId: resource.id,
        provider: recognitionFailure.name,
        accessPerspective: 'anonymous-reader',
        outcome: 'inconclusive',
        reason: 'provider recognition failed',
        observedAt,
        durationMs: 0,
        evidence: {},
      });
    }
    if (!provider) {
      return withResourceTitle(resource, {
        resourceId: resource.id,
        provider: 'none',
        accessPerspective: 'anonymous-reader',
        outcome: 'unsupported',
        reason: 'no provider recognizes this resource URL',
        observedAt,
        durationMs: 0,
        evidence: { url: resource.url },
      });
    }

    try {
      return withResourceTitle(
        resource,
        await provider.observe(resource, {
          profile,
          config: config.monitor,
          providerConfig: config.providers[provider.name] ?? {},
          network,
        }),
      );
    } catch (error) {
      return withResourceTitle(resource, {
        resourceId: resource.id,
        provider: provider.name,
        accessPerspective: 'anonymous-reader',
        outcome: 'inconclusive',
        reason: `provider check failed: ${error instanceof Error ? error.message : String(error)}`,
        observedAt,
        durationMs: 0,
        evidence: {},
      });
    }
  }

  function invalidObservation(resource: Resource, reason: string): Observation {
    return withResourceTitle(resource, {
      resourceId: resource.id,
      provider: 'none',
      accessPerspective: 'anonymous-reader',
      outcome: 'invalid-input',
      reason,
      observedAt,
      durationMs: 0,
      evidence: { url: resource.url },
    });
  }

  function withResourceTitle(
    resource: Resource,
    observation: Observation,
  ): Observation {
    return resource.title === undefined
      ? observation
      : { ...observation, title: resource.title };
  }

  async function observeResources(): Promise<Observation[]> {
    const results: Observation[] = new Array(resources.length);
    let nextIndex = 0;
    const workerCount = Math.min(config.monitor.concurrency, resources.length);

    await Promise.all(
      Array.from({ length: workerCount }, async () => {
        while (nextIndex < resources.length) {
          const index = nextIndex;
          nextIndex += 1;
          results[index] = await observeResource(resources[index]!);
        }
      }),
    );

    return results;
  }
}
