# 04: Maintainer Report And GitHub Actions Workflow

**What to build:** A repository maintainer can schedule the monitor in GitHub Actions, receive workflow failure notifications for confirmed attention-needed resources, inspect uploaded JSON results, and optionally generate a Markdown report for quick human review.

**Blocked by:** 03: Reliable Batch Execution And Exit Policy.

**Status:** ready-for-agent

- [ ] The CLI can optionally generate a Markdown report alongside the canonical JSON output.
- [ ] The Markdown report summarizes totals, available resources, inaccessible resources, inconclusive checks, unsupported resources, invalid input, and actionable reasons.
- [ ] The report does not claim that inaccessible resources were deleted or that inconclusive checks were broken resources.
- [ ] The repository includes a copyable GitHub Actions workflow that installs and runs the public CLI against repository-owned CSV or JSON input.
- [ ] The workflow supports scheduled execution and a manually triggered run for investigation.
- [ ] The workflow passes validated YAML configuration and supports the documented output options.
- [ ] The workflow uploads JSON and optional Markdown reports as artifacts, including when the check reports attention-needed outcomes.
- [ ] The workflow relies on the CLI exit code for notifications and does not require anonymous-check credentials.
- [ ] Documentation explains local reproduction, repository input setup, configuration defaults, output interpretation, report retention, and operational limits.
- [ ] The public example uses redacted or synthetic/appropriately licensed data rather than the live Biblioteca collection.
- [ ] Tests cover Markdown rendering, output consistency, CLI output selection, process exit behavior, and workflow invocation without live external checks.
- [ ] The release documentation clearly defers durable cross-run state and signed transition webhooks to a later milestone.
