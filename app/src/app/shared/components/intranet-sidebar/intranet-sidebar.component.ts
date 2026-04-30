import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthApiService } from '../../../core/services/auth-api.service';
import { EmpleadoService } from '../../../core/services/empleado.service';
import { SessionStorageService } from '../../../core/services/session-storage.service';

@Component({
  selector: 'app-intranet-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './intranet-sidebar.component.html',
  styleUrl: './intranet-sidebar.component.css',
})
export class IntranetSidebarComponent {
  private readonly router = inject(Router);
  private readonly authApiService = inject(AuthApiService);
  private readonly empleadoService = inject(EmpleadoService);
  private readonly sessionStorageService = inject(SessionStorageService);

  protected get employeeName(): string {
    const empleado = this.empleadoService.getCachedEmpleado();
    if (empleado) {
      return `${empleado.nombre} ${empleado.apellidos ?? ''}`.trim();
    }

    return this.sessionStorageService.getUser()?.nombre_usuario ?? 'Usuario';
  }

  protected get employeeFirstName(): string {
    const name = this.employeeName.trim();
    if (!name) {
      return 'Usuario';
    }

    return name.split(' ').filter(Boolean)[0] ?? 'Usuario';
  }

  protected get employeeInitials(): string {
    const source = this.employeeName.trim();
    if (!source) {
      return 'UI';
    }

    const parts = source.split(' ').filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
    return initials.join('') || 'UI';
  }

  protected get employeeRole(): string {
    const empleado = this.empleadoService.getCachedEmpleado();
    if (empleado?.rol) {
      return empleado.rol;
    }

    return this.sessionStorageService.getUser()?.role ?? 'Empleado';
  }

  protected get isAdmin(): boolean {
    return this.employeeRole === 'administrador';
  }

  protected logout(): void {
    this.empleadoService.clearCachedEmpleado();
    this.authApiService.logout();
  }
}
