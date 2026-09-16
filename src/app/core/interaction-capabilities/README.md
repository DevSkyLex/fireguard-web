# Interaction capabilities

Consumers inject `INTERACTION_CAPABILITIES_PORT` and read `interactionMode`, `isMobileInteractionMode` or the shared
`shortcutModifier` signal. The public barrel exposes that contract, its models and
`provideInteractionCapabilities`; the concrete service is internal to this concern and has no
public readiness flag.

The provider binds the port with `useExisting`, so startup and consumers share one
adapter. Per-request SSR uses conservative user-agent and client-hint evidence, then
passes that initial mode through Angular `TransferState`. Unknown, contradictory and
request-less contexts remain desktop. Browser capability detection reconciles once
after rendering, without persisting evidence or using viewport dimensions or changes. The same
one-time capability sample resolves Windows/Linux `Ctrl` versus Apple `⌘` labels so remounted
menus agree.

Desktop-style iPad user agents and strongly identity-protected browsers cannot always
be classified during SSR. They deliberately remain desktop until browser evidence is
available; this avoids turning an ordinary narrow desktop window into a mobile shell.
