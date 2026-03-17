import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IntranetFeatureCard } from '../../../core/models/intranet.models';

@Component({
  selector: 'app-intranet-shell-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './intranet-shell-header.component.html',
  styleUrl: './intranet-shell-header.component.css',
})
export class IntranetShellHeaderComponent {
  @Input() pageTitle = 'Panel principal de empleado';
  @Input() pageSubtitle = 'Resumen diario y control operativo de tu actividad.';
  @Input() appLabel = 'Intranet GestorIA';
  @Input() employeeName = 'Usuario';
  @Input() activeRoute = '/home';
  @Input() links: IntranetFeatureCard[] = [];
  @Input() showLogout = true;

  @Output() logoutClick = new EventEmitter<void>();

  protected normalizeRoute(route: string): string {
    if (!route) {
      return '/home';
    }

    return route.startsWith('/') ? route : `/${route}`;
  }

  protected isActive(route: string): boolean {
    return this.normalizeRoute(route) === this.activeRoute;
  }

  protected onLogout(): void {
    this.logoutClick.emit();
  }
}
