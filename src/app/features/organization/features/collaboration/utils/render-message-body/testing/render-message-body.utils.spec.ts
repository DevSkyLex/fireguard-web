import { renderMessageBodyHtml } from '../render-message-body.utils';

const UUID = '7f1c8f2e-1b3a-4c5d-8e9f-0a1b2c3d4e5f';

describe('renderMessageBodyHtml', () => {
  it('renders nothing for a tombstone', () => {
    expect(renderMessageBodyHtml(undefined, {}, 'member')).toBe('');
    expect(renderMessageBodyHtml('', {}, 'member')).toBe('');
  });

  it('leaves a body without mentions untouched', () => {
    expect(renderMessageBodyHtml('<p>Rien à signaler.</p>', {}, 'member')).toBe(
      '<p>Rien à signaler.</p>',
    );
  });

  it('substitutes a chip in place, keeping the surrounding element whole', () => {
    // The reason this replaces rather than splits: tokenizing the body at the
    // marker cut `<strong>` across two bindings, and each half was auto-closed.
    expect(
      renderMessageBodyHtml(
        `<p><strong>Bien reçu @{${UUID}}</strong></p>`,
        { [UUID]: 'Jean' },
        'member',
      ),
    ).toContain('<p><strong>Bien reçu <span class="');
    expect(
      renderMessageBodyHtml(
        `<p><strong>Bien reçu @{${UUID}}</strong></p>`,
        { [UUID]: 'Jean' },
        'member',
      ),
    ).toContain('>@Jean</span></strong></p>');
  });

  it('uses a distinct semantic surface in light mode while preserving dark bubble contrast', () => {
    const rendered = renderMessageBodyHtml(`@{${UUID}}`, { [UUID]: 'Jean' }, 'member');

    expect(rendered).toContain('bg-primary/15');
    expect(rendered).toContain('ring-primary/30');
    expect(rendered).toContain('dark:bg-current/10');
    expect(rendered).toContain('dark:text-inherit');
  });

  it('falls back to a neutral label rather than exposing the id', () => {
    expect(renderMessageBodyHtml(`@{${UUID}}`, {}, 'member')).toContain('>@member</span>');
  });

  it('escapes the label, which is the one untrusted part', () => {
    expect(renderMessageBodyHtml(`@{${UUID}}`, { [UUID]: '<img src=x>' }, 'member')).toContain(
      '>@&lt;img src=x&gt;</span>',
    );
  });

  it('reads the escaped marker, which is the only form the API stores', () => {
    // Symfony's sanitizer rewrites every `@` in a text node to `&#64;`, so a
    // body read back never carries the bare marker the composer sent.
    expect(
      renderMessageBodyHtml(`<p>Ping &#64;{${UUID}}</p>`, { [UUID]: 'Jean' }, 'member'),
    ).toContain('>@Jean</span></p>');
  });

  it('ignores a marker that is not a UUID', () => {
    expect(renderMessageBodyHtml('call @{nope} now', {}, 'member')).toBe('call @{nope} now');
  });
});
