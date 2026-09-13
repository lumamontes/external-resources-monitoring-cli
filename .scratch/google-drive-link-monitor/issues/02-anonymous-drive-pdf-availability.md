# 02: Anonymous Google Drive PDF Availability

**What to build:** A user can run the CLI against supported Google Drive file URLs and receive an observation based on anonymous bounded content retrieval and reusable PDF validation, without credentials or authenticated Drive API access.

**Blocked by:** 01: Runnable Monitor Seam With Validated Inputs.

**Status:** ready-for-agent

- [ ] The Google Drive provider recognizes supported file-sharing URL forms containing a file ID and preserves a supplied resource key where applicable.
- [ ] Drive folder URLs, malformed Drive URLs, non-Drive URLs, and unsupported Google Workspace document links are classified explicitly rather than coerced into file checks.
- [ ] The provider performs the check from an anonymous-reader perspective and does not require or accept maintainer credentials for v1 availability.
- [ ] A successful Drive viewer-page response alone is not classified as available.
- [ ] The provider attempts bounded retrieval of the expected content and passes retrieved content through the reusable PDF validation profile.
- [ ] PDF validation checks expected content metadata where available, PDF signature/content evidence, response/body limits, and incomplete retrieval.
- [ ] The provider distinguishes confirmed inaccessible content from timeouts, rate limits, provider failures, and ambiguous responses.
- [ ] Provider evidence is safe and bounded, retaining useful status, redirect, timing, and validation details without storing publication content or credentials.
- [ ] Tests use simulated network responses and cover common Drive URLs, resource keys, viewer/request-access responses, successful PDF retrieval, non-PDF responses, limits, redirects, and transient failures.
- [ ] A documented local example demonstrates checking at least one supported Drive resource without live credentials.
