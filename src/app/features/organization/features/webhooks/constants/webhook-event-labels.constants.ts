/**
 * Constant WEBHOOK_EVENT_LABELS
 *
 * @description
 * Localized labels for the backend's curated, finite webhook event
 * allowlist (`WebhookEventCatalog::allowedEventTypes()`). The backend's own
 * catalog label is mechanically derived (`ucwords(str_replace(...))`), so it
 * is never localized — this map is what actually reads in the reader's
 * language. An event type added to the allowlist without a matching entry
 * here still renders: {@link resolveWebhookEventLabel} falls back to the
 * catalog label, then to the raw key.
 *
 * @since 1.0.0
 *
 * @type {Readonly<Record<string, string>>}
 */
export const WEBHOOK_EVENT_LABELS: Readonly<Record<string, string>> = {
  'equipment.equipment_commissioned_event': $localize`:@@webhooks.event.equipmentCommissioned:Equipment commissioned`,
  'equipment.equipment_decommissioned_event': $localize`:@@webhooks.event.equipmentDecommissioned:Equipment decommissioned`,
  'equipment.equipment_put_under_maintenance_event': $localize`:@@webhooks.event.equipmentPutUnderMaintenance:Equipment put under maintenance`,
  'equipment.equipment_returned_to_stock_event': $localize`:@@webhooks.event.equipmentReturnedToStock:Equipment returned to stock`,
  'inspection.inspection_submitted_event': $localize`:@@webhooks.event.inspectionSubmitted:Inspection submitted`,
  'inspection.inspection_closed_event': $localize`:@@webhooks.event.inspectionClosed:Inspection closed`,
  'inspection.non_conformity_recorded_event': $localize`:@@webhooks.event.nonConformityRecorded:Non-conformity recorded`,
  'inspection.non_conformity_status_changed_event': $localize`:@@webhooks.event.nonConformityStatusChanged:Non-conformity status changed`,
  'intervention.intervention_published_event': $localize`:@@webhooks.event.interventionPublished:Intervention published`,
  'maintenance.maintenance_campaign_generated_event': $localize`:@@webhooks.event.maintenanceCampaignGenerated:Maintenance campaign generated`,
  'facility.facility_created_event': $localize`:@@webhooks.event.facilityCreated:Facility created`,
  'facility.facility_archived_event': $localize`:@@webhooks.event.facilityArchived:Facility archived`,
  'facility.facility_restored_event': $localize`:@@webhooks.event.facilityRestored:Facility restored`,
  'facility.facility_updated_event': $localize`:@@webhooks.event.facilityUpdated:Facility updated`,
};
