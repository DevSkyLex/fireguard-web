# Workload Feature

## Purpose

Owns organization-local capacity, daily workload projections and read-only assignment assessments.
Intervention owns task estimates, assignments and the independent time ledger. Calendar events and
standalone inspections do not consume capacity automatically.

## Entry Points

- Route: `/organizations/:organizationId/workload`; parent organization access is required.
- `models` and `utils` publish the typed assessment contract and conflict validator.
- `ui/components` publishes the assignee workload indicator to Intervention forms.
- `ui/dialogs` publishes the explicit overload confirmation to Intervention planning and outbox review.
- Route-scoped stores; no global workload cache or SSR transfer of authenticated projections.

## State and Data Access

The API is authoritative for allocation and overload, including tasks outside paged lists.
Reads cancel obsolete windows; writes never cancel an accepted server mutation.
Capacity administration remains online and keeps its draft until successful persistence.
Calendar-date labels retain their day regardless of the device timezone; calculation
instants are formatted in the organization's IANA timezone. No client-side allocation is performed.
Member pagination and the shared collection filters are server-backed; changing filters or weeks
resets the page. Pagination never reduces a member's contributions or the assessment scope.

## Cross-Feature Dependencies

Consumes Organization's context, member-access and regional-formatting ports.
Member selectors reuse Organization's identity option mapper. The workload API returns avatars
and organization role names for its authorized member set; no broader directory permission or
additional directory request is required to render these options.
Intervention may read assessments and display their confirmation; it does not calculate capacity.
Day detail links into Intervention without owning its workflows.

## Invariants

- A missing estimate or capacity is unknown, never zero. Draft demand stays separate.
- Daily overload cannot be hidden by weekly totals. Team filters choose members, not contributions.
- Desktop uses a member-by-day Spartan table; mobile interaction mode uses a tactile day list,
  independently of viewport width. A day opens a contextual sheet.
- Zero-capacity dates shared by all displayed members hatch the full desktop column, including
  its header. Individual absences fill only their cell; missing capacity never implies absence.
- Use installed Nova primitives and semantic tokens; no outer metric cards or alternate design system.
- Initial window follows the organization's timezone and first day of week.
- Capacity forms edit hours and minutes, prefilled from the effective member or organization week;
  transport remains integer minutes. Unknown capacity is never prefilled as zero.
- Validation appears after interaction or submission, with one error per day; historical versions
  remain available separately from the current draft.
- Day details separate recorded, committed and draft contributions, expose overload and link
  unquantified work without presenting incomplete totals as confirmed availability.
- Day contributions are grouped by intervention without reallocating the API's minutes. Excluded
  work is disclosed separately and explicitly scoped to the member, not just the selected day.
- Repeating a configured working day preserves explicit zero-capacity days. Full absence is an
  explicit action; neither shortcut supplies assumed hours. Resetting edits requires confirmation.
- Saved availability exceptions remain accessible outside the collapsed weekly history.
- Work excluded from daily totals is disclosed by server reason, scoped to the current member
  page and returned unassigned work. Intervention summaries keep assignees and drafts separate;
  missing effort is never rendered as zero or combined into a misleading known total.
- An offline projection is unavailable; a saved intervention is not a global capacity snapshot.
