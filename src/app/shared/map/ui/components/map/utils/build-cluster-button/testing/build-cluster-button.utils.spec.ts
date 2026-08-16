import { describe, expect, it } from 'vitest';
import { buildClusterButton } from '../build-cluster-button.utils';

describe('buildClusterButton', () => {
  it('builds a keyboard-focusable button labelled with the count', () => {
    const button = buildClusterButton(7);

    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    expect(button.textContent).toBe('7');
    expect(button.getAttribute('aria-label')).toContain('7');
  });
});
