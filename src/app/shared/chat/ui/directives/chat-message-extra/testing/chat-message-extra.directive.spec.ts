import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ChatMessageItem } from '../../../../models';
import { ChatMessageExtraDirective } from '../chat-message-extra.directive';

interface References {
  readonly references: readonly string[];
}

const MESSAGE: ChatMessageItem<References> = {
  id: 'm1',
  authorId: '/api/organizations/org-1/members/member-1',
  authorName: 'Amélie Rousseau',
  bodyHtml: '<p>Extincteur 3 non conforme.</p>',
  createdAt: '2026-07-20T09:00:00+00:00',
  isDeleted: false,
  isSaved: false,
  isPinned: false,
  canDelete: false,
  replyCount: 0,
  status: 'sent',
  reactions: [],
  attachments: [],
  data: { references: ['EXT-3'] },
};

/**
 * This directive is the one seam through which domain content reaches a row,
 * so the assertion that matters is that a consumer can read `message.data`
 * from the template — the whole point of the typed `let-` binding.
 */
@Component({
  template: `
    <ng-template appChatMessageExtra let-message>
      <span data-testid="extra">{{ message.data.references[0] }}</span>
    </ng-template>

    @if (template(); as captured) {
      <ng-container [ngTemplateOutlet]="captured" [ngTemplateOutletContext]="context" />
    }
  `,
  imports: [ChatMessageExtraDirective, NgTemplateOutlet],
})
class HostComponent {
  public readonly directive = viewChild(ChatMessageExtraDirective);
  public readonly template = computed(() => this.directive()?.templateRef ?? null);
  public readonly context = { $implicit: MESSAGE };
}

describe('ChatMessageExtraDirective', () => {
  it('captures the template it marks', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.template()).not.toBeNull();
  });

  it('binds the message so the consumer can read its opaque payload', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="extra"]')?.textContent).toContain(
      'EXT-3',
    );
  });

  it('narrows the template context', () => {
    expect(
      ChatMessageExtraDirective.ngTemplateContextGuard(
        {} as ChatMessageExtraDirective<References>,
        {},
      ),
    ).toBe(true);
  });
});
