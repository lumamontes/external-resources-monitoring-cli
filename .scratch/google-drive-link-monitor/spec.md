# Google Drive Publication Resource Monitor

Status: ready-for-agent

## Problem Statement

Biblioteca de Zines stores publication resources as external URLs, primarily Google Drive file links. A resource can become inaccessible to an anonymous reader while remaining apparently accessible to an authenticated maintainer, and a Google Drive viewer page can load without proving that the publication content itself can be retrieved. Maintainers currently lack a repeatable way to check the collection and identify resources that need attention.

The first collection is approximately 350 resources. It contains mostly Google Drive file URLs, a small number of non-Drive PDF URLs, and some Drive folder URLs. The monitor must distinguish a confirmed anonymous access problem from malformed input, unsupported resources, and transient checker/provider failures. It must not turn availability observations into editorial or preservation decisions.

## Solution

Provide a local TypeScript CLI that reads a JSON or CSV collection of resources identified by stable IDs, checks supported Google Drive PDF resources from an anonymous-reader perspective, validates that bounded retrieved content matches the expected PDF profile, and emits a machine-readable JSON run report. An optional Markdown report provides a maintainer-friendly summary.

Provide a copyable GitHub Actions workflow example so a repository can run the CLI on a schedule against its committed collection file. The CLI checks the full batch with bounded concurrency, retries, timeouts, and response limits, then exits according to configurable result policy. By default, confirmed inaccessible resources and invalid input fail the workflow, while inconclusive and unsupported resources are reported without stopping the batch.

The first milestone is stateless across scheduled runs. A later milestone may persist observations, detect meaningful availability transitions, and deliver signed webhooks to consumers. Consumers, not the monitor, decide whether to notify, hide, unpublish, or restore a publication.

## User Stories

1. As a maintainer, I want to provide a collection of publication resources in CSV, so that I can check the same collection used by my catalogue.
2. As a maintainer, I want to provide a collection of publication resources in JSON, so that structured metadata can be checked without converting it to CSV.
3. As a collection owner, I want every resource to have a stable ID, so that results remain associated with the same publication even if its URL later changes.
4. As a collection owner, I want to include an optional title, so that reports identify resources in human-readable terms.
5. As a maintainer, I want surrounding whitespace in imported values normalized, so that harmless formatting from exports does not create false invalid-input results.
6. As a maintainer, I want malformed records reported with row/field context, so that I can correct the source collection efficiently.
7. As a maintainer, I want the batch to continue after one resource fails, so that one bad URL does not hide other resources needing attention.
8. As an anonymous reader, I want a supported Google Drive file to be checked without maintainer credentials, so that the result reflects public reader access rather than privileged access.
9. As a maintainer, I want a check to prove content retrieval rather than only an HTTP success response, so that a Drive UI shell or permission message is not mistaken for an available publication.
10. As a maintainer, I want a PDF resource validated against its expected content type and PDF signature, so that an HTML error page or access screen is not reported as an available PDF.
11. As a maintainer, I want bounded retrieval limits, so that a large resource cannot consume unbounded memory, time, or network bandwidth.
12. As a maintainer, I want supported Drive file URL forms recognized consistently, so that common sharing-link variations do not require manual rewriting.
13. As a maintainer, I want Drive resource keys preserved when present, so that link-shared files that require them can be checked correctly.
14. As a maintainer, I want Drive folders and unsupported provider URLs classified explicitly, so that out-of-scope resources are not mislabeled as inaccessible.
15. As a maintainer, I want non-Drive PDFs reported as unsupported in v1, so that the Drive-only scope is clear while leaving a future HTTP provider possible.
16. As a maintainer, I want Google Workspace document links outside the supported PDF contract classified explicitly, so that the monitor does not imply that Docs, Sheets, or Slides exports were checked.
17. As a maintainer, I want timeouts, rate limits, checker failures, and ambiguous provider responses classified as inconclusive, so that transient infrastructure problems do not create false publication failures.
18. As a maintainer, I want retry and backoff behavior, so that a temporary response failure gets a bounded second chance before classification.
19. As a maintainer, I want concurrency limits, so that a batch of hundreds of resources does not overwhelm Google Drive or the runner.
20. As a maintainer, I want the operational limits documented, so that I know when to partition a large collection or choose a different monitoring design.
21. As a maintainer, I want JSON results available by default, so that CI systems and other tools can consume the complete run output.
22. As a maintainer, I want an optional Markdown report, so that I can inspect failures and inconclusive results quickly without reading raw JSON.
23. As a maintainer, I want evidence such as outcome reason, access perspective, timing, redirect information, and safe response metadata, so that I can understand why a resource received its outcome.
24. As a maintainer, I want sensitive response data excluded or bounded in reports, so that the tool does not unnecessarily retain content, credentials, or excessive provider responses.
25. As a maintainer, I want the process exit code to reflect confirmed attention-needed results, so that GitHub Actions can notify me without a separate dashboard.
26. As a maintainer, I want unsupported resources reported without aborting the batch, so that I receive one complete review list.
27. As a maintainer, I want unsupported results to be configurable as workflow failures, so that strict collections can enforce provider scope while mixed collections retain better developer experience.
28. As a maintainer, I want a YAML configuration file, so that operational and validation policies are readable and versioned with my collection.
29. As a maintainer, I want configuration syntax and structure validated with a formal schema, so that misspelled or ambiguous settings fail with actionable errors.
30. As a collection owner, I want reusable named validation profiles, so that PDF expectations can be shared by future providers and different content types can be added without duplicating validators.
31. As a collection owner, I want a default validation profile, so that ordinary records do not need repetitive configuration.
32. As a collection owner, I want an individual resource to select a validation profile, so that one collection can eventually contain different expected content types.
33. As a future contributor, I want provider-specific access behavior isolated from generic content validation, so that adding an HTTP or object-storage provider does not duplicate PDF validation.
34. As a future contributor, I want providers to return a normalized observation, so that new providers automatically reuse batch orchestration, reports, exit policy, and future transition handling.
35. As a repository maintainer, I want a documented GitHub Actions workflow example, so that scheduled checks can run without building a hosted service.
36. As a repository maintainer, I want the workflow to upload the run report, so that results remain inspectable after a scheduled run.
37. As a repository maintainer, I want the workflow to avoid requiring credentials for the anonymous check, so that the result cannot accidentally be upgraded by the maintainer's account.
38. As a maintainer, I want a local command equivalent to the scheduled workflow, so that I can reproduce and investigate a failed run.
39. As a maintainer, I want deterministic simulated provider responses in tests, so that tests do not depend on live Drive resources or network availability.
40. As a maintainer, I want a later webhook to represent meaningful availability transitions rather than every poll failure, so that consumers do not receive duplicate noise.
41. As a consuming product, I want webhook payloads to identify the resource, observation, access perspective, and transition, so that I can apply my own policy.
42. As a consuming product, I want webhook deliveries signed, versioned, retryable, and deduplicable, so that I can safely process notifications.
43. As a consuming product, I want the monitor to avoid changing publication visibility, so that editorial approval remains independent from resource availability.
44. As a future storage owner, I want the monitor to avoid owning migration, catalogue transformation, privacy policy, and preservation guarantees, so that those responsibilities remain with the appropriate system.
45. As an open-source contributor, I want strict types, clear validation errors, focused modules, and documented extension points, so that I can add a provider without understanding an unnecessary framework.
46. As a portfolio reviewer, I want failure semantics, bounded resource use, reproducible CI, and evidence-oriented reports, so that the project demonstrates engineering judgment rather than only making HTTP requests.

## Implementation Decisions

- The first milestone is a local CLI implemented in TypeScript for Node.js 22 LTS, using ESM, strict TypeScript, minimal dependencies, and conventional package tooling.
- The code uses a straightforward modular design rather than full hexagonal architecture or tactical DDD. Domain language and invariants are explicit, but abstractions are added only where behavior requires them.
- The highest test seam is an application-level `runMonitor` operation that accepts resources, configuration, and a replaceable network transport, then returns a complete run report and exit decision.
- A small provider contract is the intentional extensibility seam. A provider recognizes supported resource URLs, performs provider-specific access behavior for a declared access perspective, and returns normalized observation data with provider-specific evidence.
- The first implemented provider is Google Drive. It supports common file-sharing URL forms containing a file ID and preserves a resource key when one is present in the submitted URL.
- Drive folders, malformed Drive URLs, non-Drive URLs, and unsupported Google Workspace document links are classified rather than silently coerced into file checks.
- The v1 access perspective is anonymous reader access with no stored credentials. Authenticated maintainer access must not be used to establish availability.
- The v1 expected content is a PDF retrieved through the Google Drive provider. Content validation checks bounded retrieval, expected content metadata where available, and PDF signature/content evidence. A successful viewer-page response alone is not sufficient.
- Content validation is separate from provider access. Named validation profiles are reusable across providers, support expected content types and provider-independent rules, and can be selected by individual resources. The initial profile targets publication PDFs.
- CSV input uses a maintained CSV parser. JSON uses standard syntax parsing followed by schema validation. YAML uses a maintained YAML parser followed by schema validation. Input values are normalized before domain validation.
- JSON Schema is the validation contract for configuration and input structures. A mature validator such as AJV provides actionable structural errors; schemas are versioned and tested.
- Configuration is YAML. It contains a version, common monitor policy, named validation profiles, provider-specific settings, and configurable failure categories. Safe defaults apply when optional settings are omitted.
- Common monitor policy includes bounded concurrency, timeout, retry/backoff, response/body limits, output options, and exit-code policy. Provider-specific settings do not leak into unrelated providers.
- The canonical run output is JSON and includes resource identity, provider, access perspective, outcome, reason, timestamps, duration, redirect information, bounded safe evidence, and validation details. Markdown output is optional.
- Outcomes are `available`, `inaccessible`, `inconclusive`, `unsupported`, and `invalid-input`, using the definitions in the domain glossary.
- The batch continues after individual outcomes. Default failure policy marks `inaccessible` and `invalid-input` as exit-code failures. `inconclusive` and `unsupported` are reported without stopping the batch and can be configured as failures.
- The CLI is stateless across runs in v1. It does not require a committed 350-entry state file, SQLite database, cache, or external storage.
- The GitHub Actions deliverable is a copyable workflow example that installs/runs the CLI against repository-owned input, supports scheduling, uploads JSON and optional Markdown reports, and relies on the CLI exit code for notifications.
- The repository documents the intended operational envelope and non-goals: this is a bounded batch monitor, not an unbounded crawler or high-volume scanning service. Users can partition larger collections and tune limits, but the project makes no arbitrary-scale promise.
- Webhooks are a later milestone. That milestone adds durable observation history, transition detection, signed versioned payloads, durable pending delivery, bounded retries, duplicate handling, stale-event protection, and recovery events.
- Later webhook transitions are based on confirmed provider results after configured retries. The threshold for confirmed consecutive inaccessible observations is configurable and defaults to one; inconclusive results do not trigger an availability transition.
- Webhook consumers own publication decisions. The monitor never hides, unpublishes, restores, or otherwise changes a resource's editorial visibility.

## Testing Decisions

- Tests verify observable behavior at the application seam, not internal module layout, private helper calls, or chosen implementation patterns.
- The network transport is replaced with deterministic simulated responses. Tests must not depend on live Google Drive resources, credentials, current provider behavior, or public URLs.
- Input tests cover valid CSV and JSON, normalization of surrounding whitespace, missing IDs, missing URLs, malformed URLs, duplicate IDs, unsupported URL classes, row/field error reporting, and profile selection.
- Provider tests cover common Drive file URL forms, query parameters, resource keys, folders, unsupported Google Workspace links, malformed IDs, redirects, permission/request-access responses, successful content retrieval, rate limits, timeouts, and provider failures.
- Content validation tests cover valid PDFs, HTML or permission pages returned where PDF content was expected, mismatched content types, invalid PDF signatures, bounded response sizes, and incomplete retrieval.
- Classification tests verify the distinction between available, inaccessible, inconclusive, unsupported, and invalid-input, including the rule that transient checker/provider failures are not inaccessible results.
- Batch tests verify that all resources are processed despite individual outcomes, concurrency remains bounded, retries are limited, and one result does not alter another resource's identity or evidence.
- Output tests verify canonical JSON fields, optional Markdown summaries, safe evidence boundaries, deterministic ordering, and actionable reasons.
- Exit-policy tests verify default and configured failure categories, including the non-aborting treatment of unsupported and inconclusive results.
- Configuration tests use the formal YAML and JSON schemas to verify accepted defaults, rejected unknown or malformed fields, profile references, provider settings, and useful validation messages.
- CLI smoke tests verify file input, configuration loading, output selection, and process exit behavior through the public command, while the application seam holds the main behavior coverage.
- GitHub Actions validation should at minimum verify that the documented workflow invokes the public CLI, preserves reports as artifacts, and responds to its exit code. It should not require live external checks.
- Webhook tests are deferred until that milestone. They will cover transition thresholds, signed payload verification, stable event IDs, duplicate delivery, stale ordering, receiver downtime, retries, restart recovery, and recovery transitions.
- There is no existing application test prior art in this scaffold. New tests should establish the application-seam convention and use fixture-based simulated provider behavior as the project grows.

## Out of Scope

- General external HTTP URL checking in v1.
- Non-Drive PDF URLs in v1, including the currently supplied Tropical Versos, Ju Gama, Entre Editora, and Internet Archive URLs.
- Google Drive folders, collections, shortcuts requiring unsupported resolution, Google Docs, Sheets, Slides, Forms, Vids, and other non-PDF content in v1.
- Authenticated checks, maintainer-specific access, credential storage, OAuth flows, Drive API account access, or claims about actual permission configuration beyond anonymous retrieval evidence.
- Treating a Drive viewer-page load as proof that publication bytes are available.
- An unbounded crawler, link discovery, site map, or high-volume scanning service.
- A SaaS dashboard, hosted API, user accounts, multi-tenant control plane, or web UI.
- Cross-run state persistence, SQLite, committed state files, historical transition tracking, and webhook delivery in the first milestone.
- Webhook delivery before the stateless monitor and its result contract are stable.
- Automatic hiding, unpublishing, restoring, editorial approval, or preservation actions.
- Biblioteca/Supabase credentials, adapters, schemas, catalogue migration, metadata transformation, or PVD integration.
- Self-hosted storage, Cloudflare/object-storage providers, migration workflows, digital preservation guarantees, LGPD policy, or legal compliance claims.
- Browser automation unless implementation research demonstrates that bounded anonymous content retrieval cannot reliably establish the required result.
- A dynamic plugin marketplace, runtime plugin loading, speculative framework, distributed workers, message broker, or provider-specific database schema.
- Invented performance, scale, adoption, preservation, or false-positive metrics. Evidence must identify its fixture, environment, observation window, and limitations.

## Further Notes

- The supplied collection is useful as a local/manual verification source, but the public repository should use a small redacted/example input and synthetic or appropriately licensed fixtures rather than committing the full live Biblioteca collection.
- The input list currently contains a `pdf_url` column and some entries without stable IDs or titles. A source export must provide the agreed stable ID and URL fields before it is a production monitor input.
- Google Drive documentation establishes that viewer permissions normally allow downloading but owners can disable viewer downloads. Therefore anonymous view and anonymous content retrieval are not interchangeable concepts.
- Google Drive resource keys can be required for certain link-shared files and must be treated as part of link handling where supplied.
- A future HTTP/object-storage provider can reuse the PDF validation profile and normalized observation model. Its access rules and evidence remain provider-specific.
- The first release should be evaluated against a representative batch, including simulated inaccessible, inconclusive, unsupported, malformed, and valid resources. Claims about the approximately 350-resource Biblioteca collection should be made only from an actual measured run and should identify the anonymous access perspective.
- The next planning step is to break this spec into small implementation tickets, beginning with project scaffolding, schemas/input normalization, provider checking, classification/reporting, CLI wiring, and GitHub Actions documentation.
