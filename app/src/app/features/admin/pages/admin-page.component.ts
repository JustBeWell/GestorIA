import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AdminEmpleadoResumen, AdminResumenResponse } from '../../../core/models/intranet.models';
import { IntranetService } from '../../../core/services/intranet.service';
import { IntranetSidebarComponent } from '../../../shared/components/intranet-sidebar/intranet-sidebar.component';
import { SessionStorageService } from '../../../core/services/session-storage.service';

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, IntranetSidebarComponent],
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.css',
})
export class AdminPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly intranetService = inject(IntranetService);
  private readonly sessionStorageService = inject(SessionStorageService);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected data: AdminResumenResponse | null = null;

  @ViewChild('kpiTrack') kpiTrack!: ElementRef<HTMLElement>;

  ngOnInit(): void {
    const user = this.sessionStorageService.getUser();
    if (user?.role !== 'administrador') {
      void this.router.navigateByUrl('/home');
      return;
    }

    this.intranetService.getAdminResumen().subscribe({
      next: (res) => {
        this.data = res;
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        const detail = err?.error?.detail;
        this.errorMessage.set(typeof detail === 'string' ? detail : 'No se pudo cargar el panel de administracion.');
        this.loading.set(false);
      },
    });
  }

  protected get empleadosActivos(): AdminEmpleadoResumen[] {
    return this.data?.empleados.filter((e) => e.activo) ?? [];
  }

  protected get empleadosInactivos(): AdminEmpleadoResumen[] {
    return this.data?.empleados.filter((e) => !e.activo) ?? [];
  }

  protected get empleadosFichandoHoy(): number {
    return this.data?.empleados.filter((e) => e.turno_activo).length ?? 0;
  }

  protected formatHours(value: number): string {
    if (!value) {
      return '0h';
    }

    const h = Math.floor(value);
    const m = Math.round((value - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  protected formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
  }

  protected scrollCarousel(direction: 'prev' | 'next'): void {
    const el = this.kpiTrack?.nativeElement;
    if (!el) return;
    const cardWidth = el.querySelector('.kpi-card')?.clientWidth ?? 160;
    const gap = 10;
    const step = (cardWidth + gap) * 2;
    el.scrollBy({ left: direction === 'next' ? step : -step, behavior: 'smooth' });
  }
}
