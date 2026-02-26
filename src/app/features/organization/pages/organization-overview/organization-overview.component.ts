import { Component, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { SkeletonModule } from 'primeng/skeleton';
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';

/**
 * Component OrganizationOverviewPage
 * @class OrganizationOverviewPage
 *
 * @description
 * Organization overview page displayed after selecting an organization.
 * Provides a high-level summary of the active organization.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview',
  imports: [ButtonModule, CardModule, AvatarModule, SkeletonModule],
  templateUrl: './organization-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewPage {}
