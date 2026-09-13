# 03: Reliable Batch Execution And Exit Policy

**What to build:** A maintainer can check a collection of hundreds of resources without the first problem aborting the run, receive one complete deterministic report, and use the process exit code to identify confirmed resources needing attention.

**Blocked by:** 02: Anonymous Google Drive PDF Availability.

**Status:** ready-for-human

- [x] The CLI processes every valid resource in the input batch even when other resources produce errors or unsupported outcomes.
- [x] Batch execution enforces configurable bounded concurrency.
- [x] Provider checks use configurable timeouts and bounded retries with backoff.
- [x] Responses and retrieved bodies are subject to configurable safety limits.
- [x] Results are emitted in deterministic input order, independent of completion order.
- [x] Outcomes are classified as `available`, `inaccessible`, `inconclusive`, `unsupported`, or `invalid-input` using the domain glossary definitions.
- [x] Transient timeouts, rate limits, checker failures, and ambiguous responses remain `inconclusive` rather than becoming `inaccessible`.
- [x] Default exit policy fails for `inaccessible` and `invalid-input`, while reporting `inconclusive` and `unsupported` without stopping the batch.
- [x] Exit failure categories can be changed through validated configuration, including making `unsupported` a strict failure for a Drive-only collection.
- [x] JSON output includes resource identity, provider, access perspective, outcome, reason, timing, redirect information, bounded safe evidence, and validation details.
- [x] Tests verify full-batch completion, bounded concurrency, retry limits, deterministic ordering, classification boundaries, configurable exit policy, duplicate IDs, and safe evidence limits.
- [x] The documentation explains the intended operational envelope, including that this is a bounded batch monitor rather than an unbounded crawler or high-volume scanning service.
