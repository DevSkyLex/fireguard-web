import { Component, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import { SkeletonModule } from 'primeng/skeleton';
import { AuthStore } from '@core/stores/auth';
import { UserStore } from '@core/stores/user';

/**
 * Component HomePage
 * @class HomePage
 *
 * @description
 * Home page component displayed after successful authentication.
 * Displays user profile information.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-home-page',
  imports: [ButtonModule, CardModule, AvatarModule, SkeletonModule],
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}
