import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { E2E_EQUIPMENT_ID } from '../fixtures/equipment-fixtures';
import { E2E_FACILITY_ID } from '../fixtures/facility-fixtures';
import { E2E_INSPECTION_ID } from '../fixtures/inspection-fixtures';
import { E2E_MEMBER_ID } from '../fixtures/member-fixtures';
import { E2E_VISUAL_CHECKLIST_ID } from '../fixtures/visual-catalog-fixtures';
import { INTERACTION_MODE_INTERVENTIONS } from './interaction-mode';
import type { VisualPass } from './visual-run';

/**
 * Constant MOBILE_VISUAL_MODES
 * @description Stable device, viewport and theme identities shared by selection and reporting.
 * @since 1.0.0
 */
export const MOBILE_VISUAL_MODES = [
  { name: 'phone-390-light', width: 390, height: 844, mobile: true, theme: 'light', full: true },
  { name: 'phone-390-dark', width: 390, height: 844, mobile: true, theme: 'dark', full: true },
  { name: 'phone-375-light', width: 375, height: 812, mobile: true, theme: 'light', full: false },
  { name: 'phone-458-dark', width: 458, height: 915, mobile: true, theme: 'dark', full: false },
  { name: 'tablet-1024-dark', width: 1024, height: 1366, mobile: true, theme: 'dark', full: false },
  {
    name: 'desktop-375-light',
    width: 375,
    height: 844,
    mobile: false,
    theme: 'light',
    full: false,
  },
  {
    name: 'desktop-1440-dark',
    width: 1440,
    height: 1000,
    mobile: false,
    theme: 'dark',
    full: false,
  },
  {
    name: 'desktop-1280-light',
    width: 1280,
    height: 800,
    mobile: false,
    theme: 'light',
    full: true,
  },
  { name: 'phone-375-dark', width: 375, height: 812, mobile: true, theme: 'dark', full: true },
] as const;

/**
 * Interface MobileVisualRoute
 * @interface MobileVisualRoute
 * @description One source-backed route and the read that must finish before its capture.
 * @since 1.0.0
 */
export interface MobileVisualRoute {
  readonly id: string;
  readonly path: string;
  readonly root: string;
  readonly endpoint?: string;
  readonly text?: string;
  readonly openForm?: boolean;
  readonly limit?: string;
}

const org = `/organizations/${E2E_ORGANIZATION_ID}`;
const api = `/api/organizations/${E2E_ORGANIZATION_ID}`;

/**
 * Constant MOBILE_VISUAL_ROUTES
 * @description Primary and More destinations plus the requested intervention and messaging
 * open surfaces. Paths follow organization-mobile-navigation.config.ts, organization.routes.ts,
 * collaboration.routes.ts, channels.routes.ts and account.routes.ts; Billing and Roles are tabs.
 * @since 1.0.0
 */
export const MOBILE_VISUAL_ROUTES: readonly MobileVisualRoute[] = [
  { id: 'home', path: org, root: '#organization-dashboard', endpoint: `${api}/dashboard` },
  {
    id: 'more',
    path: `${org}/more`,
    root: '#organization-more-page',
    text: 'Current organization',
  },
  {
    id: 'interventions',
    path: `${org}/interventions`,
    root: '#interventions',
    endpoint: '/api/interventions',
    text: INTERACTION_MODE_INTERVENTIONS[0].name,
  },
  {
    id: 'intervention-detail',
    path: `${org}/interventions/${INTERACTION_MODE_INTERVENTIONS[0].id}`,
    root: '#intervention-detail',
    endpoint: `/api/interventions/${INTERACTION_MODE_INTERVENTIONS[0].id}`,
  },
  {
    id: 'intervention-form',
    path: `${org}/interventions`,
    root: '[data-testid="intervention-create-sheet"]',
    openForm: true,
    endpoint: '/api/interventions',
  },
  {
    id: 'assets',
    path: `${org}/assets`,
    root: '#organization-assets',
    endpoint: `${api}/facilities`,
  },
  { id: 'equipment', path: `${org}/equipments`, root: '#equipments', endpoint: `${api}/equipment` },
  {
    id: 'equipment-detail',
    path: `${org}/equipments/${E2E_EQUIPMENT_ID}`,
    root: '#equipment-detail',
    endpoint: `${api}/equipment/${E2E_EQUIPMENT_ID}`,
    limit:
      'Overview tab only — the Attachments/Maintenance/Tags tabs have no `?tab=` query support to deep-link into.',
  },
  {
    id: 'facilities',
    path: `${org}/facilities`,
    root: '#facilities',
    endpoint: `${api}/facilities`,
  },
  {
    id: 'facility-detail',
    path: `${org}/facilities/${E2E_FACILITY_ID}`,
    root: '#facility-detail',
    endpoint: `${api}/facilities/${E2E_FACILITY_ID}`,
  },
  {
    id: 'facility-map',
    path: `${org}/facilities/map`,
    root: '#facility-map',
    endpoint: `${api}/facilities`,
  },
  {
    id: 'facility-3d',
    path: `${org}/facilities/${E2E_FACILITY_ID}/3d`,
    root: '#facility-building-3d',
    endpoint: `${api}/facilities/${E2E_FACILITY_ID}/building-model`,
    limit:
      'WebGL support is environment-dependent; the empty/unsupported states are legitimate captures.',
  },
  {
    id: 'inspections',
    path: `${org}/inspections`,
    root: '#inspections',
    endpoint: `${api}/inspections`,
  },
  {
    id: 'inspection-detail',
    path: `${org}/inspections/${E2E_INSPECTION_ID}`,
    root: '#inspection-detail',
    endpoint: `${api}/inspections/${E2E_INSPECTION_ID}`,
  },
  {
    id: 'inspection-analytics',
    path: `${org}/inspections/analytics`,
    root: '#inspection-analytics',
    endpoint: `${api}/non-conformities/statistics`,
  },
  {
    id: 'workload',
    path: `${org}/workload`,
    root: '[data-testid="workload-page"]',
    endpoint: `${api}/workload`,
    limit: 'Projection overview only; capacity editing and day details are not exercised.',
  },
  {
    id: 'checklists',
    path: `${org}/checklists`,
    root: '#checklists',
    endpoint: `${api}/checklists`,
    text: 'Monthly extinguisher and evacuation-route inspection',
    limit: 'One populated template with two items; editing and archiving are not exercised.',
  },
  {
    id: 'checklist-detail',
    path: `${org}/checklists/${E2E_VISUAL_CHECKLIST_ID}`,
    root: '[data-testid="checklist-detail-page"]',
    endpoint: `${api}/checklists/${E2E_VISUAL_CHECKLIST_ID}`,
  },
  {
    id: 'maintenance',
    path: `${org}/maintenance`,
    root: '#maintenance-schedules',
    endpoint: '/api/maintenance/schedules',
  },
  {
    id: 'calendar',
    path: `${org}/calendar`,
    root: '#calendar-page',
    endpoint: `${api}/calendar/feed`,
    limit: 'One current-day event at local noon; editing, drag and subscription are not exercised.',
  },
  {
    id: 'approvals',
    path: `${org}/approvals`,
    root: '#approvals',
    endpoint: `${api}/approval-requests`,
  },
  {
    id: 'automations',
    path: `${org}/automations`,
    root: '[data-testid="automation-attempt"]',
    endpoint: `${api}/automation/runs`,
    text: 'This attempt could not complete the action.',
    limit: 'Enabled policy and one failed attempt; retry and policy editing are not exercised.',
  },
  {
    id: 'webhooks',
    path: `${org}/integrations/webhooks`,
    root: '[data-testid="webhook-delivery-e2e-visual-delivery"]',
    endpoint: `${api}/webhooks/e2e-visual-webhook/deliveries`,
    text: 'HTTP 503',
    limit:
      'One active subscription and failed delivery; mutations and signing secrets are not exercised.',
  },
  {
    id: 'imports',
    path: `${org}/imports`,
    root: '#imports',
    endpoint: '/api/imports',
    text: 'equipment-batch.csv',
  },
  {
    id: 'messages',
    path: `${org}/messages`,
    root: '[data-testid="direct-messages-panel-row"]',
    endpoint: '/api/direct-conversations',
  },
  {
    id: 'direct-conversation',
    path: `${org}/messages/e2e-direct-2`,
    root: '[data-testid="message-thread"]',
    endpoint: '/api/direct-conversations',
  },
  {
    id: 'saved-messages',
    path: `${org}/messages/saved`,
    root: '[data-testid="saved-messages-list"]',
    text: 'Saved inspection handover:',
    endpoint: '/api/saved-messages',
    limit: 'One saved message with its resolved direct conversation; unsave is not exercised.',
  },
  {
    id: 'channels',
    path: `${org}/channels`,
    root: '[data-testid="channels-list"]',
    endpoint: '/api/channels',
    text: 'general',
  },
  {
    id: 'channel-conversation',
    path: `${org}/channels/e2e-channel-1`,
    root: '[data-testid="message-thread"]',
    endpoint: '/api/channels/e2e-channel-1',
  },
  {
    id: 'members',
    path: `${org}/members`,
    root: '#organization-members',
    endpoint: `${api}/members`,
  },
  {
    id: 'member-profile',
    path: `${org}/members/${E2E_MEMBER_ID}`,
    root: '#organization-member-profile',
    endpoint: `${api}/members`,
    text: 'Ella Uzer',
  },
  {
    id: 'teams',
    path: `${org}/members?tab=teams`,
    root: '#organization-teams',
    endpoint: `${api}/teams`,
    text: 'North wing fire safety and maintenance',
    limit: 'One populated team with a long label and member count; editing is not exercised.',
  },
  {
    id: 'roles',
    path: `${org}/members?tab=roles`,
    root: '#organization-team',
    endpoint: `${api}/roles`,
  },
  {
    id: 'settings',
    path: `${org}/settings`,
    root: '#organization-settings',
    endpoint: '/api/organizations/legal-types',
  },
  {
    id: 'billing',
    path: `${org}/settings?tab=subscription`,
    root: '#organization-settings',
    endpoint: `${api}/billing/subscription`,
  },
  {
    id: 'audit',
    path: `${org}/audit`,
    root: '#audit-page',
    endpoint: `${api}/audit-events`,
    text: 'Jamie Rivera',
  },
  { id: 'profile', path: '/account/profile', root: '#account-profile', endpoint: '/api/me' },
  {
    id: 'security',
    path: '/account/security',
    root: '#account-security',
    endpoint: '/api/auth/federated/connections',
    limit:
      'Password-enabled account; sessions, trusted devices and provider catalogs are empty. No security actions.',
  },
  {
    id: 'notifications',
    path: '/account/notifications',
    root: '#account-notifications',
    endpoint: '/api/notification-types',
  },
  {
    id: 'notification-preferences',
    path: '/account/notifications?tab=preferences',
    root: '[data-testid="notif-pref-empty"]',
    endpoint: '/api/notifications/preferences',
    limit: 'Empty category catalog; populated delivery switch matrix is not covered.',
  },
  {
    id: 'account-organizations',
    path: '/account/organizations',
    root: '#account-organizations',
    endpoint: '/api/organizations',
    text: 'E2E Organization',
  },
  {
    id: 'organization-select',
    path: '/organizations/select',
    root: 'section[aria-label="Choose an organization"]',
    endpoint: '/api/organizations',
    text: 'E2E Organization',
  },
];

/**
 * Constant REPRESENTATIVE_VISUAL_ROUTES
 * @description Covers chart, navigation hub, long list data, open form, calendar, conversation,
 * administration and account composition at additional widths without repeating all routes.
 * @since 1.0.0
 */
export const REPRESENTATIVE_VISUAL_ROUTES = new Set([
  'home',
  'more',
  'automations',
  'webhooks',
  'interventions',
  'intervention-form',
  'calendar',
  'direct-conversation',
  'members',
  'profile',
]);

/**
 * Function selectVisualRoutes
 * @description Selects scenarios solely from the explicit pass, never the run directory name.
 * @access public
 * @since 1.0.0
 * @param {(typeof MOBILE_VISUAL_MODES)[number]} mode - Device and theme to inspect.
 * @param {VisualPass} pass - Inspection or the bounded confirmation selection.
 * @returns {MobileVisualRoute[]} The actual selected route matrix.
 */
export function selectVisualRoutes(
  mode: (typeof MOBILE_VISUAL_MODES)[number],
  pass: VisualPass,
): MobileVisualRoute[] {
  return MOBILE_VISUAL_ROUTES.filter((route) =>
    pass === 'confirmation'
      ? isConfirmationRoute(mode.name, route.id)
      : mode.full || REPRESENTATIVE_VISUAL_ROUTES.has(route.id),
  );
}

/**
 * Function isConfirmationRoute
 * @description Selects the bounded remaining-risk subset, including Home in every mode.
 * @access public
 * @since 1.0.0
 * @param {string} mode - Existing viewport/theme identity.
 * @param {string} route - Existing matrix route identity.
 * @returns {boolean} Whether this combination covers a remaining review risk.
 */
export function isConfirmationRoute(mode: string, route: string): boolean {
  if (route === 'home') return true;
  if (mode.startsWith('phone-390-'))
    return [
      'equipment',
      'imports',
      'messages',
      'direct-conversation',
      'saved-messages',
      'channels',
      'channel-conversation',
      'settings',
      'members',
    ].includes(route);
  if (mode === 'desktop-375-light')
    return ['direct-conversation', 'intervention-form'].includes(route);
  return mode === 'desktop-1440-dark' && route === 'profile';
}
