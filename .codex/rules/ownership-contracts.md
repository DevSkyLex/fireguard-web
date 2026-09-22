# Ownership and public contracts

Before changing a feature boundary, read ARCHITECTURE.md §4–§8 and the owner/parent FEATURE.md.
The strongest business invariant decides ownership; provider scope and rendering location do not.

Keep ports with their owner, bind existing implementations with `useExisting`, and publish only
approved stable APIs. Consumers cross concern/feature boundaries through aliases and documented
barrels. A new cross-feature dependency must be permitted by the owning contracts.
Update FEATURE.md for changed routes, public APIs, dependencies or invariants; keep it normative.

Use `fg-web-feature` and its feature-documentation reference. Do not copy the folder tree or
implementation history into a contract, and do not create empty concern folders.
