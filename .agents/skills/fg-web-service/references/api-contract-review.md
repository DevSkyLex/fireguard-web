# Read-only API contract review

Bound the endpoints, frontend consumers and backend revision before comparison.
Read each repository's AGENTS.md and relevant architecture/module/feature contract;
never inspect secrets, protected environment files or JWT material.

Trace request method, route, query/header/body shape and the transport response through the
actual Hydra service and DTOs. Check resource IRIs, pagination/total semantics, omitted/null
fields, exact enum literals, status/error payloads and permission/refusal behavior.
The backend contract is evidence; fixtures and a compiling frontend type are not proof of it.

Identify which owner must change when the wire contract and a consumer disagree.
Do not redesign an endpoint, silently widen a DTO or implement a fix during this audit.
Return endpoint, both source locations, concrete failure scenario, minimal correction and
uncertainty. Transport tests prove mapping; store/UI tests prove their own boundaries.
