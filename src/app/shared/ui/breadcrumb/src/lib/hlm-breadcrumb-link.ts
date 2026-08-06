import { Directive, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { classes } from '@shared/ui/utils';

@Directive({
  selector: '[hlmBreadcrumbLink]',
  hostDirectives: [
    {
      directive: RouterLink,
      inputs: [
        'target',
        'queryParams',
        'fragment',
        'queryParamsHandling',
        'state',
        'info',
        'relativeTo',
        'preserveFragment',
        'skipLocationChange',
        'replaceUrl',
        'routerLink: link',
      ],
    },
  ],
  host: {
    'data-slot': 'breadcrumb-link',
  },
})
export class HlmBreadcrumbLink {
  /** The link to navigate to the page. */
  public readonly link = input<RouterLink['routerLink']>();

  constructor() {
    classes(() => 'inline-flex items-center gap-1 hover:text-foreground transition-colors');
  }
}
