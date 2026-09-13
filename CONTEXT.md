# External Link Monitoring

This context defines the language for observing whether externally hosted publication resources are available to an anonymous reader. The monitor reports evidence; the consuming product owns publication and preservation decisions.

## Resources and access

**Resource**:
An externally hosted file represented by a submitted URL and identified by a stable record ID.
_Avoid_: Link, asset

**Provider**:
A service-specific way of recognizing and observing resources, such as Google Drive.
_Avoid_: Integration, plugin

**Access perspective**:
The identity and permissions under which a resource is observed. The v1 perspective is an anonymous reader with no stored credentials.
_Avoid_: User account, checker account

**Validation profile**:
A reusable description of the content a resource is expected to provide, such as a PDF profile. It is separate from the provider used to retrieve the resource.
_Avoid_: Provider rule, file type setting

## Observations

**Observation**:
The evidence established by one check of a resource from one access perspective at one point in time.
_Avoid_: Truth, status

**Available**:
An observation that establishes bounded retrieval of the expected content from the configured access perspective.
_Avoid_: Valid, public

**Inaccessible**:
An observation with provider-specific evidence that the expected content cannot be retrieved from the configured access perspective.
_Avoid_: Deleted, invalid

**Inconclusive**:
An observation that cannot determine availability because of a transient failure, provider limitation, rate limit, timeout, or ambiguous response.
_Avoid_: Broken, unavailable

**Unsupported**:
A resource that is well-formed but outside the providers or validation profiles supported by the current release.
_Avoid_: Invalid input

**Invalid input**:
A record that cannot be interpreted as a valid monitored resource, such as one with a malformed URL or missing required identity.
_Avoid_: Unsupported resource

**Availability transition**:
A meaningful change between observations for the same resource, especially a change from available to inaccessible or the reverse.
_Avoid_: Alert, notification

## Ownership

**Consumer**:
The product or workflow that uses observations and decides what action to take, such as notifying a maintainer or changing publication visibility.
_Avoid_: Monitor, provider

**Publication decision**:
An editorial or product decision about whether a publication should be visible, hidden, or restored. It is not determined by an availability observation.
_Avoid_: Availability state
