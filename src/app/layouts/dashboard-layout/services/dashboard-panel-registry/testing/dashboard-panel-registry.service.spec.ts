import type { TemplateRef } from '@angular/core';
import { DashboardPanelRegistry } from '../dashboard-panel-registry.service';

describe('DashboardPanelRegistry', () => {
  it('does not let an outgoing template clear its successor', () => {
    const registry = new DashboardPanelRegistry();
    const outgoing = {} as TemplateRef<unknown>;
    const current = {} as TemplateRef<unknown>;

    registry.register(outgoing, 'First panel');
    registry.register(current, 'Second panel');
    registry.clear(outgoing);
    expect(registry.panel()).toEqual({ template: current, label: 'Second panel' });

    registry.clear(current);
    expect(registry.panel()).toBeNull();
  });
});
