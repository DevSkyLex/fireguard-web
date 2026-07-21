import { TestBed } from '@angular/core/testing';
import { MessageDraftService } from '../message-draft.service';

describe('MessageDraftService', () => {
  let service: MessageDraftService;

  beforeEach(() => {
    localStorage.clear();
    service = TestBed.inject(MessageDraftService);
  });

  it('should round-trip a draft per organization and conversation', () => {
    service.write('org-1', 'c1', 'hello there');

    expect(service.read('org-1', 'c1')).toBe('hello there');
    expect(service.read('org-1', 'c2')).toBe('');
    expect(service.read('org-2', 'c1')).toBe('');
  });

  it('should treat a blank body as a cleared draft', () => {
    service.write('org-1', 'c1', 'hello');
    service.write('org-1', 'c1', '   ');

    expect(service.read('org-1', 'c1')).toBe('');
    expect(service.listForOrganization('org-1')).toEqual([]);
  });

  it('should list only the organization own drafts', () => {
    service.write('org-1', 'c1', 'one');
    service.write('org-1', 'c2', 'two');
    service.write('org-2', 'c9', 'other workspace');

    const drafts = service.listForOrganization('org-1');

    expect(drafts.map((draft) => draft.conversationId).toSorted()).toEqual(['c1', 'c2']);
    expect(drafts.every((draft) => draft.body.length > 0)).toBe(true);
  });

  it('should stamp a draft with the moment it was written', () => {
    service.write('org-1', 'c1', 'one');

    const [draft] = service.listForOrganization('org-1');

    expect(draft?.updatedAt).toBeTruthy();
    expect(Number.isNaN(Date.parse(draft?.updatedAt ?? ''))).toBe(false);
  });

  it('should still read a draft stored by an older build as a bare body', () => {
    // Pre-envelope format: the value was the body itself.
    localStorage.setItem('fg.msg.draft.org-1.c1', 'legacy body');

    expect(service.read('org-1', 'c1')).toBe('legacy body');
    expect(service.listForOrganization('org-1')).toEqual([
      { conversationId: 'c1', body: 'legacy body', updatedAt: null },
    ]);
  });

  it('should drop a draft on clear', () => {
    service.write('org-1', 'c1', 'temp');
    service.clear('org-1', 'c1');

    expect(service.read('org-1', 'c1')).toBe('');
  });
});
