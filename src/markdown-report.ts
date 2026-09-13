import { outcomes } from './types.js';
import type { Observation, Outcome, RunReport } from './types.js';

const outcomeOrder: Outcome[] = [...outcomes];

export function renderMarkdownReport(report: RunReport): string {
  const totals = new Map<Outcome, number>(
    outcomeOrder.map((outcome) => [outcome, 0]),
  );
  for (const result of report.results) {
    totals.set(result.outcome, (totals.get(result.outcome) ?? 0) + 1);
  }
  const lines = [
    '# External Resources Monitor',
    '',
    `Observed at: \`${report.observedAt}\``,
    `Process status: **${report.shouldFail ? 'attention needed' : 'passed'}**`,
    '',
    '## Summary',
    '',
    '| Outcome | Count |',
    '| --- | ---: |',
    ...outcomeOrder.map((outcome) => `| ${outcome} | ${totals.get(outcome)} |`),
    '',
  ];
  for (const outcome of outcomeOrder) {
    if (outcome === 'available') continue;
    const results = report.results.filter(
      (result) => result.outcome === outcome,
    );
    if (results.length === 0) continue;
    lines.push(`## ${heading(outcome)}`, '');
    for (const result of results) lines.push(formatObservation(result));
    lines.push('');
  }
  lines.push(
    '## Interpretation',
    '',
    'Inaccessible means anonymous retrieval was confirmed to fail; it does not mean a resource was deleted. Inconclusive means the check could not establish a stable result and does not mean the resource is broken.',
    '',
  );
  return `${lines.join('\n').trimEnd()}\n`;
}

function heading(outcome: Outcome): string {
  return outcome.charAt(0).toUpperCase() + outcome.slice(1);
}

function formatObservation(observation: Observation): string {
  const identity = observation.title
    ? `**${escapeMarkdown(observation.title)}** (${observation.resourceId})`
    : `**${observation.resourceId}**`;
  const url =
    typeof observation.evidence.url === 'string'
      ? ` URL: \`${escapeMarkdown(observation.evidence.url)}\``
      : '';
  return `- ${identity}: ${escapeMarkdown(observation.reason)}${url} [${observation.provider}, ${observation.accessPerspective}, ${observation.durationMs} ms]`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!|>-]/g, '\\$&');
}
