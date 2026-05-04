import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { IntranetFeatureCard } from '../../../core/models/intranet.models';
import { AuthApiService } from '../../../core/services/auth-api.service';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { IntranetShellHeaderComponent } from '../../../shared/components/intranet-shell-header/intranet-shell-header.component';

@Component({
  selector: 'app-intranet-module-page',
  standalone: true,
  imports: [CommonModule, RouterLink, IntranetShellHeaderComponent],
  templateUrl: './intranet-module-page.component.html',
  styleUrl: './intranet-module-page.component.css',
})
export class IntranetModulePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApiService = inject(AuthApiService);
  private readonly authState = inject(AuthStateService);

  protected readonly navigationLinks: IntranetFeatureCard[] = [
    { clave: 'fichaje', titulo: 'Fichaje', descripcion: '', ruta: '/fichaje' },
    { clave: 'clientes', titulo: 'Gestión de clientes', descripcion: '', ruta: '/clientes' },
    { clave: 'trabajos', titulo: 'Gestión de trabajos', descripcion: '', ruta: '/trabajos' },
    { clave: 'pagos', titulo: 'Pagos', descripcion: '', ruta: '/pagos' },
  ];

  protected get title(): string {
    return this.route.snapshot.data['title'] ?? 'Módulo';
  }

  protected get activeRoute(): string {
    const path = this.route.snapshot.routeConfig?.path;
    return path ? `/${path}` : '/home';
  }

  protected get employeeName(): string {
    return this.authState.currentUser()?.nombre_usuario ?? 'Usuario';
  }

  protected readonly showLogoutModal = signal(false);

  protected openLogoutModal(): void {
    this.showLogoutModal.set(true);
  }

  protected cancelLogout(): void {
    this.showLogoutModal.set(false);
  }

  protected confirmLogout(): void {
    this.showLogoutModal.set(false);
    this.authApiService.logout();
  }
}
