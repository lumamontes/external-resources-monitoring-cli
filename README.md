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

The CLI includes a Google Drive provider and a deterministic provider for the synthetic example. Google Drive checks make anonymous requests and do not use credentials. JSON output is written to standard output unless `--output` is supplied.

To check a public Google Drive file without credentials, copy `examples/google-drive.json`, replace its placeholder file ID with a file shared for anonymous viewing/downloading, and run:

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

## Scope

The first milestone is a stateless, bounded batch monitor. It does not store credentials, make authenticated checks, crawl sites, or change publication decisions. Google Drive anonymous PDF checking, Markdown reports, GitHub Actions scheduling, durable history, and signed transition webhooks are subsequent milestones.
