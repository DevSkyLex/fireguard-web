# Comments and docblocks

Read [the shared comment convention](../../docs/guides/code-comments.md) before
editing authored source comments. It owns content, required tags, formatter
behavior, scoped commands and progressive migration. Preserve executable code
and verified metadata; do not copy legacy shorthand or invent historical tags.

Put `@description` alone on its line, with prose on the following line. Document
properties, methods and functions at their declarations; use balanced `Properties`,
`Constructor` and `Methods` regions for the class groups that exist.
Keep anonymous inline types free of added docblocks; document their enclosing
declaration instead. Named interfaces and type aliases can document their members.
Separate documented members with one blank line, except the first member in a
class or region. Remove duplicate/empty regions and duplicate docblocks; inspect
the final declarations and prose after formatting.
