# Dashboard layout

The shell composes feature-owned widgets through public slot factories. It owns
geometry and responsive presentation, never domain stores, routes or workflows.

The header breadcrumb uses Spartan's native breadcrumb and dropdown primitives.
On narrow screens it keeps home and the current page visible and moves intermediate
ancestors into an ellipsis menu.

The page header owns the route title, registered actions and optional primary
navigation. Pages register a `#pageTabs` template through `PageTabsService`; that
template uses Spartan's paginated tab list with `variant="line"`, while nested
panel and form tabs remain beside their content.

The routed-content container owns the standard `py-4 md:py-6` page spacing so
feature pages align without repeating shell geometry. Full-height sidebar
workspaces set `contentPadding: false` on their extension contribution.

## Sidebar footer

The footer composes collaboration navigation (order 0), global utilities (order 5)
and the account menu (order 10). The native footer provides padding and keeps these
destinations at the bottom independently of the scrolling body navigation.

## Sidebar extension

`provideDashboardLayoutSlots({ sidebarExtension: [...] })` accepts
`SlotFeature<SidebarExtensionContribution>` factories. Contributions declare a
component, accessible label, priority and reactive `active`/`mobileVisible` signals;
they may also disable the standard routed-content padding for a full-height workspace.
The highest-priority active contribution owns the column; no active contribution
means no reserved space. The primary sidebar remains independent and collapsible.

At 1024px and wider the extension sits between the primary sidebar and main content.
Below that breakpoint, `mobileVisible` chooses between the extension and the main
content. The contributed feature owns the navigation that switches those views.
The shell mounts the component only while active and keeps it mounted while changing
mobile visibility. Contributors must defer secondary data loading until the browser.

Use `@layouts/dashboard-layout` for the public contract and
`DASHBOARD_SIDEBAR_EXTENSION_SLOT`; do not inject feature state into the shell.
