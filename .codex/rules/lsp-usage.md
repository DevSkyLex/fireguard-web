# Code intelligence in Codex

For symbol changes, inspect references before editing and diagnostics afterwards. Prefer
the available Serena MCP: initialize it according to its tool instructions, then use
find_symbol, find_referencing_symbols, find_declaration or find_implementations as appropriate.
For a published port, query its injection token rather than assuming an implements edge.

Discover actual tool names from the current session. Configuring a server does not prove it
is connected. When unavailable, use rg and the compiler/tests and disclose the limitation.
For a suspiciously empty cold result, retry once, then cross-check instead of polling forever.
Include template and spec consumers where relevant; no fixed reference count is a guarantee.

Read HTML templates directly. Do not run symbol overviews on HTML: the element/class output
is noisy. Use rg for class strings, routes, translation IDs and markdown. The Angular language
server does not validate tooling .mjs/.py/.toml files; use their own parser/test runner.
