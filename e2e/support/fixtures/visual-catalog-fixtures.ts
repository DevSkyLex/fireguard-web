import type {
  AutomationAttemptOutput,
  AutomationPolicyOutput,
} from '../../../src/app/features/organization/features/automations/models/automation/automation-output.interface';
import type { CalendarFeedItemOutput } from '../../../src/app/features/organization/features/calendar/models/calendar-feed/calendar-feed-item-output.interface';
import type { ChecklistOutput } from '../../../src/app/features/organization/features/checklists/models/checklist/checklist-output.interface';
import type { WebhookDeliveryOutput } from '../../../src/app/features/organization/features/webhooks/models/delivery/webhook-delivery-output.interface';
import type { WebhookSubscriptionOutput } from '../../../src/app/features/organization/features/webhooks/models/subscription/webhook-subscription-output.interface';
import type { TeamOutput } from '../../../src/app/features/organization/models/team/team-output.interface';
import { E2E_ORGANIZATION_ID } from './api-fixtures';

/**
 * Function visualCatalogFixtures
 * @description Populates read-only catalogs with source-contract fixtures and a local-noon
 * calendar date. No create/edit endpoints or backend records are introduced.
 * @access public
 * @since 1.0.0
 * @returns {object} Typed, bounded visual catalogs including automation and webhook outcomes.
 */
export function visualCatalogFixtures(): {
  teams: TeamOutput[];
  checklists: ChecklistOutput[];
  calendar: CalendarFeedItemOutput[];
  automationPolicy: AutomationPolicyOutput;
  automationAttempts: AutomationAttemptOutput[];
  webhookSubscriptions: WebhookSubscriptionOutput[];
  webhookDeliveries: WebhookDeliveryOutput[];
} {
  const now = new Date();
  const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString();
  return {
    automationPolicy: {
      '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/automation`,
      '@type': 'AutomationPolicy',
      id: E2E_ORGANIZATION_ID,
      ruleKey: 'auto_create_intervention_on_critical_nc',
      enabled: true,
      canManage: true,
    },
    automationAttempts: [
      {
        '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/automation/attempts/e2e-visual-attempt`,
        '@type': 'AutomationAttempt',
        id: 'e2e-visual-attempt',
        runId: 'e2e-visual-run',
        organizationId: E2E_ORGANIZATION_ID,
        ruleKey: 'auto_create_intervention_on_critical_nc',
        subjectId: 'NC-NORTH-WING-EVACUATION-ROUTE-2026-001',
        attemptNumber: 1,
        status: 'failed',
        createdAt: noon,
        finishedAt: noon,
        requestedBy: null,
        interventionId: null,
        errorCode: 'automation_action_failed',
        canRetry: true,
      },
    ],
    webhookSubscriptions: [
      {
        '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/webhooks/e2e-visual-webhook`,
        '@type': 'WebhookSubscription',
        id: 'e2e-visual-webhook',
        organizationId: E2E_ORGANIZATION_ID,
        url: 'https://receiver.example.com/fireguard/north-wing-inspection-results',
        description: 'North wing inspection and corrective intervention receiver',
        eventTypes: ['inspection.submitted', 'intervention.published'],
        isActive: true,
        createdAt: noon,
        updatedAt: noon,
      },
    ],
    webhookDeliveries: [
      {
        '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/webhooks/e2e-visual-webhook/deliveries/e2e-visual-delivery`,
        '@type': 'WebhookDelivery',
        id: 'e2e-visual-delivery',
        subscriptionId: 'e2e-visual-webhook',
        eventType: 'inspection.submitted',
        status: 'failed',
        attempts: 5,
        httpStatus: 503,
        errorCode: 'webhook_http_error',
        createdAt: noon,
      },
    ],
    teams: [
      {
        '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/teams/e2e-visual-team`,
        '@type': 'Team',
        id: 'e2e-visual-team',
        organizationId: E2E_ORGANIZATION_ID,
        name: 'North wing fire safety and maintenance',
        description: 'Inspection coordination across the depot and adjoining technical rooms.',
        memberCount: 12,
        createdAt: noon,
        updatedAt: noon,
      },
    ],
    checklists: [
      {
        '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/checklists/e2e-visual-checklist`,
        '@type': 'Checklist',
        id: 'e2e-visual-checklist',
        organizationId: E2E_ORGANIZATION_ID,
        name: 'Monthly extinguisher and evacuation-route inspection',
        version: '2',
        status: 'active',
        items: [
          {
            id: 'e2e-visual-item-1',
            label: 'Verify access and signage',
            description: null,
            required: true,
            position: 1,
          },
          {
            id: 'e2e-visual-item-2',
            label: 'Record pressure and inspection label',
            description: null,
            required: true,
            position: 2,
          },
        ],
        createdAt: noon,
        updatedAt: noon,
      },
    ],
    calendar: [
      {
        sourceKey: 'calendar_event',
        id: 'e2e-visual-calendar',
        title: 'North wing evacuation exercise and equipment inspection',
        description: 'Coordinate access with the maintenance team.',
        startsAt: noon,
        endsAt: new Date(Date.parse(noon) + 3_600_000).toISOString(),
        allDay: false,
        targetType: 'calendar_event',
        targetId: 'e2e-visual-calendar',
      },
    ],
  };
}
