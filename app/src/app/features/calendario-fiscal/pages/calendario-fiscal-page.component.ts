import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EmpleadoService } from '../../../core/services/empleado.service';
import { SessionStorageService } from '../../../core/services/session-storage.service';

@Component({
  selector: 'app-calendario-fiscal-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './calendario-fiscal-page.component.html',
  styleUrl: './calendario-fiscal-page.component.css',
})
export class CalendarioFiscalPageComponent {
  private readonly router = inject(Router);
  private readonly empleadoService = inject(EmpleadoService);
  private readonly sessionStorageService = inject(SessionStorageService);

  protected get employeeName(): string {
    const empleado = this.empleadoService.getCachedEmpleado();
    if (empleado) {
      return `${empleado.nombre} ${empleado.apellidos ?? ''}`.trim();
    }

    return this.sessionStorageService.getUser()?.nombre_usuario ?? 'Usuario';
  }

  protected get employeeRole(): string {
    return this.sessionStorageService.getUser()?.role ?? 'Empleado';
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

  protected logout(): void {
    this.sessionStorageService.clearSession();
    void this.router.navigateByUrl('/auth');
  }
}
