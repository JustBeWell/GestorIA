import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, forkJoin, of, retry } from 'rxjs';

import { EmpleadoService } from '../../../core/services/empleado.service';
import { EmpleadoModel } from '../../../core/models/empleado.model';
import { FichajeEventoItem, IntranetFeatureCard, IntranetHomeResponse } from '../../../core/models/intranet.models';
import { IntranetService } from '../../../core/services/intranet.service';
import { SessionStorageService } from '../../../core/services/session-storage.service';
import { IntranetShellHeaderComponent } from '../../../shared/components/intranet-shell-header/intranet-shell-header.component';

interface CalendarDay {
  day: number | null;
  fichajes: number;
  isToday: boolean;
}

@Component({
  selector: 'app-home-page',
  imports: [CommonModule, IntranetShellHeaderComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css',
})
export class HomePageComponent implements OnInit {

  private readonly empleadoService = inject(EmpleadoService);
  private readonly intranetService = inject(IntranetService);
  private readonly sessionStorageService = inject(SessionStorageService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  protected empleado: EmpleadoModel | null = null;
  protected homeData: IntranetHomeResponse | null = null;
  protected calendarDays: CalendarDay[] = [];
  protected readonly weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  protected monthLabel = '';

  protected get navigationLinks(): IntranetFeatureCard[] {
    return this.homeData?.funcionalidades ?? [];
  }

  ngOnInit(): void {
    const empleadoCacheado = this.empleadoService.getCachedEmpleado();
    const empleado$ = empleadoCacheado
      ? of(empleadoCacheado)
      : this.empleadoService.me().pipe(retry({ count: 1, delay: 150 }));

    const { start, end } = this.getMonthRange();

    forkJoin({
      empleado: empleado$,
      home: this.intranetService.getHome(),
      fichaje: this.intranetService.getFichajeTab({
        page: 1,
        page_size: 100,
        fecha_desde: start,
        fecha_hasta: end,
      }),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
      next: ({ empleado, home, fichaje }) => {
        this.empleado = empleado;
        this.homeData = home;
        this.buildCalendar(fichaje.eventos_recientes);
      },
      error: (err: HttpErrorResponse) => {
        const detail = err?.error?.detail;
        this.errorMessage.set(typeof detail === 'string' ? detail : 'No se pudo cargar el dashboard de intranet.');

        if (err.status === 401) {
          this.logout();
        }
      }
    });
  }

  protected formatDate(value: string | null): string {
    if (!value) {
      return 'No disponible';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'No disponible';
    }

    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  protected formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value ?? 0);
  }

  protected getOpenWorkRatio(): number {
    const total = this.homeData?.trabajos?.total ?? 0;
    if (!total) {
      return 0;
    }

    const open = (this.homeData?.trabajos?.pendientes ?? 0)
      + (this.homeData?.trabajos?.en_curso ?? 0)
      + (this.homeData?.trabajos?.bloqueados ?? 0);

    return Math.min(100, Math.round((open / total) * 100));
  }

  protected getCollectionProgress(): number {
    const collected = this.homeData?.pagos?.cobrado_mes ?? 0;
    const pending = this.homeData?.pagos?.pendiente_total ?? 0;
    const total = collected + pending;

    if (!total) {
      return 0;
    }

    return Math.min(100, Math.round((collected / total) * 100));
  }

  protected normalizeRoute(route: string): string {
    if (!route) {
      return '/home';
    }

    return route.startsWith('/') ? route : `/${route}`;
  }

  protected logout(): void {
    this.sessionStorageService.clearSession();
    this.empleadoService.clearCachedEmpleado();
    void this.router.navigateByUrl('/auth');
  }

  protected reload(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.ngOnInit();
  }

  protected hasFichaje(day: CalendarDay): boolean {
    return !!day.day && day.fichajes > 0;
  }

  private getMonthRange(): { start: string; end: string } {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);

    return {
      start: this.toIsoDate(first),
      end: this.toIsoDate(last),
    };
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildCalendar(events: FichajeEventoItem[]): void {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const dayCountMap = new Map<number, number>();
    for (const event of events) {
      const eventDate = new Date(event.fecha_hora);
      if (eventDate.getFullYear() !== year || eventDate.getMonth() !== month) {
        continue;
      }

      const day = eventDate.getDate();
      dayCountMap.set(day, (dayCountMap.get(day) ?? 0) + 1);
    }

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayOffset = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: CalendarDay[] = [];
    for (let index = 0; index < mondayOffset; index++) {
      cells.push({ day: null, fichajes: 0, isToday: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        day,
        fichajes: dayCountMap.get(day) ?? 0,
        isToday:
          day === now.getDate() &&
          month === now.getMonth() &&
          year === now.getFullYear(),
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ day: null, fichajes: 0, isToday: false });
    }

    this.calendarDays = cells;
    this.monthLabel = new Intl.DateTimeFormat('es-ES', {
      month: 'long',
      year: 'numeric',
    }).format(now);
  }
}
