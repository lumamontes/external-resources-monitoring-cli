# External Resources Monitoring CLI

A bounded CLI for observing whether publication resources are available from an anonymous reader perspective.

## Development

Requires Node.js 22 or newer.

```sh
npm install
npm run build
npm test
npm run typecheck
npm run lint
npm run format
```

Run the ticket 01 synthetic example without network access or credentials:

```sh
npm run build
node dist/cli.js --input examples/resources.json
```

The CLI includes a Google Drive provider and a deterministic provider for the synthetic example. Google Drive checks make anonymous requests and do not use credentials. JSON output is written to standard output unless `--output` is supplied. Pass `--markdown-output report.md` to write an optional maintainer summary alongside the canonical JSON report.

The repository includes one supplied public Drive PDF in `examples/google-drive.json`. To check another public Google Drive file without credentials, copy that file and replace its URL with a file shared for anonymous viewing/downloading, then run:

```sh
node dist/cli.js --input google-drive.json
```

To check a public Google Drive file without credentials, provide a collection containing a supported file-sharing URL:

```sh
node dist/cli.js --input my-resources.json
```

Drive folders and non-Drive URLs are reported as unsupported in this milestone. A viewer page is not considered available unless bounded retrieval produces the expected PDF content.

## Input

CSV and JSON collections contain `id` and `url`, with optional `title` and `profile` fields. IDs are stable resource identities and are not derived from URLs. Input is schema-validated and surrounding whitespace is normalized.

## Configuration

Configuration is YAML and is schema-validated. When omitted, safe defaults and the `publication` PDF validation profile are used. The monitor policy and named validation profiles are designed to be shared by future providers without duplicating content validation rules.

## Operational Envelope

This is a bounded batch monitor, not an unbounded crawler or high-volume scanning
service. Each run is limited by configured concurrency, request timeouts, retry
counts, response-body limits, and the finite input collection. It emits one
deterministic JSON report after attempting every resource; `failOn` controls which
confirmed outcomes produce a failing process exit code.

The copyable workflow is `.github/workflows/resource-monitor.yml`. It supports
scheduled and manual runs, uploads JSON and Markdown artifacts even when checks
fail, and uses the CLI exit code for workflow failure notifications. Artifact
retention follows the repository's GitHub Actions settings. Durable cross-run
state and signed transition webhooks are deferred to a later milestone.

## Scope

The first milestone is a stateless, bounded batch monitor. It does not store credentials, make authenticated checks, crawl sites, or change publication decisions. Google Drive anonymous PDF checking, Markdown reports, GitHub Actions scheduling, durable history, and signed transition webhooks are subsequent milestones.
