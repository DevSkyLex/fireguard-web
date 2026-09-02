import type { Locator, Page } from '@playwright/test';

/**
 * Page object FacilitiesPage
 *
 * @description
 * Wraps the facility list, create and detail routes
 * (`/organizations/:organizationId/facilities*`) behind named locators and
 * one method per user intent.
 */
export class FacilitiesPage {
  public constructor(private readonly page: Page) {}

  public readonly listRoot: Locator = this.page.locator('#facilities');
  public readonly createRoot: Locator = this.page.getByTestId('facility-create-sheet');
  public readonly detailRoot: Locator = this.page.locator('#facility-detail');

  public readonly search: Locator = this.page.getByTestId('facilities-search');
  public readonly filtersToggle: Locator = this.page.getByTestId('facilities-filters-toggle');
  public readonly addFilterTrigger: Locator = this.page.getByTestId('facilities-filters-add');
  public readonly clearFiltersButton: Locator = this.page.getByTestId('facilities-clear-filters');
  public readonly archivedCheckbox: Locator = this.page.getByTestId('facilities-filter-archived');
  public readonly newLink: Locator = this.page.getByTestId('facilities-new');
  public readonly layoutToggle: Locator = this.page.getByTestId('facilities-layout-toggle');
  public readonly listViewToggle: Locator = this.page.getByTestId('facilities-layout-list');
  public readonly gridViewToggle: Locator = this.page.getByTestId('facilities-layout-grid');
  public readonly rowCount: Locator = this.page.getByTestId('facilities-row-count');
  public readonly pageIndicator: Locator = this.page.getByTestId('facilities-page-indicator');
  public readonly pageNext: Locator = this.page.getByTestId('facilities-page-next');
  public readonly tableRows: Locator = this.page.getByTestId('facility-table-row');
  public readonly rowMenu: Locator = this.page.getByTestId('facility-table-row-menu');

  public readonly listMapToggle: Locator = this.page.getByTestId('facilities-layout-map');

  public readonly createTypeSelect: Locator = this.page.getByTestId('facility-create-type');
  public readonly createName: Locator = this.page.getByTestId('facility-create-name');
  public readonly createLatitude: Locator = this.page.getByTestId('facility-create-latitude');
  public readonly createLongitude: Locator = this.page.getByTestId('facility-create-longitude');
  public readonly createSubmit: Locator = this.page.getByTestId('facility-create-submit');
  public readonly createPickOnMap: Locator = this.page.getByTestId('facility-create-pick-on-map');

  public readonly mapRoot: Locator = this.page.locator('#facility-map');
  public readonly mapUnplacedBanner: Locator = this.page.getByTestId(
    'facility-map-unplaced-banner',
  );
  public readonly mapBackToList: Locator = this.page.getByTestId('facility-map-back');
  public readonly mapMarkers: Locator = this.page.locator('[data-marker-id]');
  public readonly pickerDialog: Locator = this.page.getByTestId('facility-map-picker-dialog');
  public readonly pickerMap: Locator = this.page.getByTestId('facility-map-picker-map');
  public readonly mapComplianceToggle: Locator = this.page
    .getByTestId('facility-map-compliance-toggle')
    .getByRole('switch');
  public readonly mapWorstSites: Locator = this.page.getByTestId('facility-map-worst-sites');
  public readonly mapWorstSiteRows: Locator = this.page.getByTestId('facility-map-worst-site');

  public readonly detailLoading: Locator = this.page.getByTestId('facility-detail-loading');
  public readonly moreMenu: Locator = this.page.getByTestId('facility-detail-menu');
  public readonly newSubFacilityAction: Locator = this.page.getByTestId(
    'facility-detail-new-sub-facility',
  );
  public readonly deleteAction: Locator = this.page.getByTestId('facility-detail-delete');
  public readonly qrAction: Locator = this.page.getByTestId('facility-detail-qr');
  public readonly qrDialog: Locator = this.page.getByTestId('facility-qr-dialog');
  public readonly qrPrint: Locator = this.page.getByTestId('facility-qr-print');
  public readonly qrDownload: Locator = this.page.getByTestId('facility-qr-download');
  public readonly overviewTab: Locator = this.page.getByTestId('facility-tab-overview');
  public readonly informationTab: Locator = this.page.getByTestId('facility-tab-information');
  public readonly plansTab: Locator = this.page.getByTestId('facility-tab-plans');
  public readonly hierarchyNodes: Locator = this.page.getByTestId('facility-hierarchy-node');
  public readonly hierarchyToggles: Locator = this.page.getByTestId('tree-toggle');
  public readonly nameField: Locator = this.page.getByTestId('facility-field-name');
  public readonly typeField: Locator = this.page.getByTestId('facility-field-type');
  public readonly parentField: Locator = this.page.getByTestId('facility-field-parent');

  public readonly plansEmpty: Locator = this.page.getByTestId('facility-plans-empty');
  public readonly plansUpload: Locator = this.page.getByTestId('facility-plans-upload');
  public readonly planViewer: Locator = this.page.getByTestId('facility-plan-viewer');
  public readonly planPickerTrigger: Locator = this.page.getByTestId(
    'facility-plan-picker-trigger',
  );
  public readonly planRows: Locator = this.page.getByTestId('facility-plan-row');
  public readonly planPrimaryBadge: Locator = this.page.getByTestId('facility-plan-primary-badge');
  public readonly planMenuTrigger: Locator = this.page.getByTestId('facility-plan-menu-trigger');
  public readonly planSetPrimary: Locator = this.page.getByTestId('facility-plan-set-primary');
  public readonly planDelete: Locator = this.page.getByTestId('facility-plan-delete');
  public readonly planDeleteConfirm: Locator = this.page.getByTestId(
    'facility-plan-delete-confirm',
  );

  public readonly overlayToggles: Locator = this.page.getByTestId('facility-plan-toolbar');
  public readonly overlayToggleZones: Locator = this.page.getByTestId('facility-plan-toggle-zones');
  public readonly overlayToggleEquipment: Locator = this.page.getByTestId(
    'facility-plan-toggle-equipment',
  );
  public readonly overlayZones: Locator = this.page.getByTestId('facility-plan-overlay-zone');
  public readonly overlayEquipment: Locator = this.page.getByTestId(
    'facility-plan-overlay-equipment',
  );

  public readonly editorToolbar: Locator = this.page.getByTestId('facility-plan-toolbar');
  public readonly drawZonePicker: Locator = this.page.getByTestId(
    'facility-plan-editor-draw-zone-picker',
  );
  public readonly placePinPicker: Locator = this.page.getByTestId(
    'facility-plan-editor-place-pin-picker',
  );
  public readonly editorStatus: Locator = this.page.getByTestId('facility-plan-editor-status');
  public readonly editorUndo: Locator = this.page.getByTestId('facility-plan-editor-undo');
  public readonly editorClosePolygon: Locator = this.page.getByTestId(
    'facility-plan-editor-close-polygon',
  );
  public readonly editorCancel: Locator = this.page.getByTestId('facility-plan-editor-cancel');
  public readonly editorEnterCoordinates: Locator = this.page.getByTestId(
    'facility-plan-editor-enter-coordinates',
  );
  public readonly editorEnterPosition: Locator = this.page.getByTestId(
    'facility-plan-editor-enter-position',
  );
  public readonly editorStage: Locator = this.page.getByTestId('facility-plan-editor-stage');
  public readonly zoneList: Locator = this.page.getByTestId('facility-zone-list');
  public readonly zoneOptions: Locator = this.page.getByTestId('facility-zone-list-option');
  public readonly equipmentList: Locator = this.page.getByTestId('facility-plan-equipment-list');
  public readonly equipmentOptions: Locator = this.page.getByTestId(
    'facility-plan-equipment-list-option',
  );

  /**
   * The selection detail block, and its actions.
   *
   * Editing is no longer offered from a standalone list: a zone or an
   * equipment item is selected first, and its own detail block carries the
   * actions. `selectZone`/`selectEquipment` below do that first step, so a
   * spec reads the way a user works rather than reaching for a button that
   * only exists once something is picked.
   */
  public readonly planDetail: Locator = this.page.getByTestId('facility-plan-detail');
  public readonly zoneEditButton: Locator = this.page.getByTestId('facility-plan-detail-edit');
  public readonly pinEditButton: Locator = this.page.getByTestId('facility-plan-detail-edit');
  public readonly pinRemoveButton: Locator = this.page.getByTestId('facility-plan-detail-remove');
  public readonly planDetailViewRecord: Locator = this.page.getByTestId(
    'facility-plan-detail-view-record',
  );

  public readonly zoneGeometryDialog: Locator = this.page.getByTestId(
    'facility-plan-zone-geometry-dialog',
  );
  public readonly zoneGeometryRows: Locator = this.page.getByTestId(
    'facility-plan-zone-geometry-row',
  );
  public readonly zoneGeometrySubmit: Locator = this.page.getByTestId(
    'facility-plan-zone-geometry-submit',
  );
  public readonly zoneGeometryClear: Locator = this.page.getByTestId(
    'facility-plan-zone-geometry-clear',
  );

  public readonly pinPositionDialog: Locator = this.page.getByTestId(
    'facility-plan-pin-position-dialog',
  );
  public readonly pinPositionX: Locator = this.page.getByTestId('facility-plan-pin-position-x');
  public readonly pinPositionY: Locator = this.page.getByTestId('facility-plan-pin-position-y');
  public readonly pinPositionSubmit: Locator = this.page.getByTestId(
    'facility-plan-pin-position-submit',
  );
  public readonly pinPositionRemove: Locator = this.page.getByTestId(
    'facility-plan-pin-position-remove',
  );

  /**
   * Picks a zone in the panel's roster, which is what opens its detail block.
   *
   * @param index - Zero-based position in the roster.
   */
  public async selectZone(index = 0): Promise<void> {
    await this.zoneOptions.nth(index).click();
    await this.planDetail.waitFor({ state: 'visible' });
  }

  /**
   * Picks an equipment item in the panel's roster. Same two-step as
   * {@link selectZone}: nothing is editable until something is selected.
   *
   * @param index - Zero-based position in the roster.
   */
  public async selectEquipment(index = 0): Promise<void> {
    await this.equipmentOptions.nth(index).click();
    await this.planDetail.waitFor({ state: 'visible' });
  }

  public async gotoList(organizationId: string, query = ''): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/facilities${query}`);
  }

  /** Lands on the list with the creation sheet open — `?create=1` is the deep link the retired `/create` page redirects to. */
  public async gotoCreate(organizationId: string, query = ''): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/facilities?create=1${query}`);
  }

  public async gotoDetail(organizationId: string, facilityId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/facilities/${facilityId}`);
  }

  public async gotoMap(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/facilities/map`);
  }

  /** Submits the create form empty, so only the required `type`/`name` rules fire. */
  public async submitEmptyCreateForm(): Promise<void> {
    await this.createSubmit.click();
  }

  /** Expands the hierarchy chart's root node, revealing its already-loaded children. */
  public async expandHierarchyRoot(): Promise<void> {
    await this.hierarchyToggles.first().click();
  }

  /**
   * Opens the toolbar's plan picker, which holds the plan list.
   *
   * The list stopped being a column of its own: it left the plan itself
   * 281 px wide at a 1280 px viewport, so it moved behind this trigger.
   * Idempotent — a picker already open is left alone.
   */
  public async openPlanPicker(): Promise<void> {
    if ((await this.planPickerTrigger.getAttribute('aria-expanded')) === 'true') return;

    await this.planPickerTrigger.click();
    await this.page.getByTestId('facility-plan-list').waitFor({ state: 'visible' });
  }

  /** Closes the toolbar's plan picker, so the plan underneath it is reachable again. */
  public async closePlanPicker(): Promise<void> {
    if ((await this.planPickerTrigger.getAttribute('aria-expanded')) !== 'true') return;

    await this.page.keyboard.press('Escape');
    await this.page.getByTestId('facility-plan-list').waitFor({ state: 'hidden' });
  }

  /**
   * Sets a file on the Plans tab's hidden upload input, bypassing the picker dialog.
   *
   * The list lives behind the toolbar's picker once a plan exists, and
   * directly inside the empty state before that — so the picker is opened
   * only when there is one to open.
   */
  public async uploadPlan(file: { name: string; mimeType: string; buffer: Buffer }): Promise<void> {
    if (await this.planPickerTrigger.isVisible()) await this.openPlanPicker();
    await this.page
      .locator('[data-testid="facility-plan-list"] input[type="file"]')
      .setInputFiles(file);
  }

  /** Clicks the editor stage at a fractional position of its rendered box — `(0.5, 0.5)` is its center. */
  public async clickPlanPoint(fractionX: number, fractionY: number): Promise<void> {
    const box = await this.editorStage.boundingBox();
    if (!box) throw new Error('The plan editor stage is not visible.');

    await this.page.mouse.click(box.x + box.width * fractionX, box.y + box.height * fractionY);
  }

  /** Fills one vertex row of the zone geometry dialog with percent values. */
  public async fillZoneVertex(index: number, xPercent: string, yPercent: string): Promise<void> {
    const row = this.zoneGeometryRows.nth(index);
    await row.getByTestId('facility-plan-zone-geometry-row-x').fill(xPercent);
    await row.getByTestId('facility-plan-zone-geometry-row-y').fill(yPercent);
  }

  /** Opens the `draw-zone` picker and selects the given candidate by its visible name. */
  public async pickDrawZoneTarget(name: string): Promise<void> {
    await this.drawZonePicker.click();
    await this.page.getByRole('option', { name }).click();
  }

  /** Opens the `place-pin` picker and selects the given candidate by its visible name. */
  public async pickPlaceEquipment(name: string): Promise<void> {
    await this.placePinPicker.click();
    await this.page.getByRole('option', { name }).click();
  }

  /** Expands the filter bar via the toolbar's "Filters" toggle, when it is not already open. */
  public async openFilters(): Promise<void> {
    if ((await this.filtersToggle.getAttribute('aria-expanded')) === 'true') return;
    await this.filtersToggle.click();
  }

  /** Opens the "+ Filter" menu and picks the field named `fieldLabel`, e.g. `"Show archived facilities"`. */
  public async addFilter(fieldLabel: string): Promise<void> {
    await this.addFilterTrigger.click();
    await this.page
      .getByTestId('facilities-filters-add-option')
      .filter({ hasText: fieldLabel })
      .click();
  }
}
