import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';

/**
 * Component OrganizationOverviewPage
 * @class OrganizationOverviewPage
 *
 * @description
 * Page that displays an overview of the organization, including its name,
 * description, creation date, and other relevant information. It also
 * provides links to the organization's settings and members management.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview',
  host: { class: 'block min-h-full' },
  imports: [
    AvatarModule,
    ButtonModule,
    MessageModule,
    SkeletonModule,
    TagModule,
  ],
  templateUrl: './organization-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewPage {

}
