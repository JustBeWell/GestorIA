import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionStorageService } from '../../../core/services/session-storage.service';

@Component({
  selector: 'app-pagos-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './pagos-page.component.html',
  styleUrl: './pagos-page.component.css',
})
export class PagosPageComponent {
  private readonly router = inject(Router);
  private readonly sessionStorageService = inject(SessionStorageService);

  protected get employeeName(): string {
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
