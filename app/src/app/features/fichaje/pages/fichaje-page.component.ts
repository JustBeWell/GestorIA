import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { IntranetFeatureCard } from '../../../core/models/intranet.models';
import { SessionStorageService } from '../../../core/services/session-storage.service';
import { IntranetShellHeaderComponent } from '../../../shared/components/intranet-shell-header/intranet-shell-header.component';

@Component({
  selector: 'app-fichaje-page',
  standalone: true,
  imports: [CommonModule, RouterLink, IntranetShellHeaderComponent],
  templateUrl: './fichaje-page.component.html',
  styleUrl: './fichaje-page.component.css',
})
export class FichajePageComponent {
  private readonly router = inject(Router);
  private readonly sessionStorageService = inject(SessionStorageService);

  protected readonly navigationLinks: IntranetFeatureCard[] = [
    { clave: 'fichaje', titulo: 'Fichaje', descripcion: '', ruta: '/fichaje' },
    { clave: 'clientes', titulo: 'Gestión de clientes', descripcion: '', ruta: '/clientes' },
    { clave: 'trabajos', titulo: 'Gestión de trabajos', descripcion: '', ruta: '/trabajos' },
    { clave: 'pagos', titulo: 'Pagos', descripcion: '', ruta: '/pagos' },
  ];

  protected get employeeName(): string {
    return this.sessionStorageService.getUser()?.nombre_usuario ?? 'Usuario';
  }

  protected logout(): void {
    this.sessionStorageService.clearSession();
    void this.router.navigateByUrl('/auth');
  }
}
