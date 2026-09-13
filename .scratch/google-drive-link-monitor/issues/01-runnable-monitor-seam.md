# 01: Runnable Monitor Seam With Validated Inputs

**What to build:** A user can install and run the CLI against a small CSV or JSON collection and receive a validated JSON report from a deterministic provider implementation. This establishes the smallest usable monitor path while making the provider boundary and application test seam real.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] The project runs on Node.js 22 LTS with strict TypeScript, ESM, formatting, linting, typechecking, and a test command.
- [ ] The CLI accepts a CSV or JSON collection containing stable resource IDs, URLs, optional titles, and optional validation-profile references.
- [ ] Input values are normalized, and malformed records produce actionable validation errors with row/field context where applicable.
- [ ] YAML configuration is parsed by a maintained parser and validated against a versioned JSON Schema using a mature schema validator.
- [ ] Configuration supports monitor policy, named validation profiles, provider settings, and safe defaults without manually parsing or validating nested values throughout the application.
- [ ] A provider contract can recognize a resource and return a normalized observation with provider, access perspective, outcome, reason, timing, and safe evidence.
- [ ] A deterministic provider implementation allows a valid resource to complete the full `runMonitor` path without network access.
- [ ] The application-level monitor seam accepts resources, configuration, and replaceable network/provider dependencies and returns a complete run report plus exit decision.
- [ ] The CLI emits canonical JSON output for the successful example path.
- [ ] Tests cover the public application behavior, input/configuration validation, normalized observations, and the deterministic end-to-end path without asserting internal module layout.
